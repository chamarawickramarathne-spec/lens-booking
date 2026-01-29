import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Package,
  User,
  Mail,
  Phone,
  FileText,
  Check,
  CreditCard,
} from "lucide-react";
import { format } from "date-fns";
import { useCurrency } from "@/hooks/useCurrency";
import { useEffect, useState } from "react";
import { apiClient } from "@/integrations/api/client";

interface ViewBookingDetailsProps {
  booking: any;
  isOpen: boolean;
  onClose: () => void;
}

const ViewBookingDetails = ({
  booking,
  isOpen,
  onClose,
}: ViewBookingDetailsProps) => {
  const { currency, formatCurrency } = useCurrency();
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  useEffect(() => {
    if (isOpen && booking?.id) {
      loadPayments();
    }
  }, [isOpen, booking?.id]);

  const loadPayments = async () => {
    setLoadingPayments(true);
    try {
      // First get the payment schedule for this booking
      const paymentsRes = await apiClient.getPayments();
      const schedules = paymentsRes?.data ?? [];

      // Filter schedules for this booking
      const bookingSchedules = schedules.filter(
        (s: any) => s.booking_id === booking.id,
      );

      // Fetch all installments for these schedules
      const allInstallments: any[] = [];
      for (const schedule of bookingSchedules) {
        const installmentsRes = await apiClient.getPaymentInstallments(
          schedule.id,
        );
        allInstallments.push(...(installmentsRes?.data ?? []));
      }

      setPayments(allInstallments);
    } catch (error) {
      console.error("Failed to load payments:", error);
    } finally {
      setLoadingPayments(false);
    }
  };

  if (!booking) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "pending":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "shoot_completed":
        return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "completed":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "cancelled":
      case "cancel_by_client":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "confirmed":
        return "Confirmed";
      case "shoot_completed":
        return "Shoot Completed";
      case "completed":
        return "Completed and Photos Delivered";
      case "cancelled":
        return "Cancelled";
      case "cancel_by_client":
        return "Cancel by Client";
      default:
        return status;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Booking Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header: Title + Status + Meta */}
          <div className="rounded-lg border bg-background p-5">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-semibold truncate">
                  {booking.title}
                </h3>
                <div className="mt-1 text-sm text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                  {booking.package_type && (
                    <div className="flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      <span className="font-medium">Event:</span>
                      <span>{booking.package_type}</span>
                    </div>
                  )}
                  {booking.package_name && (
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Package:</span>
                      <span>{booking.package_name}</span>
                    </div>
                  )}
                </div>
                <div className="mt-1 text-xs md:text-sm text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                  {booking.pre_shoot && (
                    <div>
                      <span className="font-medium">Pre-shoot:</span>{" "}
                      {booking.pre_shoot}
                    </div>
                  )}
                  {booking.album && (
                    <div>
                      <span className="font-medium">Album:</span>{" "}
                      {booking.album}
                    </div>
                  )}
                </div>
              </div>
              <Badge
                className={getStatusColor(booking.status)}
                variant="outline"
              >
                {getStatusLabel(booking.status)}
              </Badge>
            </div>
          </div>

          {/* Main grid: left content + right pricing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Left column (spans 2) */}
            <div className="md:col-span-2 space-y-4">
              {/* Client Information */}
              <div className="rounded-lg border bg-background p-4 space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" /> Client Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Name</div>
                      <div className="font-medium">
                        {booking.client_name || "N/A"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">Email</div>
                      <div className="truncate">
                        {booking.client_email || "N/A"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Phone</div>
                      <div>{booking.client_phone || "-"}</div>
                    </div>
                  </div>
                </div>

                {(booking.second_contact || booking.second_phone) && (
                  <div className="pt-2 border-t grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    {booking.second_contact && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-xs text-muted-foreground">
                            Secondary Contact
                          </div>
                          <div className="font-medium">
                            {booking.second_contact}
                          </div>
                        </div>
                      </div>
                    )}
                    {booking.second_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-xs text-muted-foreground">
                            Secondary Phone
                          </div>
                          <div>{booking.second_phone}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Event schedule & locations (Wedding) or Date/Time/Location */}
              {String(booking.package_type).toLowerCase() === "wedding" ? (
                <div className="rounded-lg border bg-background p-4 space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Event Schedule & Locations
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">
                        Wedding Date
                      </div>
                      <div className="font-medium">
                        {booking.wedding_date
                          ? format(
                              new Date(booking.wedding_date),
                              "MMMM dd, yyyy",
                            )
                          : "-"}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">
                        Wedding Hotel
                      </div>
                      <div className="font-medium">
                        {booking.wedding_hotel_name || "-"}
                      </div>
                    </div>

                    <div className="md:col-span-2 my-1 border-t" />

                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">
                        Homecoming Date
                      </div>
                      <div className="font-medium">
                        {booking.homecoming_date
                          ? format(
                              new Date(booking.homecoming_date),
                              "MMMM dd, yyyy",
                            )
                          : "-"}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">
                        Homecoming Hotel
                      </div>
                      <div className="font-medium">
                        {booking.homecoming_hotel_name || "-"}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border bg-background p-4 space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Event Schedule & Locations
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">
                        Date
                      </div>
                      <div className="font-medium">
                        {booking.booking_date
                          ? format(
                              new Date(booking.booking_date),
                              "MMMM dd, yyyy",
                            )
                          : "-"}
                      </div>
                    </div>
                    {(booking.start_time || booking.end_time) && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">
                          Time
                        </div>
                        <div className="font-medium">
                          {booking.start_time && booking.end_time
                            ? `${booking.start_time} - ${booking.end_time}`
                            : booking.start_time || booking.end_time}
                        </div>
                      </div>
                    )}
                    {booking.location && (
                      <div className="space-y-1 md:col-span-2">
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">
                          Location
                        </div>
                        <div className="font-medium flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {booking.location}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Album & Product selections */}
              <div className="rounded-lg border bg-background p-4 space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4" /> Album & Product Selections
                </h4>

                {(booking.wedding_album ||
                  booking.pre_shoot_album ||
                  booking.family_album) && (
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      Included Albums:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {booking.wedding_album && (
                        <Badge variant="secondary" className="gap-1">
                          <Check className="h-3 w-3" /> Wedding Album
                        </Badge>
                      )}
                      {booking.pre_shoot_album && (
                        <Badge variant="secondary" className="gap-1">
                          <Check className="h-3 w-3" /> Pre-shoot Album
                        </Badge>
                      )}
                      {booking.family_album && (
                        <Badge variant="secondary" className="gap-1">
                          <Check className="h-3 w-3" /> Family Album
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Selected Photo Sizes:
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {booking.group_photo_size && (
                      <Badge variant="outline">
                        Group {booking.group_photo_size}
                      </Badge>
                    )}
                    {booking.homecoming_photo_size && (
                      <Badge variant="outline">
                        Homecoming {booking.homecoming_photo_size}
                      </Badge>
                    )}
                    {String(booking.wedding_photo_sizes || "")
                      .split(",")
                      .map((s: string) => s.trim())
                      .filter(Boolean)
                      .map((size: string) => (
                        <Badge key={size} variant="outline">
                          Wedding Photo {size}
                        </Badge>
                      ))}
                  </div>
                </div>

                {booking.extra_thank_you_cards_qty &&
                  Number(booking.extra_thank_you_cards_qty) > 0 && (
                    <div className="pt-2 border-t text-sm">
                      <div className="text-muted-foreground">Extra Items:</div>
                      <div>
                        Extra Thank You Cards:{" "}
                        {booking.extra_thank_you_cards_qty}
                      </div>
                    </div>
                  )}
              </div>

              {/* Description (optional) */}
              {booking.description && (
                <div className="rounded-lg border bg-background p-4 space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Description
                  </h4>
                  <p className="text-sm whitespace-pre-wrap">
                    {booking.description}
                  </p>
                </div>
              )}
            </div>

            {/* Right column (pricing summary) */}
            <div className="md:col-span-1">
              <div className="rounded-lg border bg-background p-4 space-y-4 sticky md:top-4">
                <h4 className="font-semibold flex items-center gap-2">
                  Pricing Summary
                </h4>
                <div className="space-y-3 text-sm">
                  {booking.deposit_amount != null &&
                    booking.deposit_amount !== "" && (
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-muted-foreground">
                          Deposit Amount
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">
                            {currency}
                          </div>
                          <div className="font-medium">
                            {formatCurrency(booking.deposit_amount)}
                          </div>
                        </div>
                      </div>
                    )}
                  <div className="border-t pt-3 flex items-start justify-between gap-2">
                    <div className="font-semibold">Total Amount</div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">
                        {currency}
                      </div>
                      <div className="font-semibold text-lg">
                        {formatCurrency(booking.total_amount || 0)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  All prices are final as of booking date.
                </div>

                {/* Payments Section */}
                <div className="mt-6 pt-4 border-t space-y-2">
                  {loadingPayments ? (
                    <div className="text-xs text-muted-foreground">
                      Loading payments...
                    </div>
                  ) : payments.length === 0 ? (
                    <div className="text-xs text-muted-foreground">
                      No payments recorded
                    </div>
                  ) : (
                    <>
                      {payments.map((payment, idx) => (
                        <div
                          key={payment.id ?? idx}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-muted-foreground">
                            Payment on{" "}
                            {format(
                              new Date(payment.paid_date),
                              "MMM dd, yyyy",
                            )}
                          </span>
                          <span className="font-medium">
                            {formatCurrency(payment.amount)}
                          </span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between text-sm pt-2 border-t">
                        <span className="font-semibold">Amount Due</span>
                        <span className="font-semibold">
                          {formatCurrency(
                            Math.max(
                              0,
                              Number(booking.total_amount ?? 0) -
                                payments.reduce(
                                  (sum, p) => sum + Number(p.amount ?? 0),
                                  0,
                                ),
                            ),
                          )}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Timestamps */}
              <div className="mt-4 text-xs text-muted-foreground">
                <div>
                  Created: {format(new Date(booking.created_at), "PPpp")}
                </div>
                <div>
                  Last Updated: {format(new Date(booking.updated_at), "PPpp")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewBookingDetails;
