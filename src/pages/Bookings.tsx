import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Plus,
  MapPin,
  Clock,
  DollarSign,
  Edit,
  Trash2,
  Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { format } from "date-fns";
import BookingForm from "@/components/forms/BookingForm";
import EditBookingForm from "@/components/forms/EditBookingForm";
import BookingStatusManager from "@/components/BookingStatusManager";
import ViewBookingDetails from "@/components/ViewBookingDetails";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Bookings = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [viewingBooking, setViewingBooking] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const response = await apiClient.getBookings();
      setBookings(response.data || []);
    } catch (error: any) {
      console.error("Failed to fetch bookings:", error);
      toast({
        title: "Error",
        description: "Failed to load bookings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditBooking = (booking: any) => {
    setEditingBooking(booking);
    setIsEditDialogOpen(true);
  };

  const handleViewBooking = (booking: any) => {
    setViewingBooking(booking);
    setIsViewDialogOpen(true);
  };

  const handleDeleteBooking = async (bookingId: string) => {
    try {
      await apiClient.deleteBooking(parseInt(bookingId));

      toast({
        title: "Success",
        description: "Booking deleted successfully",
      });

      fetchBookings();
    } catch (error: any) {
      console.error("Failed to delete booking:", error);
      toast({
        title: "Error",
        description: "Failed to delete booking",
        variant: "destructive",
      });
    }
  };

  const canEditOrDelete = (booking: any) => {
    return booking.status !== "completed";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Bookings</h2>
            <p className="text-muted-foreground">
              Manage your photography sessions and events
            </p>
          </div>
          <BookingForm
            onSuccess={fetchBookings}
            trigger={
              <Button className="bg-gradient-primary hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" />
                New Booking
              </Button>
            }
          />
        </div>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              All Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading bookings...
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No bookings scheduled yet. Create your first booking to get
                started!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Package/Event</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {booking.package_name || "Booking"}
                            </div>
                            {booking.location && (
                              <div className="text-sm text-muted-foreground">
                                {booking.location}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {booking.client_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {booking.client_email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              {format(
                                new Date(booking.booking_date),
                                "MMM dd, yyyy"
                              )}
                            </div>
                            {(booking.booking_time || booking.end_time) && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {booking.booking_time && booking.end_time
                                  ? `${booking.booking_time} - ${booking.end_time}`
                                  : booking.booking_time || booking.end_time}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {booking.notes ? (
                            <div className="text-sm max-w-[200px] truncate">
                              {booking.notes}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              No notes
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {booking.total_amount ? (
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-3 w-3" />
                              {formatCurrency(booking.total_amount)}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              No amount
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <BookingStatusManager
                            booking={booking}
                            onStatusChange={fetchBookings}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {booking.status === "confirmed" ||
                            booking.status === "completed" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewBooking(booking)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                            ) : (
                              canEditOrDelete(booking) && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditBooking(booking)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          Delete Booking
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete this
                                          booking? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            handleDeleteBooking(booking.id)
                                          }
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </>
                              )
                            )}
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

        <EditBookingForm
          booking={editingBooking}
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditingBooking(null);
          }}
          onSuccess={fetchBookings}
        />

        <ViewBookingDetails
          booking={viewingBooking}
          isOpen={isViewDialogOpen}
          onClose={() => {
            setIsViewDialogOpen(false);
            setViewingBooking(null);
          }}
        />
      </div>
    </DashboardLayout>
  );
};

export default Bookings;
