import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { useCurrency } from "@/hooks/useCurrency";
import { getBaseUrl } from "@/lib/utils";

interface InvoicePDFDownloadProps {
  invoice: any;
  photographer: any;
}

import { generateInvoicePDF } from "@/utils/pdfGenerator";

interface InvoicePDFDownloadProps {
  invoice: any;
  photographer: any;
}

const InvoicePDFDownload = ({
  invoice,
  photographer,
}: InvoicePDFDownloadProps) => {
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();

  const handleGeneratePDF = async () => {
    try {
      const doc = await generateInvoicePDF(invoice, photographer, formatCurrency);
      
      // Save the PDF
      doc.save(`Invoice_${invoice.invoice_number}.pdf`);

      toast({
        title: "Success",
        description: "Invoice PDF downloaded successfully!",
      });
    } catch (error: any) {
      console.error("PDF generation error details:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Check console for details.",
        variant: "destructive",
      });
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={handleGeneratePDF}>
      <Download className="h-3 w-3 mr-1" />
      PDF
    </Button>
  );
};

export default InvoicePDFDownload;
