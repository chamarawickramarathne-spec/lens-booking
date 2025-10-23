import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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

const bookingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  client_id: z.string().min(1, "Client is required"),
  booking_date: z.date({
    required_error: "Booking date is required",
  }),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  location: z.string().optional(),
  package_type: z.string().default("Birthday"),
  package_name: z.string().optional(),
  pre_shoot: z.string().default("Photography"),
  album: z.string().default("No"),
  total_amount: z
    .string()
    .optional()
    .refine((v) => v === undefined || v === "" || !isNaN(Number(v)), {
      message: "Must be a number",
    }),
  deposit_amount: z
    .string()
    .optional()
    .refine((v) => v === undefined || v === "" || !isNaN(Number(v)), {
      message: "Must be a number",
    }),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface BookingFormProps {
  onSuccess: () => void;
  trigger: React.ReactNode;
}

const BookingForm = ({ onSuccess, trigger }: BookingFormProps) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      title: "",
      description: "",
      client_id: "",
      start_time: "",
      end_time: "",
      location: "",
      package_type: "Birthday",
      package_name: "",
      pre_shoot: "Photography",
      album: "No",
      total_amount: "",
      deposit_amount: "",
    },
  });

  useEffect(() => {
    if (open && user) {
      fetchClients();
    }
  }, [open, user]);

  const fetchClients = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to view clients",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiClient.getClients();
      setClients(response.data || []);
    } catch (error: any) {
      console.error("Failed to fetch clients:", error);
      toast({
        title: "Error",
        description: "Failed to load clients",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: BookingFormData) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create a booking",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const bookingData = {
        title: data.title,
        description: data.description || null,
        client_id: parseInt(data.client_id, 10),
        photographer_id: user.id,
        booking_date: format(data.booking_date, "yyyy-MM-dd"),
        booking_time: data.start_time || null,
        end_time: data.end_time || null,
        location: data.location || null,
        package_type: data.package_type || "Birthday",
        package_name: data.package_name || null,
        pre_shoot: data.pre_shoot || "Photography",
        album: data.album || "No",
        total_amount:
          data.total_amount !== "" && data.total_amount != null
            ? parseFloat(data.total_amount)
            : null,
        deposit_amount:
          data.deposit_amount !== "" && data.deposit_amount != null
            ? parseFloat(data.deposit_amount)
            : null,
        status: "pending",
      };

      await apiClient.createBooking(bookingData);

      toast({
        title: "Success",
        description: "Booking created successfully!",
      });

      form.reset();
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Booking</DialogTitle>
        </DialogHeader>
        {!user ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Please log in to create a booking
            </p>
            <Button
              onClick={() => {
                setOpen(false);
                // Redirect to login or show login modal
                window.location.href = "/login";
              }}
            >
              Go to Login
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Wedding Photography Session"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="client_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={String(client.id)}>
                            {client.name} ({client.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="booking_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Booking Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            // Close the popover after selection
                            setTimeout(() => {
                              document.body.click();
                            }, 100);
                          }}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Event location" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="package_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue="Birthday">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select event type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Wedding">Wedding</SelectItem>
                        <SelectItem value="Birthday">Birthday</SelectItem>
                        <SelectItem value="Anniversary">Anniversary</SelectItem>
                        <SelectItem value="Corporate">Corporate</SelectItem>
                        <SelectItem value="Party">Party</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="package_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Wedding Premium, Portrait Basic"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pre_shoot"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pre-shoot</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} defaultValue="Photography">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select pre-shoot type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Photography">Photography</SelectItem>
                          <SelectItem value="Videography">Videography</SelectItem>
                          <SelectItem value="Both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="album"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Album</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} defaultValue="No">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select option" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="total_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deposit_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deposit Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional details about the booking"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create Booking"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BookingForm;
