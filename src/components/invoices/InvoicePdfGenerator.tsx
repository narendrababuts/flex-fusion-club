import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Printer, MessageCircle, Loader2 } from 'lucide-react';
import { InvoiceData } from '@/types/invoice';
import { JobCard } from '@/types/jobCard';
import { useToast } from '@/hooks/use-toast';
import InvoicePDFDocument from './pdf/InvoicePDFDocument';
import { supabase } from '@/integrations/supabase/client';
import { useGarage } from '@/contexts/GarageContext';
import html2pdf from 'html2pdf.js';

interface InvoicePdfGeneratorProps {
  invoice: InvoiceData;
  jobCard: JobCard;
}

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
  pdf_url?: string;
}

const InvoicePdfGenerator: React.FC<InvoicePdfGeneratorProps> = ({ invoice, jobCard }) => {
  const invoicePdfRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { currentGarage } = useGarage();
  const [garageSettings, setGarageSettings] = useState<GarageSettings>({
    garage_name: "Your Garage Name",
    address: "123 Service Street, Mechanic City",
    gstin: invoice.gst_slab_id || "N/A",
    logo_url: "",
    phone: "",
    email: "",
    default_advisor: "Service Advisor",
    payment_instructions: "Please pay within 7 days via bank transfer",
    invoice_notes: "Thank you for choosing our service. We appreciate your business.",
    signature_url: ""
  });
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [publicPdfUrl, setPublicPdfUrl] = useState<string | null>(invoice['pdf_url'] ?? null);

  // Load garage settings when component mounts
  useEffect(() => {
    if (currentGarage?.id) {
      loadGarageSettings();
    }
  }, [currentGarage?.id]);

  const loadGarageSettings = async () => {
    if (!currentGarage?.id) return;

    try {
      // Try to get settings from localStorage first (most up-to-date)
      const localStorageKey = `garage_settings_${currentGarage.id}`;
      const savedSettings = localStorage.getItem(localStorageKey);
      
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setGarageSettings(prevSettings => ({
          ...prevSettings,
          ...parsedSettings
        }));
        return;
      }

      // Fallback to database fetch
      console.log('Loading garage settings from database for garage:', currentGarage.id);
      const { data, error } = await supabase
        .from('settings')
        .select('setting_value')
        .eq('setting_key', 'garage_settings')
        .eq('garage_id', currentGarage.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading garage settings:', error);
        return;
      }

      if (data && data.setting_value) {
        const parsedSettings = JSON.parse(data.setting_value);
        setGarageSettings(prevSettings => ({
          ...prevSettings,
          ...parsedSettings
        }));
        
        // Store in localStorage for next time
        localStorage.setItem(localStorageKey, data.setting_value);
      }
    } catch (e) {
      console.error('Error loading garage settings:', e);
    }
  };

  // Debug invoice data
  useEffect(() => {
    console.log('InvoicePdfGenerator - Invoice data received:', invoice);
    console.log('InvoicePdfGenerator - Invoice items:', invoice.items);
    if (invoice.items && invoice.items.length > 0) {
      console.log('InvoicePdfGenerator - Sample item:', invoice.items[0]);
    } else {
      console.warn('InvoicePdfGenerator - No invoice items available');
    }
  }, [invoice]);

  // Utility: convert Data URL to Blob
  function dataURLtoBlob(dataurl: string) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || '';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], {type:mime});
  }

  // --- PDF GENERATION & UPLOAD TO SUPABASE ---

  const handleDownloadPdf = async () => {
    const element = invoicePdfRef.current;
    if (!element) {
      toast({
        title: "Error",
        description: "Could not generate PDF. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setUploadingPdf(true);
    toast({
      title: "Generating PDF",
      description: "Please wait while your invoice is being prepared...",
    });

    try {
      // Use imported html2pdf directly
      if (html2pdf) {
        const opt = {
          margin: 0.5,
          filename: `${invoice.id}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };

        let pdfBlob: Blob | null = null;
        try {
          pdfBlob = await new Promise((resolve, reject) => {
            html2pdf().set(opt)
              .from(element)
              .toPdf()
              .outputPdf('blob')
              .then((blob: Blob) => {
                resolve(blob);
              })
              .catch((err: any) => {
                reject(err);
              });
          });
          if (!pdfBlob) throw new Error('PDF blob is null');
        } catch (err) {
          console.error("PDF creation failed:", err);
          toast({
            title: "Error",
            description: "PDF generation failed. Please check your content and try again.",
            variant: "destructive"
          });
          setUploadingPdf(false);
          return;
        }

        // Upload to Supabase Storage
        if (currentGarage?.id) {
          const path = `invoices/${currentGarage.id}/${invoice.id}.pdf`;
          let uploadError: any = null;
          try {
            const { error } = await supabase.storage.from('invoice-pdfs').upload(path, pdfBlob, {
              cacheControl: '3600',
              upsert: true
            });
            uploadError = error;
          } catch (error: any) {
            uploadError = error;
          }
          if (uploadError) {
            console.error("Supabase Storage upload error:", uploadError);
            toast({
              title: "Error",
              description: `Failed to upload PDF to cloud storage: ${uploadError.message || uploadError}`,
              variant: "destructive"
            });
            setUploadingPdf(false);
            return;
          }

          // Get public URL
          const { data: urlData } = supabase.storage.from('invoice-pdfs').getPublicUrl(path);
          const publicUrl: string | null = urlData?.publicUrl ?? null;
          if (!publicUrl) {
            console.error("Get public URL failed: No public URL returned after upload.");
            toast({
              title: "Error",
              description: "Failed to get the public PDF URL after upload.",
              variant: "destructive"
            });
            setUploadingPdf(false);
            return;
          }
          setPublicPdfUrl(publicUrl);

          // Update invoice record with PDF URL
          if (publicUrl) {
            try {
              const { error: updateError } = await supabase.from('invoices').update({ pdf_url: publicUrl } as any).eq('id', invoice.id);
              if (updateError) {
                throw updateError;
              }
            } catch (dbError: any) {
              console.error("Failed to update invoice with pdf_url:", dbError);
              toast({
                title: "Error",
                description: "Failed to update invoice record with PDF URL. Please check if pdf_url column exists.",
                variant: "destructive"
              });
              setUploadingPdf(false);
              return;
            }
          }

          toast({
            title: "Success",
            description: "Invoice PDF generated and saved!",
          });

          // Download in browser
          try {
            const downloadLink = document.createElement('a');
            downloadLink.href = URL.createObjectURL(pdfBlob);
            downloadLink.download = `${invoice.id}.pdf`;
            downloadLink.click();
          } catch (downloadErr) {
            console.warn('File was saved to cloud but failed to trigger download:', downloadErr);
          }
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to find html2pdf library.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('PDF generation/upload error:', error);
      toast({
        title: "Error",
        description: "Unexpected failure to generate or upload PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingPdf(false);
    }
  };

  // -- WhatsApp Share Handler --
  const handleWhatsappShare = () => {
    // Use either invoice.customerPhone or jobCard.customer.phone, and use publicPdfUrl
    const phone = invoice['customerPhone'] || jobCard?.customer.phone || '';
    let cleanPhone = phone.replace(/\D/g, ''); // Remove all non-digits for WhatsApp
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.slice(1); // Remove leading zero
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone; // Add India country code if missing

    const url = publicPdfUrl || invoice['pdf_url'] || '';
    if (!url) {
      toast({
        title: "Error",
        description: "PDF link not found. Please generate/download the invoice PDF first.",
        variant: "destructive"
      });
      return;
    }
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent("Your invoice is ready: ")}${encodeURIComponent(url)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handlePrint = () => {
    const element = invoicePdfRef.current;
    if (!element) {
      toast({
        title: "Error",
        description: "Could not print invoice. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Pop-up blocked. Please allow pop-ups to print.",
        variant: "destructive",
      });
      return;
    }
    
    // Write print-friendly content
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Invoice - ${invoice.id.substring(0, 8).toUpperCase()}</title>
          <style>
            @page { 
              size: A4; 
              margin: 15mm 15mm 20mm 15mm; 
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 0;
              width: 210mm;
              box-sizing: border-box;
              overflow-y: auto;
            }
            .pdf-container {
              height: auto;
              overflow: visible;
              page-break-inside: avoid;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 10px;
              table-layout: fixed;
              page-break-inside: avoid;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 6px; 
              font-size: 12px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: normal;
              word-break: break-word;
            }
            th { 
              background-color: #f2f2f2;
              font-weight: bold;
              text-align: left;
            }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .heading { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
            .subheading { font-size: 14px; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .border-b { border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 8px; }
            .mb-4 { margin-bottom: 10px; }
            .grid-cols-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .p-3 { padding: 10px; }
            .border { border: 1px solid #ddd; }
            .invoice-header { text-align: center; background-color: #f2f2f2; padding: 8px; margin-bottom: 10px; }
            .invoice-totals { width: 40%; margin-left: auto; }
            .recommendations { font-size: 12px; margin-top: 10px; }
            .signature-area { display: flex; justify-content: space-between; margin-top: 30px; }
            .font-bold { font-weight: bold; }
            @media print {
              body { width: 100%; }
              table, img { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body onload="window.print(); window.setTimeout(function(){ window.close(); }, 500);">
          <div class="pdf-container">${element.innerHTML}</div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    
    toast({
      title: "Print initiated",
      description: "The print dialog should open shortly.",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={handlePrint}
          disabled={uploadingPdf}
        >
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
        <Button
          onClick={handleDownloadPdf}
          disabled={uploadingPdf}
        >
          {uploadingPdf ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Download + Save to Cloud
        </Button>
        <Button
          variant="outline"
          onClick={handleWhatsappShare}
          disabled={!publicPdfUrl && uploadingPdf}
        >
          <MessageCircle className="mr-2 h-4 w-4 text-green-600" />
          Send via WhatsApp
        </Button>
      </div>
      
      <div className="max-h-[800px] overflow-y-auto border rounded">
        <InvoicePDFDocument
          invoice={invoice}
          jobCard={jobCard}
          garageSettings={garageSettings}
          forwardedRef={invoicePdfRef}
        />
      </div>
    </div>
  );
}

export default InvoicePdfGenerator;
