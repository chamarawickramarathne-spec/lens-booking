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
  // Ensure paidAmount is number for calculations
  const [paidAmount, setPaidAmount] = useState(
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

  // Clamp paidAmount value to max amount
  const clampedPaidAmount = Math.min(paidAmount, paymentSchedule.amount);

  const remainingAmount = paymentSchedule.amount - clampedPaidAmount;
  const isFullyPaid = clampedPaidAmount >= paymentSchedule.amount;

  // Added input validation and clamping to handle user input exceeding max
  const handlePaidAmountChange = (e) => {
    const rawValue = parseFloat(e.target.value);
    const newValue = isNaN(rawValue) ? 0 : rawValue;
    setPaidAmount(newValue);
  };

  const handlePaymentUpdate = async () => {
    // Basic validation before API call
    if (clampedPaidAmount <= (paymentSchedule.paid_amount || 0)) {
      toast({
        title: "Validation Error",
        description:
          "Paid amount must be greater than the already paid amount.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Use the clamped amount for the actual update
      const newStatus = isFullyPaid ? "completed" : "pending";

      await apiClient.updatePayment(paymentSchedule.id, {
        ...paymentSchedule,
        paid_amount: clampedPaidAmount,
        payment_date: paymentDate ? format(paymentDate, "yyyy-MM-dd") : null,
        status: newStatus,
      });

      // If Final Payment is fully completed and linked to an invoice, update invoice status to paid
      if (
        isFullyPaid &&
        paymentSchedule.invoice_id &&
        paymentSchedule.schedule_type === "final"
      ) {
        // Get the invoice to update it
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
          isFullyPaid && paymentSchedule.schedule_type === "final"
            ? "Payment completed and invoice marked as paid!"
            : isFullyPaid
            ? "Payment completed successfully!"
            : "Payment updated successfully!",
      });

      setIsOpen(false);
      onSuccess();
      refreshData(); // Call to refresh the parent component's data
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
        // Mocking the success colors
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
          Manage Payment
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
                // max={paymentSchedule.amount} // Removed max from input to allow user to enter value, then clamped in logic
                value={paidAmount}
                onChange={handlePaidAmountChange}
                placeholder={`Enter total paid amount (Max: ${formatCurrency(
                  paymentSchedule.amount
                )})`}
                className={
                  clampedPaidAmount > paymentSchedule.amount
                    ? "border-red-500"
                    : ""
                }
              />
              {clampedPaidAmount > paymentSchedule.amount && (
                <p className="text-sm text-red-500 mt-1">
                  Amount entered ({formatCurrency(paidAmount)}) exceeds total.
                  Only {formatCurrency(paymentSchedule.amount)} will be applied.
                </p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                Amount to be recorded: **{formatCurrency(clampedPaidAmount)}**
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
                    onSelect={setPaymentDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Status Preview */}
          {isFullyPaid && (
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
            <Button
              onClick={handlePaymentUpdate}
              disabled={
                isLoading ||
                clampedPaidAmount <= (paymentSchedule.paid_amount || 0)
              }
            >
              {isLoading ? "Updating..." : "Update Payment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentManager;
