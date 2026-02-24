import jsPDF from "jspdf";
import { format } from "date-fns";
import { getBaseUrl } from "@/lib/utils";

const loadImageAsBase64 = async (
  url: string,
): Promise<{ data: string; format: string }> => {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "image/*",
      },
      mode: "cors",
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch image: ${response.status} ${response.statusText}`,
      );
    }

    const blob = await response.blob();

    // Detect image format from blob type
    let format = "JPEG";
    if (blob.type.includes("png")) {
      format = "PNG";
    } else if (blob.type.includes("jpg") || blob.type.includes("jpeg")) {
      format = "JPEG";
    } else if (blob.type.includes("webp")) {
      format = "WEBP";
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const data = reader.result as string;
        resolve({
          data,
          format: format,
        });
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("❌ Failed to load image:", error);
    return { data: "", format: "JPEG" };
  }
};

const getImageUrl = (imagePath: string | undefined) => {
  if (!imagePath) return "";

  let cleanPath = imagePath;

  if (imagePath.startsWith("http")) {
    try {
      const url = new URL(imagePath);
      cleanPath = url.pathname;
      if (cleanPath.startsWith("/lens-booking/")) {
        cleanPath = cleanPath.substring("/lens-booking/".length);
      } else if (cleanPath.startsWith("/")) {
        cleanPath = cleanPath.substring(1);
      }
    } catch (e) {
      return "";
    }
  } else {
    if (cleanPath.startsWith("/lens-booking/")) {
      cleanPath = cleanPath.substring("/lens-booking/".length);
    } else if (cleanPath.startsWith("/")) {
      cleanPath = cleanPath.substring(1);
    }
  }

  const encodedPath = encodeURIComponent(cleanPath);
  return `${getBaseUrl()}api/get-image.php?path=${encodedPath}`;
};

export const generateInvoicePDF = async (
  invoice: any,
  photographer: any,
  formatCurrency: (amount: number) => string,
): Promise<jsPDF> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 10;

  let imageToUse: { data: string; format: string } = {
    data: "",
    format: "JPEG",
  };

  const profileImageUrl = getImageUrl(photographer?.profile_picture);

  if (profileImageUrl) {
    imageToUse = await loadImageAsBase64(profileImageUrl);
  }

  if (!imageToUse.data) {
    const logoUrl = `${window.location.origin}/hireartist_logo_full.png`;
    imageToUse = await loadImageAsBase64(logoUrl);
  }

  if (imageToUse.data) {
    try {
      const imgSize = 40;
      const imgX = (pageWidth - imgSize) / 2;
      doc.addImage(
        imageToUse.data,
        imageToUse.format,
        imgX,
        yPosition,
        imgSize,
        imgSize,
        undefined,
        "FAST",
      );
      yPosition += imgSize + 3;
    } catch (error) {
      console.error("❌ Failed to add image to PDF:", error);
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
    { align: "center" },
  );
  yPosition += 6;

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
      pageWidth - 40,
    );
    doc.text(splitAddress, pageWidth / 2, yPosition, { align: "center" });
    yPosition += splitAddress.length * 5;
  }
  yPosition += 5;

  // Divider Line
  doc.setDrawColor(200, 200, 200);
  doc.line(15, yPosition, pageWidth - 15, yPosition);
  yPosition += 12;

  // Two column layout
  const leftColX = 15;
  const rightColX = pageWidth / 2 + 10;
  const sectionStartY = yPosition;

  // Left Column - Bill To
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Bill To:", leftColX, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.clients?.name || invoice.client_name || "N/A", leftColX, yPosition);
  yPosition += 5;
  if (invoice.clients?.email || invoice.client_email) {
    doc.text(invoice.clients?.email || invoice.client_email, leftColX, yPosition);
    yPosition += 5;
  }
  if (invoice.clients?.phone || invoice.client_phone) {
    doc.text(invoice.clients?.phone || invoice.client_phone, leftColX, yPosition);
    yPosition += 5;
  }
  if (invoice.clients?.address) {
    const splitAddress = doc.splitTextToSize(
      invoice.clients.address,
      pageWidth / 2 - 20,
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
    format(new Date(invoice.issue_date || invoice.invoice_date), "MMM dd, yyyy"),
    rightColX + 25,
    rightYPosition,
  );
  rightYPosition += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Due Date:", rightColX, rightYPosition);
  doc.setFont("helvetica", "normal");
  doc.text(
    format(new Date(invoice.due_date), "MMM dd, yyyy"),
    rightColX + 25,
    rightYPosition,
  );
  rightYPosition += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Status:", rightColX, rightYPosition);
  doc.setFont("helvetica", "normal");
  doc.text((invoice.status || "").toUpperCase(), rightColX + 25, rightYPosition);

  yPosition = Math.max(yPosition, rightYPosition) + 12;

  // Invoice Details Section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Invoice Details", 15, yPosition);
  yPosition += 8;

  doc.setFillColor(240, 240, 240);
  doc.rect(15, yPosition, pageWidth - 30, 8, "F");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Description", 20, yPosition + 5);
  doc.text("Amount", pageWidth - 45, yPosition + 5, { align: "right" });
  yPosition += 12;

  doc.setFont("helvetica", "normal");
  if (invoice.bookings?.title || invoice.booking_title) {
    doc.text(
      `Photography Service - ${invoice.bookings?.title || invoice.booking_title}`,
      20,
      yPosition,
    );
  } else {
    doc.text("Photography Services", 20, yPosition);
  }
  doc.text(formatCurrency(invoice.subtotal), pageWidth - 45, yPosition, {
    align: "right",
  });
  yPosition += 8;

  if (invoice.deposit_amount && invoice.deposit_amount > 0) {
    doc.setTextColor(100, 100, 100);
    doc.text("Deposit Amount", 20, yPosition);
    doc.text(
      formatCurrency(invoice.deposit_amount),
      pageWidth - 45,
      yPosition,
      { align: "right" },
    );
    doc.setTextColor(0, 0, 0);
    yPosition += 8;
  }

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
      { align: "right" },
    );
    yPosition += 6;
  }

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
    { align: "right" },
  );
  yPosition += 15;

  // Payment Instructions
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Payment Instructions", 15, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const instructions = doc.splitTextToSize(
    "Please make payment by the due date listed above. Contact us if you have any questions about this invoice.",
    pageWidth - 30,
  );
  doc.text(instructions, 15, yPosition);
  yPosition += instructions.length * 5 + 5;

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
    { align: "center" },
  );
  if (photographer?.website) {
    doc.setFontSize(8);
    doc.text(
      `Visit us at: ${photographer.website}`,
      pageWidth / 2,
      footerY + 5,
      { align: "center" },
    );
  }

  return doc;
};
