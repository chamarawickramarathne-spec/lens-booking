import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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

interface BookingStatusManagerProps {
  booking: any;
  onStatusChange: () => void;
}

const BookingStatusManager = ({ booking, onStatusChange }: BookingStatusManagerProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("");
  const { toast } = useToast();

  const statusOptions = [
    { value: "pending", label: "Pending", variant: "secondary" as const },
    { value: "confirmed", label: "Confirmed", variant: "default" as const },
    { value: "completed", label: "Completed", variant: "default" as const },
    { value: "cancelled", label: "Cancelled", variant: "destructive" as const },
    { value: "cancel_by_client", label: "Cancel by Client", variant: "destructive" as const },
  ];

  const getStatusBadge = (status: string) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    if (!statusOption) return <Badge variant="secondary">{status}</Badge>;

    return (
      <Badge 
        variant={statusOption.variant}
        className={statusOption.value === "completed" ? "bg-success text-success-foreground" : ""}
      >
        {statusOption.label}
      </Badge>
    );
  };

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === booking.status) return;
    
    // Show confirmation for critical status changes
    if (newStatus === "cancelled" || newStatus === "cancel_by_client" || newStatus === "confirmed") {
      setPendingStatus(newStatus);
      setShowConfirmDialog(true);
    } else {
      updateStatus(newStatus);
    }
  };

  const updateStatus = async (newStatus: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: newStatus })
        .eq("id", booking.id);

      if (error) throw error;

      let statusMessage = `Booking status updated to ${statusOptions.find(s => s.value === newStatus)?.label}`;
      
      if (newStatus === "confirmed") {
        statusMessage += ". Draft invoice(s) have been automatically created.";
      }

      toast({
        title: "Success",
        description: statusMessage,
      });
      
      onStatusChange();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
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
      case "confirmed":
        return "This will confirm the booking and automatically create draft invoice(s). Are you sure?";
      case "cancelled":
      case "cancel_by_client":
        return "This will cancel the booking. Are you sure?";
      default:
        return "Are you sure you want to change the booking status?";
    }
  };

  // Don't allow status changes for completed bookings unless cancelling
  const canChangeStatus = booking.status !== "completed" || 
    (booking.status === "completed" && (pendingStatus === "cancelled" || pendingStatus === "cancel_by_client"));

  return (
    <div className="flex items-center gap-2">
      {getStatusBadge(booking.status)}
      
      {canChangeStatus && (
        <Select onValueChange={handleStatusChange} value={booking.status}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

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

export default BookingStatusManager;