import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useCurrency } from "@/hooks/useCurrency";
import { useEffect, useState } from "react";
import { apiClient } from "@/integrations/api/client";
import { getBaseUrl } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

interface InvoiceEmailTemplateProps {
  invoice: any;
  client: any;
  photographer: any;
}

const InvoiceEmailTemplate = ({
  invoice,
  client,
  photographer,
}: InvoiceEmailTemplateProps) => {
  const { formatCurrency } = useCurrency();
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  useEffect(() => {
    if (invoice?.id) {
      loadPayments();
    }
  }, [invoice?.id]);

  const loadPayments = async () => {
    setLoadingPayments(true);
    try {
      // Get all payment schedules
      const paymentsRes = await apiClient.getPayments();
      const schedules = paymentsRes?.data ?? [];

      // Filter schedules for this invoice
      const invoiceSchedules = schedules.filter(
        (s: any) => s.invoice_id === invoice.id,
      );

      // Fetch all installments for these schedules
      const allInstallments: any[] = [];
      for (const schedule of invoiceSchedules) {
        const installmentsRes = await apiClient.getPaymentInstallments(
          schedule.id,
        );
        allInstallments.push(...(installmentsRes?.data ?? []));
      }

      setPayments(allInstallments);
    } catch (error) {
      console.error("Failed to load payments:", error);
    } finally {
      setLoadingPayments(false);
    }
  };

  // Construct full image URL if needed
  const getImageUrl = (imagePath: string | undefined) => {
    if (!imagePath) return "";
    if (imagePath.startsWith("http")) return imagePath;

    // Remove leading slash and /lens-booking prefix if present
    let cleanPath = imagePath;
    if (cleanPath.startsWith("/lens-booking/")) {
      cleanPath = cleanPath.substring("/lens-booking/".length);
    } else if (cleanPath.startsWith("/")) {
      cleanPath = cleanPath.substring(1);
    }

    // Use the image proxy to get images with proper CORS headers
    const encodedPath = encodeURIComponent(cleanPath);
    return `${getBaseUrl()}api/get-image.php?path=${encodedPath}`;
  };

  const profileImageUrl = getImageUrl(photographer?.profile_picture);

  return (
    <div className="max-w-2xl mx-auto bg-background p-6 space-y-6">
      {/* Header */}
      <div className="text-center border-b pb-6">
        {profileImageUrl && (
          <div className="flex justify-center mb-4">
            <img
              src={profileImageUrl}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border-4 border-primary/10"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        )}
        <h1 className="text-3xl font-bold text-primary">
          {photographer?.business_name || photographer?.photographer_name}
        </h1>
        <p className="text-muted-foreground">
          {photographer?.business_email || photographer?.email}
        </p>
        {(photographer?.business_phone || photographer?.phone) && (
          <p className="text-muted-foreground">
            {photographer?.business_phone || photographer?.phone}
          </p>
        )}
        {photographer?.business_address && (
          <p className="text-muted-foreground text-sm mt-1">
            {photographer?.business_address}
          </p>
        )}
      </div>

      {/* Invoice Info */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-2">Bill To:</h3>
          <div className="space-y-1">
            <p className="font-medium">{client?.name}</p>
            <p className="text-muted-foreground">{client?.email}</p>
            {client?.phone && (
              <p className="text-muted-foreground">{client?.phone}</p>
            )}
            {client?.address && (
              <p className="text-muted-foreground text-sm">{client?.address}</p>
            )}
          </div>
        </div>

        <div className="text-right">
          <h2 className="text-2xl font-bold mb-4">INVOICE</h2>
          <div className="space-y-1">
            <p>
              <span className="font-medium">Invoice #:</span>{" "}
              {invoice?.invoice_number}
            </p>
            <p>
              <span className="font-medium">Issue Date:</span>{" "}
              {format(new Date(invoice?.issue_date), "MMM dd, yyyy")}
            </p>
            <p>
              <span className="font-medium">Due Date:</span>{" "}
              {format(new Date(invoice?.due_date), "MMM dd, yyyy")}
            </p>
            <Badge
              variant={invoice?.status === "paid" ? "default" : "secondary"}
              className="mt-2"
            >
              {invoice?.status?.toUpperCase()}
            </Badge>
          </div>
        </div>
      </div>

      {/* Invoice Details */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {invoice?.booking_id && (
              <div className="flex justify-between">
                <span>Photography Service</span>
                <span>{formatCurrency(invoice?.subtotal || 0)}</span>
              </div>
            )}

            {invoice?.deposit_amount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Deposit Amount</span>
                <span>{formatCurrency(invoice?.deposit_amount || 0)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(invoice?.subtotal || 0)}</span>
            </div>

            {invoice?.tax_amount > 0 && (
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatCurrency(invoice?.tax_amount || 0)}</span>
              </div>
            )}

            <div className="border-t pt-2 flex justify-between font-bold text-lg">
              <span>Total Amount</span>
              <span>{formatCurrency(invoice?.total_amount || 0)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Section */}
      {!loadingPayments && payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {payments.map((payment, idx) => (
                <div
                  key={payment.id ?? idx}
                  className="flex items-start gap-3 pb-4 border-b last:border-b-0 last:pb-0"
                >
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-base">
                      <span className="font-semibold">
                        {formatCurrency(payment.amount)}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        paid with{" "}
                        {payment.payment_method
                          ? payment.payment_method
                              .split("_")
                              .map(
                                (word: string) =>
                                  word.charAt(0).toUpperCase() + word.slice(1),
                              )
                              .join(" ")
                          : "N/A"}{" "}
                        on {format(new Date(payment.paid_date), "MMM dd, yyyy")}
                        .
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Please make payment by the due date listed above. Contact us if you
            have any questions about this invoice.
          </p>
          {invoice?.notes && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Additional Notes:</h4>
              <p className="text-muted-foreground">{invoice?.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground border-t pt-4">
        <p>Thank you for choosing our photography services!</p>
        {photographer?.website && (
          <p className="mt-1">Visit us at: {photographer?.website}</p>
        )}
      </div>
    </div>
  );
};

export default InvoiceEmailTemplate;
