import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { useCurrency } from "@/hooks/useCurrency";

interface InvoicePDFDownloadProps {
  invoice: any;
  photographer: any;
}

const InvoicePDFDownload = ({ invoice, photographer }: InvoicePDFDownloadProps) => {
  const { toast } = useToast();
  const { currency } = useCurrency();

  const generatePDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPosition = 20;

      // Header - Business Name
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text(photographer?.business_name || photographer?.photographer_name || "Photography Studio", pageWidth / 2, yPosition, { align: "center" });
      yPosition += 10;

      // Contact Info
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      if (photographer?.email) {
        doc.text(photographer.email, pageWidth / 2, yPosition, { align: "center" });
        yPosition += 5;
      }
      if (photographer?.phone) {
        doc.text(photographer.phone, pageWidth / 2, yPosition, { align: "center" });
        yPosition += 5;
      }
      if (photographer?.website) {
        doc.text(photographer.website, pageWidth / 2, yPosition, { align: "center" });
        yPosition += 10;
      } else {
        yPosition += 5;
      }

      // Divider Line
      doc.setDrawColor(200, 200, 200);
      doc.line(15, yPosition, pageWidth - 15, yPosition);
      yPosition += 10;

      // Invoice Title
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("INVOICE", 15, yPosition);
      yPosition += 10;

      // Invoice Details - Left Side
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Invoice Number:", 15, yPosition);
      doc.setFont("helvetica", "normal");
      doc.text(invoice.invoice_number, 55, yPosition);
      yPosition += 6;

      doc.setFont("helvetica", "bold");
      doc.text("Issue Date:", 15, yPosition);
      doc.setFont("helvetica", "normal");
      doc.text(format(new Date(invoice.issue_date), "MMM dd, yyyy"), 55, yPosition);
      yPosition += 6;

      doc.setFont("helvetica", "bold");
      doc.text("Due Date:", 15, yPosition);
      doc.setFont("helvetica", "normal");
      doc.text(format(new Date(invoice.due_date), "MMM dd, yyyy"), 55, yPosition);
      yPosition += 6;

      doc.setFont("helvetica", "bold");
      doc.text("Status:", 15, yPosition);
      doc.setFont("helvetica", "normal");
      doc.text(invoice.status.toUpperCase(), 55, yPosition);
      yPosition += 12;

      // Bill To Section
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Bill To:", 15, yPosition);
      yPosition += 6;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(invoice.clients?.name || "N/A", 15, yPosition);
      yPosition += 5;
      if (invoice.clients?.email) {
        doc.text(invoice.clients.email, 15, yPosition);
        yPosition += 5;
      }
      if (invoice.clients?.phone) {
        doc.text(invoice.clients.phone, 15, yPosition);
        yPosition += 5;
      }
      if (invoice.clients?.address) {
        doc.text(invoice.clients.address, 15, yPosition);
        yPosition += 5;
      }
      yPosition += 10;

      // Table Header
      doc.setFillColor(240, 240, 240);
      doc.rect(15, yPosition, pageWidth - 30, 8, "F");
      
      doc.setFont("helvetica", "bold");
      doc.text("Description", 20, yPosition + 5);
      doc.text("Amount", pageWidth - 45, yPosition + 5, { align: "right" });
      yPosition += 12;

      // Table Content
      doc.setFont("helvetica", "normal");
      if (invoice.bookings?.title) {
        doc.text(`Photography Service - ${invoice.bookings.title}`, 20, yPosition);
      } else {
        doc.text("Photography Services", 20, yPosition);
      }
      doc.text(`${currency} ${invoice.subtotal.toFixed(2)}`, pageWidth - 45, yPosition, { align: "right" });
      yPosition += 10;

      // Subtotal, Tax, Total Section
      const startX = pageWidth - 80;
      
      doc.setFont("helvetica", "bold");
      doc.text("Subtotal:", startX, yPosition);
      doc.setFont("helvetica", "normal");
      doc.text(`${currency} ${invoice.subtotal.toFixed(2)}`, pageWidth - 20, yPosition, { align: "right" });
      yPosition += 6;

      doc.setFont("helvetica", "bold");
      doc.text("Tax:", startX, yPosition);
      doc.setFont("helvetica", "normal");
      doc.text(`${currency} ${(invoice.tax_amount || 0).toFixed(2)}`, pageWidth - 20, yPosition, { align: "right" });
      yPosition += 6;

      if (invoice.deposit_amount && invoice.deposit_amount > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("Deposit:", startX, yPosition);
        doc.setFont("helvetica", "normal");
        doc.text(`-${currency} ${invoice.deposit_amount.toFixed(2)}`, pageWidth - 20, yPosition, { align: "right" });
        yPosition += 6;
      }

      // Total Line
      doc.setDrawColor(0, 0, 0);
      doc.line(startX, yPosition, pageWidth - 20, yPosition);
      yPosition += 8;

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Total:", startX, yPosition);
      doc.text(`${currency} ${invoice.total_amount.toFixed(2)}`, pageWidth - 20, yPosition, { align: "right" });
      yPosition += 12;

      // Notes Section
      if (invoice.notes) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Notes:", 15, yPosition);
        yPosition += 5;
        
        doc.setFont("helvetica", "normal");
        const splitNotes = doc.splitTextToSize(invoice.notes, pageWidth - 30);
        doc.text(splitNotes, 15, yPosition);
      }

      // Footer
      const footerY = doc.internal.pageSize.getHeight() - 20;
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text("Thank you for your business!", pageWidth / 2, footerY, { align: "center" });

      // Save the PDF
      doc.save(`Invoice_${invoice.invoice_number}.pdf`);

      toast({
        title: "Success",
        description: "Invoice PDF downloaded successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={generatePDF}>
      <Download className="h-3 w-3 mr-1" />
      PDF
    </Button>
  );
};

export default InvoicePDFDownload;
