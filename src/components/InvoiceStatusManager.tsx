import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/integrations/api/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [pendingStatus, setPendingStatus] = useState("");
  const { toast } = useToast();

  const allStatusOptions = [
    { value: "draft", label: "Draft", variant: "secondary" as const },
    { value: "pending", label: "Pending Payment", variant: "outline" as const },
    { value: "cancelled", label: "Cancel", variant: "destructive" as const },
    {
      value: "cancel_by_client",
      label: "Cancel by Client",
      variant: "destructive" as const,
    },
    { value: "paid", label: "Paid", variant: "default" as const },
  ];

  const getStatusOptions = () => {
    const baseOptions = [
      {
        value: "pending",
        label: "Pending Payment",
        variant: "outline" as const,
      },
      { value: "cancelled", label: "Cancel", variant: "destructive" as const },
      {
        value: "cancel_by_client",
        label: "Cancel by Client",
        variant: "destructive" as const,
      },
    ];

    // Only show "Draft" option if current status is draft
    if (invoice.status === "draft") {
      return [
        { value: "draft", label: "Draft", variant: "secondary" as const },
        ...baseOptions,
      ];
    }

    return baseOptions;
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

      await apiClient.updateInvoice(invoice.id, updateData);

      let statusMessage = `Invoice status updated to ${
        allStatusOptions.find((s) => s.value === newStatus)?.label
      }`;

      if (newStatus === "paid") {
        statusMessage += ". Payment date has been recorded.";
      } else if (newStatus === "pending") {
        statusMessage += ". Payment schedules have been created.";
      }

      toast({
        title: "Success",
        description: statusMessage,
      });

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

  // Don't show dropdown for completed invoices
  if (invoice.status === "paid") {
    return getStatusBadge(invoice.status);
  }

  return (
    <div className="flex items-center gap-2">
      {getStatusBadge(invoice.status)}

      <Select onValueChange={handleStatusChange} value={invoice.status}>
        <SelectTrigger className="w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {getStatusOptions().map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              {getConfirmationMessage()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmStatusChange}
              disabled={isLoading}
            >
              {isLoading ? "Updating..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InvoiceStatusManager;
