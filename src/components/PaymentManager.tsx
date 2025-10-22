import { useState } from "react";
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
  const [paidAmount, setPaidAmount] = useState<number>(
    Number(paymentSchedule.paid_amount) || 0
  );
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(
    paymentSchedule.payment_date &&
      paymentSchedule.payment_date !== "0000-00-00"
      ? new Date(paymentSchedule.payment_date)
      : undefined
  );
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const isCompleted =
    String(paymentSchedule.status).toLowerCase() === "completed";

  // Derived amounts
  const totalAmount = Number(paymentSchedule.amount) || 0;
  const alreadyPaid = Number(paymentSchedule.paid_amount) || 0;
  const clampedPaidAmount = Math.min(
    Math.max(paidAmount, alreadyPaid),
    totalAmount
  );
  const remainingAmount = Math.max(totalAmount - clampedPaidAmount, 0);
  const isFullyPaid = clampedPaidAmount >= totalAmount;

  // Validation message
  const validationError: string | null = (() => {
    if (Number.isNaN(paidAmount)) return "Enter a valid amount";
    if (paidAmount < alreadyPaid)
      return "New total paid amount cannot be less than already paid amount.";
    if (paidAmount > totalAmount)
      return `New total paid amount cannot exceed total amount (${formatCurrency(
        totalAmount
      )}). You can add up to ${formatCurrency(totalAmount - alreadyPaid)}.`;
    return null;
  })();

  const handlePaidAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = parseFloat(e.target.value);
    const newValue = isNaN(rawValue) ? 0 : rawValue;
    setPaidAmount(newValue);
  };

  const handlePaymentUpdate = async () => {
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive",
      });
      return;
    }
    if (paidAmount === alreadyPaid) {
      toast({
        title: "Validation Error",
        description: "No change detected. Increase the amount to update.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const newStatus = paidAmount >= totalAmount ? "completed" : "pending";

      await apiClient.updatePayment(paymentSchedule.id, {
        ...paymentSchedule,
        paid_amount: paidAmount,
        payment_date: paymentDate
          ? format(paymentDate, "yyyy-MM-dd")
          : format(new Date(), "yyyy-MM-dd"),
        status: newStatus,
      });

      if (
        paidAmount >= totalAmount &&
        paymentSchedule.invoice_id &&
        paymentSchedule.schedule_type === "final"
      ) {
        const invoiceResponse = await apiClient.getInvoice(
          paymentSchedule.invoice_id
        );
        if (invoiceResponse.data) {
          await apiClient.updateInvoice(paymentSchedule.invoice_id, {
            ...invoiceResponse.data,
            status: "paid",
            payment_date: paymentDate
              ? format(paymentDate, "yyyy-MM-dd")
              : format(new Date(), "yyyy-MM-dd"),
          });
        }
      }

      toast({
        title: "Success",
        description:
          paidAmount >= totalAmount && paymentSchedule.schedule_type === "final"
            ? "Payment completed and invoice marked as paid!"
            : paidAmount >= totalAmount
            ? "Payment completed successfully!"
            : "Payment updated successfully!",
      });

      setIsOpen(false);
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
      case "completed":
        return (
          <Badge variant="default" className="bg-green-600 text-white">
            Completed
          </Badge>
        );
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <DollarSign className="h-3 w-3 mr-1" />
          {isCompleted ? "View Payment" : "Manage Payment"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            Manage Payment - {paymentSchedule.payment_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Summary */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
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
              <Label className="text-sm text-gray-500">Current Status</Label>
              {getStatusBadge(paymentSchedule.status)}
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
            <div className="col-span-2">
              <Label className="text-sm text-gray-500">Already Paid</Label>
              <p className="font-medium text-lg">
                {formatCurrency(paymentSchedule.paid_amount || 0)}
              </p>
            </div>
          </div>

          {/* Payment Input */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="paid-amount">New Total Paid Amount</Label>
              <Input
                id="paid-amount"
                type="number"
                step="0.01"
                max={totalAmount}
                value={paidAmount}
                onChange={handlePaidAmountChange}
                placeholder={`Enter total paid amount (Max: ${formatCurrency(
                  totalAmount
                )})`}
                className={validationError ? "border-red-500" : ""}
                disabled={isCompleted}
              />
              {validationError && (
                <p className="text-sm text-red-500 mt-1">{validationError}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                Amount to be recorded:{" "}
                <strong>
                  {formatCurrency(
                    Math.min(Math.max(paidAmount, alreadyPaid), totalAmount)
                  )}
                </strong>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Remaining due after update:{" "}
                {formatCurrency(
                  Math.max(
                    totalAmount -
                      Math.min(Math.max(paidAmount, alreadyPaid), totalAmount),
                    0
                  )
                )}
              </p>
            </div>

            <div>
              <Label>Payment Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !paymentDate && "text-gray-500"
                    )}
                    disabled={isCompleted}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {paymentDate ? (
                      format(paymentDate, "PPP")
                    ) : (
                      <span>Pick payment date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={paymentDate}
                    onSelect={isCompleted ? () => {} : setPaymentDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Status Preview */}
          {!isCompleted && isFullyPaid && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700 font-medium">
                Submitting {formatCurrency(clampedPaidAmount)} will mark the
                schedule as **Completed**!
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            {!isCompleted && (
              <Button
                onClick={handlePaymentUpdate}
                disabled={
                  isLoading ||
                  Boolean(validationError) ||
                  paidAmount === alreadyPaid
                }
              >
                {isLoading ? "Updating..." : "Update Payment"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentManager;
