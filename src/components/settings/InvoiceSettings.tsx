import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, Upload } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import NumberInput from '@/components/ui/number-input';
import { useGarage } from '@/contexts/GarageContext';
import { uploadFileToBucket } from './uploadFileUtil';

interface GarageSettings {
  garage_name: string;
  address: string;
  gstin: string;
  logo_url: string;
  phone: string;
  email: string;
  default_advisor: string;
  payment_instructions: string;
  invoice_notes: string;
  signature_url: string;
  background_url: string;
}

const InvoiceSettings = () => {
  const [settings, setSettings] = useState<GarageSettings>({
    garage_name: '',
    address: '',
    gstin: '',
    logo_url: '',
    phone: '',
    email: '',
    default_advisor: '',
    payment_instructions: 'Please pay within 7 days via bank transfer to the account details mentioned on the invoice.',
    invoice_notes: 'Thank you for choosing our service. We appreciate your business.',
    signature_url: '',
    background_url: '',
  });
  
  const [gstSlabs, setGstSlabs] = useState<{id: string, name: string, cgst_percent: number, sgst_percent: number, igst_percent: number}[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState('');
  const [signaturePreview, setSignaturePreview] = useState('');
  const [backgroundPreview, setBackgroundPreview] = useState('');
  const { toast } = useToast();
  const { currentGarage } = useGarage();
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);

  // Fetch existing settings
  useEffect(() => {
    if (currentGarage?.id) {
      fetchSettings();
      fetchGstSlabs();
    }
  }, [currentGarage?.id]);

  const fetchSettings = async () => {
    if (!currentGarage?.id) {
      console.log('No garage selected, skipping settings fetch');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      console.log('Fetching settings for garage:', currentGarage.id);
      
      const { data, error } = await supabase
        .from('settings')
        .select('setting_value')
        .eq('setting_key', 'garage_settings')
        .eq('garage_id', currentGarage.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching settings:', error);
        throw error;
      }

      if (data && data.setting_value) {
        const parsedSettings = JSON.parse(data.setting_value);
        setSettings({
          ...settings,
          ...parsedSettings
        });
        
        if (parsedSettings.logo_url) {
          setLogoPreview(parsedSettings.logo_url);
        }
        
        if (parsedSettings.signature_url) {
          setSignaturePreview(parsedSettings.signature_url);
        }
        
        if (parsedSettings.background_url) {
          setBackgroundPreview(parsedSettings.background_url);
        }
      }
      
      // Store settings in localStorage for invoice generation to access
      if (data && data.setting_value) {
        localStorage.setItem(`garage_settings_${currentGarage.id}`, data.setting_value);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGstSlabs = async () => {
    if (!currentGarage?.id) return;

    try {
      const { data, error } = await supabase
        .from('gst_slabs')
        .select('*')
        .eq('garage_id', currentGarage.id)
        .order('name');

      if (error) {
        console.error('Error fetching GST slabs:', error);
        throw error;
      }

      if (data) {
        setGstSlabs(data);
      }
    } catch (error) {
      console.error('Error fetching GST slabs:', error);
      toast({
        title: "Error",
        description: "Failed to load GST slabs",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings({ ...settings, [name]: value });
  };

  const handleNumberChange = (name: string, value: number) => {
    setSettings({ ...settings, [name]: value });
  };

  // Universal upload-and-set helper
  const handleFileUpload = async (
    file: File,
    key: 'logo_url' | 'signature_url' | 'background_url',
    setPreview: (url: string) => void,
    setUploading: (val: boolean) => void
  ) => {
    if (!currentGarage?.id) {
      toast({
        title: "No Garage",
        description: "Please select a garage before uploading.",
        variant: "destructive"
      });
      return;
    }
    setUploading(true);
    try {
      const publicUrl = await uploadFileToBucket('garage-assets', currentGarage.id, file);
      setSettings(prev => ({
        ...prev,
        [key]: publicUrl,
      }));
      setPreview(publicUrl);
    } catch (err: any) {
      toast({
        title: `${key === 'logo_url' ? "Logo" : key === "signature_url" ? "Signature" : "Background"} Upload Error`,
        description: err.message || "Could not upload image.",
        variant: "destructive"
      });
    }
    setUploading(false);
  };

  // Modified change handlers
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFileUpload(file, "logo_url", setLogoPreview, setIsUploadingLogo);
  };

  const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFileUpload(file, "signature_url", setSignaturePreview, setIsUploadingSignature);
  };

  const handleBackgroundChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFileUpload(file, "background_url", setBackgroundPreview, setIsUploadingBackground);
  };

  const handleSaveSettings = async () => {
    if (!currentGarage?.id) {
      toast({
        title: "Error",
        description: "No garage selected",
        variant: "destructive",
      });
      return;
    }
    // Validation for logo and signature
    if (!settings.logo_url || !settings.signature_url) {
      toast({
        title: "Missing Logo/Signature",
        description: "Please upload both logo and signature before saving.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      // Check if record exists for this garage
      const { data: existingData, error: checkError } = await supabase
        .from('settings')
        .select('id')
        .eq('setting_key', 'garage_settings')
        .eq('garage_id', currentGarage.id)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking settings:', checkError);
        throw checkError;
      }
      // Always include up-to-date image URLs & garage_id in payload
      let updatedSettings = { ...settings, logo_url: settings.logo_url, signature_url: settings.signature_url, background_url: settings.background_url };
      let dbError = null;
      if (existingData) {
        const { error } = await supabase
          .from('settings')
          .update({
            setting_value: JSON.stringify(updatedSettings),
            garage_id: currentGarage.id
          })
          .eq('setting_key', 'garage_settings')
          .eq('garage_id', currentGarage.id);
        dbError = error;
      } else {
        const { error } = await supabase
          .from('settings')
          .insert({
            setting_key: 'garage_settings',
            setting_value: JSON.stringify(updatedSettings),
            garage_id: currentGarage.id
          });
        dbError = error;
      }
      if (dbError) {
        console.error("Error saving settings to Supabase:", dbError);
        toast({
          title: "Error",
          description: `Failed to save settings: ${dbError.message || dbError}`,
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      setSettings(updatedSettings);
      localStorage.setItem(`garage_settings_${currentGarage.id}`, JSON.stringify(updatedSettings));
      toast({
        title: "Settings saved",
        description: "Invoice settings have been updated successfully",
      });
    } catch (error: any) {
      console.error('Error saving settings (outer catch):', error);
      toast({
        title: "Error",
        description: `Failed to save settings: ${error.message || error}`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGstSlabUpdate = async (slabId: string, field: string, value: number) => {
    if (!currentGarage?.id) return;

    try {
      // Update the local state first for immediate feedback
      const updatedGstSlabs = gstSlabs.map(slab => {
        if (slab.id === slabId) {
          return { ...slab, [field]: value };
        }
        return slab;
      });
      
      setGstSlabs(updatedGstSlabs);
      
      // Update in database
      const { error } = await supabase
        .from('gst_slabs')
        .update({ [field]: value })
        .eq('id', slabId)
        .eq('garage_id', currentGarage.id);
        
      if (error) throw error;
      
      toast({
        title: "GST slab updated",
        description: "GST configuration has been updated successfully",
      });
    } catch (error) {
      console.error('Error updating GST slab:', error);
      toast({
        title: "Error",
        description: "Failed to update GST slab",
        variant: "destructive",
      });
      
      // Revert local state on error
      fetchGstSlabs();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2">Loading settings...</span>
      </div>
    );
  }

  if (!currentGarage?.id) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <h3 className="text-lg font-medium">No Garage Selected</h3>
          <p className="text-muted-foreground mt-2">Please select a garage to configure invoice settings.</p>
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList className="mb-6">
        <TabsTrigger value="general">General Information</TabsTrigger>
        <TabsTrigger value="appearance">Appearance</TabsTrigger>
        <TabsTrigger value="legal">Legal & Payment</TabsTrigger>
      </TabsList>
      
      <ScrollArea className="h-[calc(100vh-220px)]">
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Garage Information</CardTitle>
              <CardDescription>
                This information will appear on all invoices.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="garage_name">Garage Name</Label>
                  <Input
                    id="garage_name"
                    name="garage_name"
                    value={settings.garage_name}
                    onChange={handleInputChange}
                    placeholder="Your Garage Name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gstin">GSTIN</Label>
                  <Input
                    id="gstin"
                    name="gstin"
                    value={settings.gstin}
                    onChange={handleInputChange}
                    placeholder="22AAAAA0000A1Z5"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  name="address"
                  value={settings.address}
                  onChange={handleInputChange}
                  placeholder="Full address with city, state and pincode"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={settings.phone}
                    onChange={handleInputChange}
                    placeholder="+91 98765 43210"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    value={settings.email}
                    onChange={handleInputChange}
                    placeholder="contact@yourgarage.com"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="default_advisor">Default Service Advisor</Label>
                <Input
                  id="default_advisor"
                  name="default_advisor"
                  value={settings.default_advisor}
                  onChange={handleInputChange}
                  placeholder="Name of default service advisor"
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>GST Configuration</CardTitle>
              <CardDescription>
                Manage the GST slabs that can be applied to invoice items
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {gstSlabs.map((slab) => (
                  <div key={slab.id} className="border p-4 rounded-md">
                    <div className="font-medium mb-2">{slab.name}</div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor={`cgst-${slab.id}`}>CGST %</Label>
                        <Input
                          id={`cgst-${slab.id}`}
                          type="number"
                          value={slab.cgst_percent}
                          onChange={(e) => handleGstSlabUpdate(slab.id, 'cgst_percent', parseFloat(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`sgst-${slab.id}`}>SGST %</Label>
                        <Input
                          id={`sgst-${slab.id}`}
                          type="number"
                          value={slab.sgst_percent}
                          onChange={(e) => handleGstSlabUpdate(slab.id, 'sgst_percent', parseFloat(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`igst-${slab.id}`}>IGST %</Label>
                        <Input
                          id={`igst-${slab.id}`}
                          type="number"
                          value={slab.igst_percent}
                          onChange={(e) => handleGstSlabUpdate(slab.id, 'igst_percent', parseFloat(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="text-sm text-muted-foreground mt-2">
                  Modify the GST percentages above as needed
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Logo & Branding</CardTitle>
              <CardDescription>
                Upload your garage logo, authorized signature, and set invoice background
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label htmlFor="logo">Logo</Label>
                <div className="flex items-start space-x-4">
                  <div className="w-40 h-40 border rounded flex items-center justify-center overflow-hidden bg-slate-50">
                    {logoPreview ? (
                      <img 
                        src={logoPreview} 
                        alt="Garage Logo" 
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <div className="text-center text-muted-foreground p-4">
                        <Upload className="mx-auto h-10 w-10 mb-2" />
                        <p>No logo uploaded</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="relative"
                      onClick={() => document.getElementById('logo-upload')?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Logo
                      <input
                        id="logo-upload"
                        type="file"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={handleLogoChange}
                      />
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Recommended: PNG or JPG, 300x200 pixels or larger
                    </p>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <Label htmlFor="signature">Authorised Signature</Label>
                <div className="flex items-start space-x-4">
                  <div className="w-40 h-20 border rounded flex items-center justify-center overflow-hidden bg-slate-50">
                    {signaturePreview || settings.signature_url ? (
                      <img
                        src={signaturePreview || settings.signature_url}
                        alt="Signature"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <div className="text-center text-muted-foreground p-2">
                        <p className="text-xs">No signature uploaded</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="relative"
                      onClick={() => document.getElementById('signature-upload')?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Signature
                      <input
                        id="signature-upload"
                        type="file"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        accept="image/png"
                        onChange={handleSignatureChange}
                      />
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      PNG only. Transparent background recommended.
                    </p>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <Label htmlFor="invoice-background">Invoice Background</Label>
                <div className="flex items-start space-x-4">
                  <div className="w-40 h-32 border rounded flex items-center justify-center overflow-hidden bg-slate-50">
                    {backgroundPreview || settings.background_url ? (
                      <img
                        src={backgroundPreview || settings.background_url}
                        alt="Invoice Background"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <div className="text-center text-muted-foreground p-2">
                        <p className="text-xs">No background image uploaded</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="relative"
                      onClick={() => document.getElementById('invoice-background-upload')?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Background
                      <input
                        id="invoice-background-upload"
                        type="file"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        accept="image/png"
                        onChange={handleBackgroundChange}
                      />
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      PNG only. This image will appear as the invoice background (light, watermark style recommended).
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="legal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment & Legal Information</CardTitle>
              <CardDescription>
                Set payment instructions and terms that will appear on invoices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="payment_instructions">Payment Instructions</Label>
                <Textarea
                  id="payment_instructions"
                  name="payment_instructions"
                  value={settings.payment_instructions}
                  onChange={handleInputChange}
                  placeholder="Instructions for payment (bank details, due dates, etc.)"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="invoice_notes">Invoice Notes & Terms</Label>
                <Textarea
                  id="invoice_notes"
                  name="invoice_notes"
                  value={settings.invoice_notes}
                  onChange={handleInputChange}
                  placeholder="Additional notes, terms and conditions to display on invoices"
                  rows={5}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </ScrollArea>
      
      <div className="mt-6 flex justify-end">
        <Button 
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="bg-garage-primary hover:bg-garage-secondary"
        >
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          Save Settings
        </Button>
      </div>
    </Tabs>
  );
};

export default InvoiceSettings;
