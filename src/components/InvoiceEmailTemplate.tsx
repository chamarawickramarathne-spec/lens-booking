import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useCurrency } from "@/hooks/useCurrency";

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

  // Construct full image URL if needed
  const getImageUrl = (imagePath: string | undefined) => {
    if (!imagePath) return "";
    if (imagePath.startsWith("http")) return imagePath;
    
    // Use the image proxy to get images with proper CORS headers
    const encodedPath = encodeURIComponent(imagePath);
    return `http://localhost/lens-booking/api/get-image.php?path=${encodedPath}`;
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
