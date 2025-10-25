import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/integrations/api/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";

interface InvoiceStatusManagerProps {
  invoice: any;
  onStatusChange: () => void;
}

const InvoiceStatusManager = ({
  invoice,
  onStatusChange,
}: InvoiceStatusManagerProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPaymentDatesDialog, setShowPaymentDatesDialog] = useState(false);
  const [depositDueDate, setDepositDueDate] = useState<Date | undefined>(
    new Date()
  );
  const [finalDueDate, setFinalDueDate] = useState<Date | undefined>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  );
  const [pendingStatus, setPendingStatus] = useState("");
  const { toast } = useToast();

  const allStatusOptions = [
    { value: "draft", label: "Draft", variant: "secondary" as const, order: 1 },
    {
      value: "pending",
      label: "Pending Payment",
      variant: "outline" as const,
      order: 2,
    },
    { value: "paid", label: "Paid", variant: "default" as const, order: 3 },
    {
      value: "cancelled",
      label: "Cancelled",
      variant: "destructive" as const,
      order: 99,
    },
    {
      value: "cancel_by_client",
      label: "Cancelled by Client",
      variant: "destructive" as const,
      order: 99,
    },
  ];

  const getCurrentStatusOrder = () => {
    const currentStatus = allStatusOptions.find(
      (opt) => opt.value === invoice.status
    );
    return currentStatus?.order || 0;
  };

  const getStatusOptions = () => {
    const currentOrder = getCurrentStatusOrder();

    // Filter to show only current status and future statuses, plus cancel options
    const statusOptions = allStatusOptions.filter((option) => {
      // Always show cancel options
      if (option.value === "cancelled" || option.value === "cancel_by_client") {
        return true;
      }
      // Show current and future statuses
      return option.order >= currentOrder;
    });

    return statusOptions;
  };

  const getStatusBadge = (status: string) => {
    const statusOption = allStatusOptions.find((opt) => opt.value === status);
    if (!statusOption) return <Badge variant="secondary">{status}</Badge>;

    return (
      <Badge
        variant={statusOption.variant}
        className={
          statusOption.value === "paid"
            ? "bg-success text-success-foreground"
            : ""
        }
      >
        {statusOption.label}
      </Badge>
    );
  };

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === invoice.status) return;

    // Prevent status changes for paid invoices
    if (invoice.status === "paid") {
      toast({
        title: "Cannot Change Status",
        description: "Paid invoices cannot be modified.",
        variant: "destructive",
      });
      return;
    }

    // Prevent backward status changes (except cancellations)
    const currentOrder = getCurrentStatusOrder();
    const newStatusOption = allStatusOptions.find(
      (opt) => opt.value === newStatus
    );
    const newOrder = newStatusOption?.order || 0;

    if (
      newOrder < currentOrder &&
      newStatus !== "cancelled" &&
      newStatus !== "cancel_by_client"
    ) {
      toast({
        title: "Invalid Status Change",
        description: "Cannot move to a previous status.",
        variant: "destructive",
      });
      return;
    }

    // Show confirmation for critical status changes
    if (
      newStatus === "cancelled" ||
      newStatus === "cancel_by_client" ||
      newStatus === "paid"
    ) {
      setPendingStatus(newStatus);
      setShowConfirmDialog(true);
    } else {
      updateStatus(newStatus);
    }
  };

  const updateStatus = async (newStatus: string) => {
    setIsLoading(true);
    try {
      const updateData: any = {
        ...invoice,
        status: newStatus,
      };

      // Set payment date when marking as paid
      if (newStatus === "paid") {
        updateData.payment_date = new Date().toISOString().split("T")[0];
      }

      // Set final due date when sending invoice (status to pending)
      if (newStatus === "pending" && finalDueDate) {
        updateData.due_date = format(finalDueDate, "yyyy-MM-dd");
      }

      await apiClient.updateInvoice(invoice.id, updateData);

      // Send invoice email when status changes to pending
      if (newStatus === "pending") {
        try {
          await apiClient.sendInvoiceEmail(invoice.id);
          toast({
            title: "Success",
            description: "Invoice sent successfully! Email has been sent to the client.",
          });
        } catch (emailError: any) {
          console.error("Failed to send email:", emailError);
          toast({
            title: "Warning",
            description: "Invoice status updated, but failed to send email to client.",
            variant: "default",
          });
        }
      } else {
        let statusMessage = `Invoice status updated to ${
          allStatusOptions.find((s) => s.value === newStatus)?.label
        }`;

        if (newStatus === "paid") {
          statusMessage += ". Payment date has been recorded.";
        }

        toast({
          title: "Success",
          description: statusMessage,
        });
      }

      onStatusChange();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update invoice status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setShowConfirmDialog(false);
      setPendingStatus("");
    }
  };

  const confirmStatusChange = () => {
    updateStatus(pendingStatus);
  };

  const getConfirmationMessage = () => {
    switch (pendingStatus) {
      case "paid":
        return "This will mark the invoice as paid and record the payment date. Are you sure?";
      case "cancelled":
      case "cancel_by_client":
        return "This will cancel the invoice and it will not count towards revenue. Are you sure?";
      default:
        return "Are you sure you want to change the invoice status?";
    }
  };

  const handleSendInvoice = () => {
    if (invoice.status === "draft") {
      // Check if invoice has deposit amount
      const hasDeposit = invoice.deposit_amount && invoice.deposit_amount > 0;

      if (hasDeposit) {
        // Show payment dates dialog
        setShowPaymentDatesDialog(true);
      } else {
        // No deposit, just show confirmation
        setPendingStatus("pending");
        setShowConfirmDialog(true);
      }
    }
  };

  const handleConfirmPaymentDates = () => {
    setShowPaymentDatesDialog(false);
    setPendingStatus("pending");
    setShowConfirmDialog(true);
  };

  return (
    <div className="flex items-center gap-2">
      {getStatusBadge(invoice.status)}

      {invoice.status === "draft" && (
        <Button
          size="sm"
          variant="default"
          onClick={handleSendInvoice}
          disabled={isLoading}
        >
          {isLoading ? "Sending..." : "Send Invoice"}
        </Button>
      )}

      {/* Payment Dates Dialog */}
      <Dialog
        open={showPaymentDatesDialog}
        onOpenChange={setShowPaymentDatesDialog}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Set Payment Due Dates</DialogTitle>
            <DialogDescription>
              Select the due dates for deposit and final payments. The final
              payment date will be set as the invoice due date.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Deposit Due Date */}
            {invoice.deposit_amount && invoice.deposit_amount > 0 && (
              <div className="space-y-2">
                <Label htmlFor="deposit-date" className="font-semibold">
                  Deposit Payment Due Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !depositDueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {depositDueDate ? (
                        format(depositDueDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={depositDueDate}
                      onSelect={setDepositDueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Final Payment Due Date */}
            <div className="space-y-2">
              <Label htmlFor="final-date" className="font-semibold">
                Final Payment Due Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !finalDueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {finalDueDate ? (
                      format(finalDueDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={finalDueDate}
                    onSelect={setFinalDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                This will be set as the invoice due date
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPaymentDatesDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmPaymentDates}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              This will change the invoice status to "Pending Payment" and
              create payment schedules. Are you sure you want to send this
              invoice?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmStatusChange}
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Send Invoice"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InvoiceStatusManager;
