import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, Plus, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { format } from "date-fns";
import PaymentManager from "@/components/PaymentManager";
import PaymentScheduleForm from "@/components/forms/PaymentScheduleForm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// --- TypeScript Definitions ---

interface Client {
  name: string | null;
}

interface Booking {
  title: string | null;
  client_id: string;
  clients: Client | null;
}

interface Invoice {
  invoice_number: string | null;
  client_id: string;
  clients: Client | null;
}

interface PaymentSchedule {
  id: string;
  photographer_id: string;
  payment_name: string;
  schedule_type: "deposit" | "final" | "invoice" | string;
  due_date: string;
  amount: number;
  paid_amount: number | null;
  status: "completed" | "pending" | string;
  bookings: Booking | null;
  invoices: Invoice | null;
}

// --- Component ---

const PaymentSchedules = () => {
  // Use the defined type
  const [paymentSchedules, setPaymentSchedules] = useState<PaymentSchedule[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();

  const fetchPaymentSchedules = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const response = await apiClient.getPayments();
      setPaymentSchedules((response.data as PaymentSchedule[]) || []);
    } catch (error: unknown) {
      console.error("Failed to fetch payment schedules:", error);
      let errorMessage = "Failed to load payment schedules";
      if (error && typeof error === "object" && "message" in error) {
        errorMessage = (error as { message: string }).message;
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPaymentSchedules();
    }
  }, [user]); // Dependency on user is correct

  // Updated to use PaymentSchedule type
  const getStatusBadge = (status: PaymentSchedule["status"]) => {
    switch (status) {
      case "completed":
        return (
          <Badge
            variant="default"
            className="bg-success text-success-foreground"
          >
            Completed
          </Badge>
        );
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Updated to use PaymentSchedule type
  const getScheduleTypeBadge = (type: PaymentSchedule["schedule_type"]) => {
    switch (type) {
      case "deposit":
        return (
          <Badge variant="outline" className="border-warning text-warning">
            Deposit
          </Badge>
        );
      case "final":
        return (
          <Badge variant="outline" className="border-primary text-primary">
            Final
          </Badge>
        );
      case "invoice":
        return <Badge variant="outline">Invoice</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // Updated to use PaymentSchedule type
  const getClientName = (schedule: PaymentSchedule) => {
    if (schedule.bookings?.clients?.name) {
      return schedule.bookings.clients.name;
    }
    if (schedule.invoices?.clients?.name) {
      return schedule.invoices.clients.name;
    }
    return "Unknown Client";
  };

  // Updated to use PaymentSchedule type
  const getReference = (schedule: PaymentSchedule) => {
    if (schedule.bookings?.title) {
      return `Booking: ${schedule.bookings.title}`;
    }
    if (schedule.invoices?.invoice_number) {
      return `Invoice: ${schedule.invoices.invoice_number}`;
    }
    return "No reference";
  };

  // Get invoice number for display under payment name
  const getInvoiceNumber = (schedule: PaymentSchedule) => {
    return schedule.invoices?.invoice_number || null;
  };

  // Calculate totals - using nullish coalescing (?? 0) for safety
  const totalAmount = paymentSchedules.reduce(
    (sum, schedule) => sum + (schedule.amount ?? 0),
    0
  );
  const paidAmount = paymentSchedules.reduce(
    (sum, schedule) => sum + (schedule.paid_amount ?? 0),
    0
  );
  const pendingAmount = totalAmount - paidAmount;
  const completedSchedules = paymentSchedules.filter(
    (s) => s.status === "completed"
  ).length;

  // Sort by ID descending and group by invoice number
  const sortedAndGroupedSchedules = () => {
    // First sort by ID descending
    const sorted = [...paymentSchedules].sort((a, b) => {
      return Number(b.id) - Number(a.id);
    });

    // Group by invoice number
    const grouped: { [key: string]: PaymentSchedule[] } = {};
    const noInvoiceGroup: PaymentSchedule[] = [];

    sorted.forEach((schedule) => {
      const invoiceNumber = getInvoiceNumber(schedule);
      if (invoiceNumber) {
        if (!grouped[invoiceNumber]) {
          grouped[invoiceNumber] = [];
        }
        grouped[invoiceNumber].push(schedule);
      } else {
        noInvoiceGroup.push(schedule);
      }
    });

    return { grouped, noInvoiceGroup };
  };

  const { grouped, noInvoiceGroup } = sortedAndGroupedSchedules();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Payment Schedules
            </h2>
            <p className="text-muted-foreground">
              Manage payment schedules and track collection
            </p>
          </div>
          <PaymentScheduleForm
            onSuccess={fetchPaymentSchedules}
            trigger={
              <Button className="bg-gradient-primary hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" />
                Add Payment Schedule
              </Button>
            }
          />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="shadow-elegant">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Amount
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(totalAmount)}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {formatCurrency(paidAmount)}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Amount
              </CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {formatCurrency(pendingAmount)}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedSchedules}</div>
              <p className="text-xs text-muted-foreground">
                of {paymentSchedules.length} schedules
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payment Schedules Table */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Payment Schedule List
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading payment schedules...
              </div>
            ) : paymentSchedules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No payment schedules found. Create your first payment schedule
                to get started!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Name</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Render grouped invoices */}
                    {Object.entries(grouped).map(
                      ([invoiceNumber, schedules]) => (
                        <>
                          {schedules.map((schedule, idx) => (
                            <TableRow
                              key={schedule.id}
                              className={
                                idx === 0 ? "border-t-2 border-primary/20" : ""
                              }
                            >
                              <TableCell>
                                <div className="font-medium">
                                  {schedule.payment_name}
                                </div>
                                {getInvoiceNumber(schedule) && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {getInvoiceNumber(schedule)}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>{getClientName(schedule)}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {getReference(schedule)}
                              </TableCell>
                              <TableCell>
                                {schedule.due_date &&
                                schedule.due_date !== "0000-00-00"
                                  ? format(
                                      new Date(schedule.due_date),
                                      "MMM dd, yyyy"
                                    )
                                  : "Not set"}
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatCurrency(schedule.amount)}
                              </TableCell>
                              <TableCell className="font-medium text-success">
                                {formatCurrency(schedule.paid_amount ?? 0)}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(schedule.status)}
                              </TableCell>
                              <TableCell>
                                <PaymentManager
                                  paymentSchedule={schedule}
                                  onSuccess={fetchPaymentSchedules}
                                  refreshData={fetchPaymentSchedules}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      )
                    )}
                    {/* Render schedules without invoice */}
                    {noInvoiceGroup.map((schedule, idx) => (
                      <TableRow
                        key={schedule.id}
                        className={
                          idx === 0 && Object.keys(grouped).length > 0
                            ? "border-t-2 border-muted"
                            : ""
                        }
                      >
                        <TableCell>
                          <div className="font-medium">
                            {schedule.payment_name}
                          </div>
                          {getInvoiceNumber(schedule) && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {getInvoiceNumber(schedule)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{getClientName(schedule)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {getReference(schedule)}
                        </TableCell>
                        <TableCell>
                          {schedule.due_date &&
                          schedule.due_date !== "0000-00-00"
                            ? format(
                                new Date(schedule.due_date),
                                "MMM dd, yyyy"
                              )
                            : "Not set"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(schedule.amount)}
                        </TableCell>
                        <TableCell className="font-medium text-success">
                          {formatCurrency(schedule.paid_amount ?? 0)}
                        </TableCell>
                        <TableCell>{getStatusBadge(schedule.status)}</TableCell>
                        <TableCell>
                          <PaymentManager
                            paymentSchedule={schedule}
                            onSuccess={fetchPaymentSchedules}
                            refreshData={fetchPaymentSchedules}
                          />
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

export default PaymentSchedules;
