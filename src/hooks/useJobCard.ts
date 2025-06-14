import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { JobCard, JobCardPart, toAppJobCard } from '@/types/jobCard';
import { useToast } from './use-toast';
import { useQuery } from '@tanstack/react-query';
import { useGarage } from '@/contexts/GarageContext';

export const useJobCard = () => {
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [selectedJobCardId, setSelectedJobCardId] = useState<string>('');
  const [selectedJobCard, setSelectedJobCard] = useState<JobCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [originalStatus, setOriginalStatus] = useState<string | null>(null);
  const [photoFiles, setPhotoFiles] = useState<{file: File, type: 'before' | 'after'}[]>([]);
  const [mileage, setMileage] = useState('');
  const [advisorName, setAdvisorName] = useState('');
  const [warrantyInfo, setWarrantyInfo] = useState('');
  
  const { currentGarage } = useGarage();
  
  const [currentJobCard, setCurrentJobCard] = useState<JobCard>({
    id: '',
    customer: { name: '', phone: '' },
    car: { make: '', model: '', plate: '' },
    description: '',
    status: 'Pending',
    assignedStaff: '',
    laborHours: 0,
    hourlyRate: 0,
    parts: [],
    notes: '',
    jobDate: new Date().toISOString().split('T')[0],
    date: '',
    estimatedCompletionDate: null,
    actualCompletionDate: null,
    manualLaborCost: 0,
    photos: [],
    selectedServices: []
  });

  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  // Use React Query for staff options with garage isolation
  const { data: staffOptions = [] } = useQuery({
    queryKey: ['staff', currentGarage?.id],
    queryFn: async () => {
      if (!currentGarage?.id) return [];
      
      const { data, error } = await supabase
        .from('staff')
        .select('name')
        .eq('garage_id', currentGarage.id)
        .order('name');
      
      if (error) throw error;
      return data.map(staff => staff.name);
    },
    enabled: !!currentGarage?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Memoize the initial job card to prevent unnecessary re-renders
  const initialJobCard = useMemo(() => ({
    id: '',
    customer: { name: '', phone: '' },
    car: { make: '', model: '', plate: '' },
    description: '',
    status: 'Pending' as const,
    assignedStaff: '',
    laborHours: 0,
    hourlyRate: 0,
    parts: [],
    notes: '',
    jobDate: new Date().toISOString().split('T')[0],
    date: '',
    estimatedCompletionDate: null,
    actualCompletionDate: null,
    manualLaborCost: 0,
    photos: [],
    selectedServices: []
  }), []);

  useEffect(() => {
    // Determine if we're creating, editing, or viewing based on URL
    const path = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    const id = searchParams.get('id');
    
    console.log('Path:', path, 'ID:', id);
    
    if (path.includes('/create')) {
      console.log('Setting create mode');
      setIsCreating(true);
      setIsEditing(false);
      setCurrentJobCard({ ...initialJobCard });
    } else if (path.includes('/edit') && id) {
      console.log('Setting edit mode for ID:', id);
      setIsEditing(true);
      setIsCreating(false);
      fetchJobCard(id);
    } else if (path.includes('/view') && id) {
      console.log('Setting view mode for ID:', id);
      setIsEditing(false);
      setIsCreating(false);
      fetchJobCard(id);
    } else {
      // Default to completed job cards list for invoice generation
      setIsEditing(false);
      setIsCreating(false);
      fetchCompletedJobCards();
    }
  }, [location.pathname, location.search, initialJobCard]);

  useEffect(() => {
    if (selectedJobCardId) {
      const selected = jobCards.find(card => card.id === selectedJobCardId);
      setSelectedJobCard(selected || null);
    } else {
      setSelectedJobCard(null);
    }
  }, [selectedJobCardId, jobCards]);

  const fetchJobCard = useCallback(async (id: string) => {
    if (!currentGarage?.id) return;
    
    setIsLoading(true);
    try {
      console.log('Fetching job card with ID:', id);
      const { data, error } = await supabase
        .from('job_cards')
        .select('*')
        .eq('id', id)
        .eq('garage_id', currentGarage.id) // Enforce garage isolation
        .single();

      if (error) {
        console.error('Error fetching job card:', error);
        throw error;
      }
      
      if (data) {
        console.log('Job card data fetched:', data);
        const jobCard = toAppJobCard(data);
        setCurrentJobCard(jobCard);
        setOriginalStatus(jobCard.status);
      }
    } catch (error) {
      console.error('Error fetching job card:', error);
      toast({
        title: "Error",
        description: "Failed to load job card details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, currentGarage?.id]);

  const fetchCompletedJobCards = useCallback(async () => {
    if (!currentGarage?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('job_cards')
        .select('*')
        .eq('garage_id', currentGarage.id) // Enforce garage isolation
        .in('status', ['Completed', 'Ready for Pickup'])
        .order('created_at', { ascending: false })
        .limit(50); // Limit for performance

      if (error) throw error;

      // Convert to JobCard objects
      const formattedJobCards = data.map(card => toAppJobCard(card));
      setJobCards(formattedJobCards);
    } catch (error) {
      console.error('Error fetching completed job cards:', error);
      toast({
        title: "Error",
        description: "Failed to load completed job cards",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, currentGarage?.id]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Handle nested properties
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setCurrentJobCard(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as Record<string, unknown>),
          [child]: value
        }
      }));
    } else {
      setCurrentJobCard(prev => ({
        ...prev,
        [name]: value
      }));
    }
  }, []);

  const handleSelectChange = useCallback((value: string, name: string) => {
    setCurrentJobCard(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  // Validation function to check if all required fields are filled
  const validateJobCard = useCallback(() => {
    const errors: string[] = [];
    
    if (!currentJobCard.customer.name) errors.push('Customer name is required');
    if (!currentJobCard.customer.phone) errors.push('Customer phone is required');
    if (!currentJobCard.car.make) errors.push('Car make is required');
    if (!currentJobCard.car.model) errors.push('Car model is required');
    if (!currentJobCard.car.plate) errors.push('License plate is required');
    if (!currentJobCard.description) errors.push('Work description is required');
    if (!currentJobCard.assignedStaff) errors.push('Assigned staff is required');
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, [currentJobCard]);

  const handleSaveJobCard = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('JOB CARD SAVE FUNCTION CALLED - NO EXPENSES');

    if (!currentGarage?.id) {
      console.error('No garage selected');
      toast({
        title: "Error",
        description: "No garage selected",
        variant: "destructive",
      });
      return;
    }

    if (isSaving) {
      console.log('Save already in progress, preventing duplicate submission');
      return;
    }

    // Validate the job card
    const validation = validateJobCard();
    if (!validation.isValid) {
      console.error('Validation failed:', validation.errors);
      toast({
        title: "Validation Error",
        description: validation.errors.join(', '),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    console.log('Starting job card save process WITHOUT EXPENSES...');

    try {
      // CLEAN PAYLOAD - NO EXPENSE OPERATIONS
      const assignedStaffArr = Array.isArray(currentJobCard.assignedStaff)
        ? currentJobCard.assignedStaff
        : [currentJobCard.assignedStaff];

      const partsJson = Array.isArray(currentJobCard.parts)
        ? currentJobCard.parts.map(part => ({
            id: String(part.id || ''),
            inventoryId: String(part.inventoryId || ''),
            name: String(part.name || ''),
            quantity: Number(part.quantity) || 0,
            unitPrice: Number(part.unitPrice) || 0,
            total: (Number(part.quantity) || 0) * (Number(part.unitPrice) || 0),
            inStock: Boolean(part.inStock),
            addedToPurchaseList: Boolean(part.addedToPurchaseList)
          }))
        : [];

      const selectedServicesJson = Array.isArray(currentJobCard.selectedServices)
        ? currentJobCard.selectedServices.map(service => ({
            id: String(service.id || ''),
            serviceName: String(service.serviceName || ''),
            price: Number(service.price) || 0,
            description: String(service.description || '')
          }))
        : [];

      const actualCompletionDate = currentJobCard.status === 'Completed'
        ? (currentJobCard.actualCompletionDate || new Date().toISOString())
        : currentJobCard.actualCompletionDate;

      const payload = {
        customer_name: String(currentJobCard.customer.name || ''),
        customer_phone: String(currentJobCard.customer.phone || ''),
        car_make: String(currentJobCard.car.make || ''),
        car_model: String(currentJobCard.car.model || ''),
        car_number: String(currentJobCard.car.plate || ''),
        work_description: String(currentJobCard.description || ''),
        status: currentJobCard.status,
        assigned_staff: assignedStaffArr,
        labor_hours: Number(currentJobCard.laborHours) || 0,
        hourly_rate: Number(currentJobCard.hourlyRate) || 0,
        manual_labor_cost: Number(currentJobCard.manualLaborCost) || 0,
        estimated_completion_date: currentJobCard.estimatedCompletionDate,
        actual_completion_date: actualCompletionDate,
        notes: String(currentJobCard.notes || ''),
        parts: partsJson,
        job_date: currentJobCard.jobDate || new Date().toISOString().split('T')[0],
        gst_slab_id: currentJobCard.gstSlabId || null,
        selected_services: selectedServicesJson,
        garage_id: currentGarage.id
      };

      console.log('CLEAN Job card payload (NO EXPENSES):', payload);

      // UPSERT LOGIC - ONLY JOB CARDS TABLE
      if (isEditing && currentJobCard.id) {
        console.log('Updating existing job card:', currentJobCard.id);
        const { data, error } = await supabase
          .from('job_cards')
          .update(payload)
          .eq('id', currentJobCard.id)
          .eq('garage_id', currentGarage.id);

        if (error) {
          console.error('Job card update error:', error);
          throw error;
        }
        console.log('Job card updated successfully:', data);
      } else {
        console.log('Creating new job card');
        const { data, error } = await supabase
          .from('job_cards')
          .insert([payload]);

        if (error) {
          console.error('Job card insert error:', error);
          throw error;
        }
        console.log('Job card created successfully:', data);
      }

      // INVENTORY DEDUCTION ONLY (NON-BLOCKING, NO EXPENSES)
      if (Array.isArray(currentJobCard.parts) && currentJobCard.parts.length > 0) {
        console.log('Starting CLEAN inventory deduction for', currentJobCard.parts.length, 'parts');
        (async () => {
          try {
            for (const part of currentJobCard.parts) {
              if (
                part.inventoryId && 
                part.inStock && 
                part.inventoryId !== 'custom' && 
                part.inventoryId !== ''
              ) {
                console.log('Processing CLEAN inventory deduction for part:', part.name);
                const { data: inventoryItem, error: invError } = await supabase
                  .from('inventory')
                  .select('quantity')
                  .eq('id', part.inventoryId)
                  .eq('garage_id', currentGarage.id)
                  .single();
                  
                if (!invError && inventoryItem) {
                  const newQuantity = Math.max(0, Number(inventoryItem.quantity) - Number(part.quantity));
                  console.log(`Updating inventory ${part.name} from ${inventoryItem.quantity} to ${newQuantity}`);
                  
                  await supabase
                    .from('inventory')
                    .update({ quantity: newQuantity })
                    .eq('id', part.inventoryId)
                    .eq('garage_id', currentGarage.id);
                } else {
                  console.error('Failed to fetch inventory item:', invError);
                }
              }
            }
          } catch (inventoryError) {
            console.error('Inventory deduction error (non-blocking):', inventoryError);
          }
        })();
      }

      // --- INSERT COGS or MANUAL EXPENSES WHEN JUST COMPLETED ---
      // Detect status change to "Completed"
      const wasCompleted = originalStatus === 'Completed';
      const nowCompleted = currentJobCard.status === 'Completed';

      if (!wasCompleted && nowCompleted) {
        if (Array.isArray(currentJobCard.parts) && currentJobCard.parts.length > 0) {
          for (const part of currentJobCard.parts) {
            // If custom part, record as manual expense only
            if ((part.is_custom || part.inventoryId === 'custom' || !part.inventoryId) && Number(part.quantity) > 0) {
              await supabase.from('expenses').insert([{
                garage_id: currentGarage.id,
                type: 'manual',
                item_name: part.name,
                quantity: Number(part.quantity),
                unit_cost: typeof part.unitPrice === 'number' ? part.unitPrice : (part as any).unit_cost ?? 0,
                total_cost: Number(part.quantity) * (typeof part.unitPrice === 'number' ? part.unitPrice : (part as any).unit_cost ?? 0),
                related_id: currentJobCard.id,
                description: `Manual expense for custom part used in job card ${currentJobCard.id} - ${part.name}`
              }]);
              continue; // Do not deduct inventory or insert COGS for custom parts!
            }

            // Otherwise, normal COGS expense flow (for in-stock/inventory parts)
            if (part.name && Number(part.quantity) > 0) {
              // Deduct inventory as before
              if (
                part.inventoryId &&
                part.inStock &&
                part.inventoryId !== 'custom' &&
                part.inventoryId !== ''
              ) {
                const { data: inventoryItem, error: invError } = await supabase
                  .from('inventory')
                  .select('quantity')
                  .eq('id', part.inventoryId)
                  .eq('garage_id', currentGarage.id)
                  .single();

                if (!invError && inventoryItem) {
                  const newQuantity = Math.max(0, Number(inventoryItem.quantity) - Number(part.quantity));
                  await supabase
                    .from('inventory')
                    .update({ quantity: newQuantity })
                    .eq('id', part.inventoryId)
                    .eq('garage_id', currentGarage.id);
                }
              }
              // Insert the COGS expense
              await supabase.from('expenses').insert([{
                garage_id: currentGarage.id,
                type: 'cogs',
                item_name: part.name,
                quantity: Number(part.quantity),
                unit_cost: typeof part.unitPrice === 'number' ? part.unitPrice : (part as any).unit_cost ?? 0,
                total_cost: Number(part.quantity) * (typeof part.unitPrice === 'number' ? part.unitPrice : (part as any).unit_cost ?? 0),
                related_id: currentJobCard.id,
                description: `COGS for job card ${currentJobCard.id} - ${part.name}`,
              }]);
            }
          }
        }
      }

      console.log('CLEAN Job card save completed successfully - NO EXPENSES CREATED');
      toast({
        title: isEditing ? "Job Card Updated" : "Job Card Created",
        description: isEditing
          ? "Job card has been successfully updated."
          : "Job card has been successfully created.",
      });

      setPhotoFiles([]);
      navigate('/job-cards');

    } catch (error: any) {
      console.error('CLEAN Job card save error:', error.message, error.details || error);
      let errorMessage = "Failed to save job card. Please try again.";
      if (error && typeof error === 'object') {
        errorMessage = error.message || errorMessage;
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    currentJobCard,
    isEditing,
    photoFiles,
    toast,
    isSaving,
    navigate,
    validateJobCard,
    currentGarage?.id,
    originalStatus,
  ]);

  return {
    jobCards,
    selectedJobCardId,
    setSelectedJobCardId,
    selectedJobCard,
    isLoading,
    isSaving,
    isEditing,
    isCreating,
    photoFiles,
    setPhotoFiles,
    mileage,
    setMileage,
    advisorName,
    setAdvisorName,
    warrantyInfo,
    setWarrantyInfo,
    staffOptions,
    currentJobCard,
    setCurrentJobCard,
    handleInputChange,
    handleSelectChange,
    handleSaveJobCard,
    validateJobCard,
  };
};
