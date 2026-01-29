import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/integrations/api/client";
import { useCurrency } from "@/hooks/useCurrency";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PaymentManagerProps {
  paymentSchedule: any;
  onSuccess: () => void;
  refreshData: () => void;
}

const PaymentManager = ({
  paymentSchedule,
  onSuccess,
  refreshData,
}: PaymentManagerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [installmentAmount, setInstallmentAmount] = useState<number>(0);
  const [installmentDate, setInstallmentDate] = useState<Date | undefined>(
    new Date(),
  );
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [installments, setInstallments] = useState<any[]>([]);
  const [isLoadingInstallments, setIsLoadingInstallments] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const isPaid = String(paymentSchedule.status).toLowerCase() === "paid";

  // Derived amounts
  const totalAmount = Number(paymentSchedule.amount) || 0;
  const alreadyPaid = Number(paymentSchedule.paid_amount) || 0;
  const remainingAmount = Math.max(totalAmount - alreadyPaid, 0);
  const isFullyPaid = alreadyPaid >= totalAmount;

  // Validation message
  const validationError: string | null = (() => {
    if (Number.isNaN(installmentAmount)) return "Enter a valid amount";
    if (installmentAmount <= 0)
      return "Installment amount must be greater than zero.";
    if (installmentAmount > remainingAmount)
      return `Installment amount cannot exceed remaining due (${formatCurrency(
        remainingAmount,
      )}).`;
    return null;
  })();

  const handleInstallmentAmountChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const rawValue = parseFloat(e.target.value);
    const newValue = isNaN(rawValue) ? 0 : rawValue;
    setInstallmentAmount(newValue);
  };

  const loadInstallments = async () => {
    if (!paymentSchedule?.id) return;
    setIsLoadingInstallments(true);
    try {
      const response = await apiClient.getPaymentInstallments(
        paymentSchedule.id,
      );
      setInstallments(response.data || []);
    } catch (error: any) {
      console.error("Failed to load installments:", error);
      toast({
        title: "Error",
        description: "Failed to load installments",
        variant: "destructive",
      });
    } finally {
      setIsLoadingInstallments(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadInstallments();
    }
  }, [isOpen]);

  const handleAddInstallment = async () => {
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      const response = await apiClient.addPaymentInstallment(
        paymentSchedule.id,
        {
          amount: installmentAmount,
          paid_date: installmentDate
            ? format(installmentDate, "yyyy-MM-dd")
            : format(new Date(), "yyyy-MM-dd"),
          payment_method: paymentMethod,
        },
      );

      const updatedPaidAmount =
        response?.data?.paid_amount ?? alreadyPaid + installmentAmount;
      const updatedStatus = response?.data?.status ?? "pending";

      if (
        updatedStatus === "paid" &&
        paymentSchedule.invoice_id &&
        paymentSchedule.schedule_type === "final"
      ) {
        const invoiceResponse = await apiClient.getInvoice(
          paymentSchedule.invoice_id,
        );
        if (invoiceResponse.data) {
          await apiClient.updateInvoice(paymentSchedule.invoice_id, {
            ...invoiceResponse.data,
            status: "paid",
            payment_date: installmentDate
              ? format(installmentDate, "yyyy-MM-dd")
              : format(new Date(), "yyyy-MM-dd"),
          });
        }
      }

      toast({
        title: "Success",
        description:
          updatedStatus === "paid" && paymentSchedule.schedule_type === "final"
            ? "Installment added and invoice marked as paid!"
            : updatedStatus === "paid"
              ? "Payment completed successfully!"
              : "Installment recorded successfully!",
      });

      setInstallmentAmount(0);
      setPaymentMethod("cash");
      loadInstallments();
      onSuccess();
      refreshData();
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.message || "An unknown error occurred during update.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
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
        return <Badge variant="secondary">Pending</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          {isPaid ? "View Payment" : "Manage Payment"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Manage Payment - Current Status is{" "}
            {paymentSchedule.status.charAt(0).toUpperCase() +
              paymentSchedule.status.slice(1)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Summary */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <Label className="text-sm text-gray-500">Total Amount</Label>
              <p className="font-medium text-lg">
                {formatCurrency(paymentSchedule.amount)}
              </p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Remaining Due</Label>
              <p className="font-medium text-lg">
                {formatCurrency(remainingAmount)}
              </p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Due Date</Label>
              <p className="font-medium">
                {paymentSchedule.due_date &&
                paymentSchedule.due_date !== "0000-00-00"
                  ? format(new Date(paymentSchedule.due_date), "PPP")
                  : "Not set"}
              </p>
            </div>
            <div className="col-span-3">
              <Label className="text-sm text-gray-500">Already Paid</Label>
              <p className="font-medium text-lg">
                {formatCurrency(paymentSchedule.paid_amount || 0)}
              </p>
            </div>
          </div>

          {/* Payment Input */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="installment-amount">
                  Add Installment Amount
                </Label>
                <Input
                  id="installment-amount"
                  type="number"
                  step="0.01"
                  max={remainingAmount}
                  value={installmentAmount}
                  onChange={handleInstallmentAmountChange}
                  placeholder={`Max: ${formatCurrency(remainingAmount)}`}
                  className={validationError ? "border-red-500" : ""}
                  disabled={isPaid || remainingAmount <= 0}
                />
                {validationError && (
                  <p className="text-xs text-red-500 mt-1">{validationError}</p>
                )}
              </div>

              <div>
                <Label htmlFor="payment-method">Payment Method</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                  disabled={isPaid || remainingAmount <= 0}
                >
                  <SelectTrigger id="payment-method">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="e_transfer_bank">
                      E-Transfer / Bank
                    </SelectItem>
                    <SelectItem value="card_pay">Card Pay</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Installment Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !installmentDate && "text-gray-500",
                    )}
                    disabled={isPaid || remainingAmount <= 0}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {installmentDate ? (
                      format(installmentDate, "PPP")
                    ) : (
                      <span>Pick payment date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={installmentDate}
                    onSelect={isPaid ? () => {} : setInstallmentDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Installment History */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-500">Installment History</Label>
            {isLoadingInstallments ? (
              <p className="text-xs text-muted-foreground">
                Loading installments...
              </p>
            ) : installments.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No installments recorded yet.
              </p>
            ) : (
              <div className="rounded-lg border">
                <div className="grid grid-cols-3 gap-2 bg-gray-50 px-3 py-1.5 text-[11px] text-gray-500">
                  <div>Date</div>
                  <div>Amount</div>
                  <div>Method</div>
                </div>
                {installments.map((inst) => (
                  <div
                    key={inst.id}
                    className="grid grid-cols-3 gap-2 px-3 py-1.5 text-xs border-t"
                  >
                    <div>
                      {inst.paid_date && inst.paid_date !== "0000-00-00"
                        ? format(new Date(inst.paid_date), "MMM dd, yyyy")
                        : "Not set"}
                    </div>
                    <div className="font-medium text-success">
                      {formatCurrency(inst.amount)}
                    </div>
                    <div className="text-[11px]">
                      {inst.payment_method || "-"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status Preview */}
          {!isPaid && remainingAmount <= 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700 font-medium">
                This schedule is fully paid.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            {!isPaid && (
              <Button
                onClick={handleAddInstallment}
                disabled={
                  isLoading ||
                  Boolean(validationError) ||
                  installmentAmount <= 0 ||
                  remainingAmount <= 0
                }
              >
                {isLoading ? "Saving..." : "Add Installment"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentManager;
