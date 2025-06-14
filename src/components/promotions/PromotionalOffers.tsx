import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Calendar, MessageSquare, User, UserPlus, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, isFuture } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PromotionalOffer, PromotionsSettings } from '@/types/promotions';
import { useGarage } from '@/contexts/GarageContext';

const PromotionalOffers = () => {
  const [settings, setSettings] = useState<PromotionsSettings | null>(null);
  const [activeOffers, setActiveOffers] = useState<PromotionalOffer[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<Record<string, boolean>>({});
  const [selectedOffer, setSelectedOffer] = useState<PromotionalOffer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const { currentGarage } = useGarage();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Only continue if garage is selected
        if (!currentGarage?.id) {
          setIsLoading(false);
          setActiveOffers([]);
          return;
        }

        // Fetch active promotions for ONLY this garage
        const { data: promotions, error: promotionsError } = await supabase
          .from('promotions')
          .select('id, title, description, valid_to')
          .eq('garage_id', currentGarage.id) // strict filter
          .eq('is_active', true);

        if (promotionsError) {
          console.error('Error fetching promotions:', promotionsError);
          setActiveOffers([]);
        } else {
          // Map to shape for display
          setActiveOffers((promotions || []).map(p => ({
            title: p.title,
            description: p.description,
            valid_until: p.valid_to
          })));
        }

        // Fetch unique customers from job cards (also garage scoped)
        const { data: jobCardsData, error: jobCardsError } = await supabase
          .from('job_cards')
          .select('id, customer_name, customer_phone, car_make, car_model, car_number')
          .eq('garage_id', currentGarage.id)
          .order('job_date', { ascending: false });

        if (jobCardsError) throw jobCardsError;

        // Get unique customers
        const uniqueCustomers = jobCardsData?.reduce((acc: any[], curr) => {
          const existingCustomer = acc.find(c => c.customer_phone === curr.customer_phone);
          if (!existingCustomer) {
            acc.push({
              id: curr.id,
              name: curr.customer_name,
              phone: curr.customer_phone,
              car: `${curr.car_make} ${curr.car_model} (${curr.car_number})`
            });
          }
          return acc;
        }, []) || [];

        setCustomers(uniqueCustomers);
      } catch (error: any) {
        console.error('Error fetching promotional data:', error);
        toast({
          title: "Error loading promotional data",
          description: error.message || "Failed to load promotional data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [toast, currentGarage?.id]);

  const handleSendToCustomer = (offer: PromotionalOffer, customer: any) => {
    try {
      if (!customer.phone) {
        throw new Error("Customer phone number not available");
      }
      
      // Format the customer's phone for WhatsApp
      const formattedPhone = customer.phone.startsWith('+') 
        ? customer.phone.substring(1) 
        : customer.phone;
      
      // Create the message from the offer
      let messageText = `Hi ${customer.name}, we have a special offer for you!\n\n${offer.title}\n\n${offer.description}\n\nValid until: ${format(new Date(offer.valid_until), 'PPP')}\n\nPlease visit us or call to avail this offer!`;
      
      // Create the WhatsApp URL with the message
      const encodedMessage = encodeURIComponent(messageText);
      const whatsappURL = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
      
      // Open WhatsApp
      window.open(whatsappURL, '_blank');
      
      toast({
        title: "Offer sent",
        description: `Promotional offer sent to ${customer.name}`,
      });
    } catch (error: any) {
      console.error('Error sending promotional offer:', error);
      toast({
        title: "Error sending offer",
        description: error.message || "Failed to send offer",
        variant: "destructive",
      });
    }
  };
  
  const handleSendToMultiple = (offer: PromotionalOffer) => {
    setSelectedOffer(offer);
    setSelectedCustomers({});
    setDialogOpen(true);
  };
  
  const handleSendToSelected = () => {
    if (!selectedOffer) return;
    
    const selectedIds = Object.keys(selectedCustomers).filter(id => selectedCustomers[id]);
    
    if (selectedIds.length === 0) {
      toast({
        title: "No customers selected",
        description: "Please select at least one customer to send the offer",
        variant: "destructive",
      });
      return;
    }
    
    // Send to each selected customer
    const selectedCustomerList = customers.filter(customer => 
      selectedIds.includes(customer.id)
    );
    
    selectedCustomerList.forEach(customer => {
      handleSendToCustomer(selectedOffer, customer);
    });
    
    setDialogOpen(false);
    
    toast({
      title: "Offers sent",
      description: `Promotional offer sent to ${selectedIds.length} customers`,
    });
  };
  
  const toggleSelectAll = (checked: boolean) => {
    const updatedSelection: Record<string, boolean> = {};
    customers.forEach(customer => {
      updatedSelection[customer.id] = checked;
    });
    setSelectedCustomers(updatedSelection);
  };
  
  const handleToggleCustomer = (customerId: string, checked: boolean) => {
    setSelectedCustomers(prev => ({
      ...prev,
      [customerId]: checked
    }));
  };

  const handleCreateOffer = async (offerData: PromotionalOffer) => {
    if (!currentGarage?.id) return;

    // Map Offer to DB Insert Shape
    const today = new Date();
    const dbOffer = {
      title: offerData.title,
      description: offerData.description,
      garage_id: currentGarage.id,
      valid_from: today.toISOString().split('T')[0], // YYYY-MM-DD
      valid_to: (typeof offerData.valid_until === "string"
        ? offerData.valid_until
        : offerData.valid_until.toISOString().split('T')[0]
      ),
      is_active: true, // default to active when created
    };

    const { error } = await supabase
      .from('promotions')
      .insert([dbOffer]);

    if (error) toast({ title: 'Error adding offer', description: error.message, variant: 'destructive' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-muted-foreground">Loading promotional offers...</div>
      </div>
    );
  }

  if (activeOffers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Promotional Offers</CardTitle>
          <CardDescription>
            Create promotional offers to send to your customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-2" />
            <h3 className="text-lg font-medium">No active offers</h3>
            <p className="text-muted-foreground mt-2">
              Create promotional offers in the Settings tab to get started.
            </p>
            <Button className="mt-4" asChild>
              <a href="#settings">Create Offers</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Promotional Offers</CardTitle>
          <CardDescription>
            Send promotional offers to your customers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {activeOffers.map((offer, index) => (
            <Card key={index} className="overflow-hidden border">
              <CardHeader className="bg-muted/50">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>{offer.title}</CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Valid until: {format(new Date(offer.valid_until), 'PPP')}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="mb-4">{offer.description}</div>
                
                <div className="flex items-center justify-between">
                  <div className="text-muted-foreground text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {customers.length} customers available
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="secondary"
                      onClick={() => handleSendToMultiple(offer)}
                      className="flex items-center gap-1"
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Send to multiple
                    </Button>
                  </div>
                </div>
                
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Recent Customers</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customers.slice(0, 5).map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell>
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-xs text-muted-foreground">{customer.phone}</div>
                          </TableCell>
                          <TableCell>{customer.car}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex items-center gap-1"
                              onClick={() => handleSendToCustomer(offer, customer)}
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              Send
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Offer to Multiple Customers</DialogTitle>
            <DialogDescription>
              Select the customers you want to send the offer to
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-2">
            <div className="flex items-center space-x-2 pb-2">
              <Checkbox id="select-all" onCheckedChange={(checked) => toggleSelectAll(!!checked)} />
              <Label htmlFor="select-all">Select All</Label>
            </div>
            
            <ScrollArea className="h-72 w-full rounded-md border">
              <div className="p-4 space-y-3">
                {customers.map((customer) => (
                  <div key={customer.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`customer-${customer.id}`} 
                      checked={selectedCustomers[customer.id] || false}
                      onCheckedChange={(checked) => handleToggleCustomer(customer.id, !!checked)}
                    />
                    <Label htmlFor={`customer-${customer.id}`} className="flex flex-col">
                      <span>{customer.name}</span>
                      <span className="text-xs text-muted-foreground">{customer.car}</span>
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSendToSelected}>Send to Selected</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PromotionalOffers;
