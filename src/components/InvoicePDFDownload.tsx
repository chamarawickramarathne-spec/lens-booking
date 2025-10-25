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

const InvoicePDFDownload = ({
  invoice,
  photographer,
}: InvoicePDFDownloadProps) => {
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();

  const loadImageAsBase64 = async (url: string): Promise<{ data: string; format: string }> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      
      // Detect image format from blob type
      let format = 'JPEG';
      if (blob.type.includes('png')) {
        format = 'PNG';
      } else if (blob.type.includes('jpg') || blob.type.includes('jpeg')) {
        format = 'JPEG';
      }
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve({ 
          data: reader.result as string,
          format: format
        });
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Failed to load image:", error);
      return { data: "", format: "JPEG" };
    }
  };

  const getImageUrl = (imagePath: string | undefined) => {
    if (!imagePath) return "";
    if (imagePath.startsWith("http")) return imagePath;
    
    // Use the image proxy to get images with proper CORS headers
    const encodedPath = encodeURIComponent(imagePath);
    return `http://localhost/lens-booking/api/get-image.php?path=${encodedPath}`;
  };

  const generatePDF = async () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPosition = 20;

      // Add profile image/logo if available
      const profileImageUrl = getImageUrl(photographer?.profile_picture);
      if (profileImageUrl) {
        try {
          const imageResult = await loadImageAsBase64(profileImageUrl);
          if (imageResult.data) {
            const imgSize = 40; // Larger size to match Email Preview (96px -> ~40 in PDF scale)
            const imgX = (pageWidth - imgSize) / 2;
            doc.addImage(
              imageResult.data,
              imageResult.format,
              imgX,
              yPosition,
              imgSize,
              imgSize,
              undefined,
              "FAST"
            );
            yPosition += imgSize + 8;
          }
        } catch (error) {
          console.error("Failed to add profile image to PDF:", error);
        }
      }

      // Header - Business Name
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text(
        photographer?.business_name ||
          photographer?.photographer_name ||
          "Photography Studio",
        pageWidth / 2,
        yPosition,
        { align: "center" }
      );
      yPosition += 10;

      // Contact Info
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const contactEmail = photographer?.business_email || photographer?.email;
      if (contactEmail) {
        doc.text(contactEmail, pageWidth / 2, yPosition, {
          align: "center",
        });
        yPosition += 5;
      }
      const contactPhone = photographer?.business_phone || photographer?.phone;
      if (contactPhone) {
        doc.text(contactPhone, pageWidth / 2, yPosition, {
          align: "center",
        });
        yPosition += 5;
      }
      if (photographer?.business_address) {
        const splitAddress = doc.splitTextToSize(
          photographer.business_address,
          pageWidth - 40
        );
        doc.text(splitAddress, pageWidth / 2, yPosition, { align: "center" });
        yPosition += splitAddress.length * 5;
      }
      yPosition += 5;

      // Divider Line
      doc.setDrawColor(200, 200, 200);
      doc.line(15, yPosition, pageWidth - 15, yPosition);
      yPosition += 12;

      // Two column layout: Bill To (left) and Invoice Details (right)
      const leftColX = 15;
      const rightColX = pageWidth / 2 + 10;
      const sectionStartY = yPosition;

      // Left Column - Bill To Section
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Bill To:", leftColX, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(invoice.clients?.name || "N/A", leftColX, yPosition);
      yPosition += 5;
      if (invoice.clients?.email) {
        doc.text(invoice.clients.email, leftColX, yPosition);
        yPosition += 5;
      }
      if (invoice.clients?.phone) {
        doc.text(invoice.clients.phone, leftColX, yPosition);
        yPosition += 5;
      }
      if (invoice.clients?.address) {
        const splitAddress = doc.splitTextToSize(
          invoice.clients.address,
          pageWidth / 2 - 20
        );
        doc.text(splitAddress, leftColX, yPosition);
        yPosition += splitAddress.length * 5;
      }

      // Right Column - Invoice Details
      let rightYPosition = sectionStartY;
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("INVOICE", rightColX, rightYPosition);
      rightYPosition += 10;

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Invoice #:", rightColX, rightYPosition);
      doc.setFont("helvetica", "normal");
      doc.text(invoice.invoice_number, rightColX + 25, rightYPosition);
      rightYPosition += 6;

      doc.setFont("helvetica", "bold");
      doc.text("Issue Date:", rightColX, rightYPosition);
      doc.setFont("helvetica", "normal");
      doc.text(
        format(new Date(invoice.issue_date), "MMM dd, yyyy"),
        rightColX + 25,
        rightYPosition
      );
      rightYPosition += 6;

      doc.setFont("helvetica", "bold");
      doc.text("Due Date:", rightColX, rightYPosition);
      doc.setFont("helvetica", "normal");
      doc.text(
        format(new Date(invoice.due_date), "MMM dd, yyyy"),
        rightColX + 25,
        rightYPosition
      );
      rightYPosition += 6;

      doc.setFont("helvetica", "bold");
      doc.text("Status:", rightColX, rightYPosition);
      doc.setFont("helvetica", "normal");
      doc.text(invoice.status.toUpperCase(), rightColX + 25, rightYPosition);

      // Use the larger yPosition from either column
      yPosition = Math.max(yPosition, rightYPosition) + 12;

      // Invoice Details Section
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Invoice Details", 15, yPosition);
      yPosition += 8;

      // Table Header
      doc.setFillColor(240, 240, 240);
      doc.rect(15, yPosition, pageWidth - 30, 8, "F");

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Description", 20, yPosition + 5);
      doc.text("Amount", pageWidth - 45, yPosition + 5, { align: "right" });
      yPosition += 12;

      // Table Content - Photography Service
      doc.setFont("helvetica", "normal");
      if (invoice.bookings?.title) {
        doc.text(
          `Photography Service - ${invoice.bookings.title}`,
          20,
          yPosition
        );
      } else {
        doc.text("Photography Services", 20, yPosition);
      }
      doc.text(formatCurrency(invoice.subtotal), pageWidth - 45, yPosition, {
        align: "right",
      });
      yPosition += 8;

      // Deposit Amount (if exists)
      if (invoice.deposit_amount && invoice.deposit_amount > 0) {
        doc.setTextColor(100, 100, 100);
        doc.text("Deposit Amount", 20, yPosition);
        doc.text(
          formatCurrency(invoice.deposit_amount),
          pageWidth - 45,
          yPosition,
          { align: "right" }
        );
        doc.setTextColor(0, 0, 0);
        yPosition += 8;
      }

      // Subtotal, Tax, Total Section
      const startX = pageWidth - 80;

      doc.setFont("helvetica", "normal");
      doc.text("Subtotal", startX, yPosition);
      doc.text(formatCurrency(invoice.subtotal), pageWidth - 20, yPosition, {
        align: "right",
      });
      yPosition += 6;

      if (invoice.tax_amount && invoice.tax_amount > 0) {
        doc.text("Tax", startX, yPosition);
        doc.text(
          formatCurrency(invoice.tax_amount),
          pageWidth - 20,
          yPosition,
          { align: "right" }
        );
        yPosition += 6;
      }

      // Total Line
      doc.setDrawColor(0, 0, 0);
      doc.line(startX, yPosition, pageWidth - 20, yPosition);
      yPosition += 8;

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Total Amount", startX, yPosition);
      doc.text(
        formatCurrency(invoice.total_amount),
        pageWidth - 20,
        yPosition,
        { align: "right" }
      );
      yPosition += 15;

      // Payment Instructions Section
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Payment Instructions", 15, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const instructions = doc.splitTextToSize(
        "Please make payment by the due date listed above. Contact us if you have any questions about this invoice.",
        pageWidth - 30
      );
      doc.text(instructions, 15, yPosition);
      yPosition += instructions.length * 5 + 5;

      // Additional Notes Section
      if (invoice.notes) {
        doc.setFont("helvetica", "bold");
        doc.text("Additional Notes:", 15, yPosition);
        yPosition += 5;

        doc.setFont("helvetica", "normal");
        const splitNotes = doc.splitTextToSize(invoice.notes, pageWidth - 30);
        doc.text(splitNotes, 15, yPosition);
        yPosition += splitNotes.length * 5;
      }

      // Footer
      const footerY = doc.internal.pageSize.getHeight() - 20;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(
        "Thank you for choosing our photography services!",
        pageWidth / 2,
        footerY,
        { align: "center" }
      );
      if (photographer?.website) {
        doc.setFontSize(8);
        doc.text(
          `Visit us at: ${photographer.website}`,
          pageWidth / 2,
          footerY + 5,
          { align: "center" }
        );
      }

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

  const handleGeneratePDF = async () => {
    await generatePDF();
  };

  return (
    <Button size="sm" variant="outline" onClick={handleGeneratePDF}>
      <Download className="h-3 w-3 mr-1" />
      PDF
    </Button>
  );
};

export default InvoicePDFDownload;
