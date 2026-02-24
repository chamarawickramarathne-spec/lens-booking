import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Plus,
  Calendar,
  DollarSign,
  Check,
  X,
  Mail,
  Send,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { format } from "date-fns";
import InvoiceForm from "@/components/forms/InvoiceForm";
import InvoiceEmailTemplate from "@/components/InvoiceEmailTemplate";
import InvoiceStatusManager from "@/components/InvoiceStatusManager";
import InvoicePDFDownload from "@/components/InvoicePDFDownload";
import { generateInvoicePDF } from "@/utils/pdfGenerator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const paymentSchema = z.object({
  payment_date: z.date({
    required_error: "Payment date is required",
  }),
});

const Invoices = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();

  const paymentForm = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      payment_date: new Date(),
    },
  });

  useEffect(() => {
    if (user) {
      fetchInvoices();
    }
  }, [user]);

  const fetchInvoices = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const response = await apiClient.getInvoices();
      setInvoices(response.data || []);
    } catch (error: any) {
      console.error("Failed to fetch invoices:", error);
      toast({
        title: "Error",
        description: "Failed to load invoices",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendInvoice = async (invoice: any) => {
    setIsLoading(true);
    try {
      console.log("📄 Generating PDF for resend...");
      const doc = await generateInvoicePDF(invoice, user, formatCurrency);
      
      // Convert to base64
      // Get the pure base64 string without the prefix
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      const fileName = `Invoice_${invoice.invoice_number}.pdf`;

      console.log("📧 Sending invoice email with attachment...");
      await apiClient.sendInvoiceEmail(invoice.id, pdfBase64, fileName);
      
      toast({
        title: "Success",
        description: "Invoice email sent successfully with PDF attachment!",
      });
    } catch (error: any) {
      console.error("Failed to resend invoice email:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to send invoice email",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "sent":
        return (
          <Badge variant="default" className="bg-yellow-500 text-white">
            Sent
          </Badge>
        );
      case "paid":
        return (
          <Badge
            variant="default"
            className="bg-success text-success-foreground"
          >
            Paid
          </Badge>
        );
      case "pending":
        return <Badge variant="outline">Pending Payment</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      case "cancel_by_client":
        return <Badge variant="destructive">Cancel by Client</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Calculate totals excluding cancelled invoices
  const activeInvoices = invoices.filter(
    (invoice) => !["cancelled", "cancel_by_client"].includes(invoice.status),
  );
  const totalRevenue = activeInvoices
    .filter((invoice) => invoice.status === "paid")
    .reduce(
      (sum, invoice) =>
        sum + Number(invoice.total_amount || invoice.amount || 0),
      0,
    );
  const pendingAmount = activeInvoices
    .filter(
      (invoice) =>
        !["paid", "cancelled", "cancel_by_client"].includes(invoice.status),
    )
    .reduce(
      (sum, invoice) =>
        sum + Number(invoice.total_amount || invoice.amount || 0),
      0,
    );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Invoices</h2>
            <p className="text-muted-foreground">
              Manage your invoices and track payments
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-elegant">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(totalRevenue + pendingAmount)}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
              <Check className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {formatCurrency(totalRevenue)}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Amount
              </CardTitle>
              <X className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {formatCurrency(pendingAmount)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoices Table */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice List
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading invoices...
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No invoices created yet. Create your first invoice to get
                started!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <div className="font-medium">
                            {invoice.invoice_number}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {invoice.bookings?.title && (
                              <div>{invoice.bookings.title}</div>
                            )}
                            {invoice.clients?.name && (
                              <div>{invoice.clients.name}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(invoice.issue_date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          {format(new Date(invoice.due_date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(invoice.total_amount)}
                        </TableCell>
                        <TableCell>
                          <InvoiceStatusManager
                            invoice={invoice}
                            onStatusChange={fetchInvoices}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {!["cancelled", "cancel_by_client"].includes(
                              invoice.status,
                            ) && (
                              <>
                                <InvoicePDFDownload
                                  invoice={invoice}
                                  photographer={user}
                                />
                                {invoice.status !== "draft" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleResendInvoice(invoice)
                                    }
                                  >
                                    <Send className="h-3 w-3 mr-1" />
                                    Resend
                                  </Button>
                                )}
                              </>
                            )}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline">
                                  <Mail className="h-3 w-3 mr-1" />
                                  Email Preview
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>
                                    Invoice Email Preview
                                  </DialogTitle>
                                </DialogHeader>
                                <InvoiceEmailTemplate
                                  invoice={invoice}
                                  client={invoice.clients}
                                  photographer={user}
                                />
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Invoices;
