import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, DollarSign, Package, User, Mail, FileText } from "lucide-react";
import { format } from "date-fns";
import { useCurrency } from "@/hooks/useCurrency";

interface ViewBookingDetailsProps {
  booking: any;
  isOpen: boolean;
  onClose: () => void;
}

const ViewBookingDetails = ({ booking, isOpen, onClose }: ViewBookingDetailsProps) => {
  const { formatCurrency } = useCurrency();
  
  if (!booking) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "pending":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "completed":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "cancelled":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Booking Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Title and Status */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold">{booking.title}</h3>
              {booking.package_type && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Package className="h-4 w-4" />
                  {booking.package_type}
                </div>
              )}
            </div>
            <Badge className={getStatusColor(booking.status)} variant="outline">
              {booking.status}
            </Badge>
          </div>

          {/* Client Information */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Client Information
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">Name:</span>
                <span>{booking.clients?.name || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{booking.clients?.email || "N/A"}</span>
              </div>
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date
              </h4>
              <p className="text-sm">
                {format(new Date(booking.booking_date), "MMMM dd, yyyy")}
              </p>
            </div>

            {(booking.start_time || booking.end_time) && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time
                </h4>
                <p className="text-sm">
                  {booking.start_time && booking.end_time
                    ? `${booking.start_time} - ${booking.end_time}`
                    : booking.start_time || booking.end_time}
                </p>
              </div>
            )}
          </div>

          {/* Location */}
          {booking.location && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </h4>
              <p className="text-sm">{booking.location}</p>
            </div>
          )}

          {/* Pricing */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Pricing
            </h4>
            <div className="space-y-2 text-sm">
              {booking.deposit_amount && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deposit Amount:</span>
                  <span className="font-medium">{formatCurrency(booking.deposit_amount)}</span>
                </div>
              )}
              {booking.total_amount && (
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">Total Amount:</span>
                  <span className="font-semibold text-lg">{formatCurrency(booking.total_amount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {booking.description && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Description
              </h4>
              <p className="text-sm whitespace-pre-wrap">{booking.description}</p>
            </div>
          )}

          {/* Timestamps */}
          <div className="text-xs text-muted-foreground border-t pt-4 space-y-1">
            <div>Created: {format(new Date(booking.created_at), "PPpp")}</div>
            <div>Last Updated: {format(new Date(booking.updated_at), "PPpp")}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewBookingDetails;
