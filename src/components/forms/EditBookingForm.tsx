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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

const editBookingSchema = z.object({
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
  // Wedding-specific fields (optional; enforced by UI when Wedding selected)
  wedding_hotel_name: z.string().optional(),
  wedding_date: z.date().optional(),
  homecoming_hotel_name: z.string().optional(),
  homecoming_date: z.date().optional(),
  wedding_album: z.boolean().optional(),
  pre_shoot_album: z.boolean().optional(),
  family_album: z.boolean().optional(),
  group_photo_size: z.string().optional(),
  homecoming_photo_size: z.string().optional(),
  wedding_photo_sizes: z.array(z.string()).optional(),
  extra_thank_you_cards_qty: z.union([z.string(), z.number()]).optional(),
});

type EditBookingFormData = z.infer<typeof editBookingSchema>;

interface EditBookingFormProps {
  booking: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EditBookingForm = ({
  booking,
  isOpen,
  onClose,
  onSuccess,
}: EditBookingFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<EditBookingFormData>({
    resolver: zodResolver(editBookingSchema),
    defaultValues: {
      title: "",
      description: "",
      client_id: "",
      booking_date: undefined as any,
      start_time: "",
      end_time: "",
      location: "",
      package_type: "Birthday",
      package_name: "",
      pre_shoot: "Photography",
      album: "No",
      total_amount: "",
      deposit_amount: "",
      // wedding defaults
      wedding_hotel_name: "",
      wedding_date: undefined as any,
      homecoming_hotel_name: "",
      homecoming_date: undefined as any,
      wedding_album: false,
      pre_shoot_album: false,
      family_album: false,
      group_photo_size: "",
      homecoming_photo_size: "",
      wedding_photo_sizes: [],
      extra_thank_you_cards_qty: "",
    },
  });

  const watchPackageType = form.watch("package_type");
  const watchWeddingDate = form.watch("wedding_date");

  useEffect(() => {
    if (watchPackageType === "Wedding" && watchWeddingDate) {
      // Sync booking_date with wedding_date for backend compatibility
      form.setValue("booking_date", watchWeddingDate as any, {
        shouldValidate: true,
      });
    }
  }, [watchPackageType, watchWeddingDate]);

  useEffect(() => {
    if (isOpen && user) {
      fetchClients();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (booking && isOpen) {
      form.reset({
        title: booking.title || "",
        description: booking.description || "",
        client_id: booking.client_id ? String(booking.client_id) : "",
        booking_date: booking.booking_date
          ? new Date(booking.booking_date)
          : (undefined as any),
        start_time: booking.start_time || "",
        end_time: booking.end_time || "",
        location: booking.location || "",
        package_type: booking.package_type || "Birthday",
        package_name: booking.package_name || "",
        pre_shoot: booking.pre_shoot || "Photography",
        album: booking.album || "No",
        total_amount: booking.total_amount?.toString() || "",
        deposit_amount: booking.deposit_amount?.toString() || "",
        // wedding fields
        wedding_hotel_name: booking.wedding_hotel_name || "",
        wedding_date: booking.wedding_date
          ? new Date(booking.wedding_date)
          : (undefined as any),
        homecoming_hotel_name: booking.homecoming_hotel_name || "",
        homecoming_date: booking.homecoming_date
          ? new Date(booking.homecoming_date)
          : (undefined as any),
        wedding_album: !!booking.wedding_album,
        pre_shoot_album: !!booking.pre_shoot_album,
        family_album: !!booking.family_album,
        group_photo_size: booking.group_photo_size || "",
        homecoming_photo_size: booking.homecoming_photo_size || "",
        wedding_photo_sizes: booking.wedding_photo_sizes
          ? String(booking.wedding_photo_sizes)
              .split(",")
              .filter((s: string) => s && s.trim().length > 0)
          : [],
        extra_thank_you_cards_qty:
          booking.extra_thank_you_cards_qty != null
            ? String(booking.extra_thank_you_cards_qty)
            : "",
      });
    }
  }, [booking, isOpen, form]);

  const fetchClients = async () => {
    if (!user) return;

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

  const onSubmit = async (data: EditBookingFormData) => {
    if (!user || !booking) return;

    setIsLoading(true);
    try {
      const isWedding = data.package_type === "Wedding";
      const bookingData: any = {
        title: data.title,
        description: data.description || null,
        client_id: parseInt(data.client_id, 10),
        booking_date: format(
          (isWedding && data.wedding_date
            ? (data.wedding_date as Date)
            : data.booking_date) as Date,
          "yyyy-MM-dd"
        ),
        start_time: data.start_time || null,
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
      };

      if (isWedding) {
        bookingData.wedding_hotel_name = data.wedding_hotel_name || null;
        bookingData.wedding_date = data.wedding_date
          ? format(data.wedding_date as Date, "yyyy-MM-dd")
          : null;
        bookingData.homecoming_hotel_name = data.homecoming_hotel_name || null;
        bookingData.homecoming_date = data.homecoming_date
          ? format(data.homecoming_date as Date, "yyyy-MM-dd")
          : null;
        bookingData.wedding_album = !!data.wedding_album;
        bookingData.pre_shoot_album = !!data.pre_shoot_album;
        bookingData.family_album = !!data.family_album;
        bookingData.group_photo_size = data.group_photo_size || null;
        bookingData.homecoming_photo_size = data.homecoming_photo_size || null;
        bookingData.wedding_photo_sizes = (data.wedding_photo_sizes || []).join(
          ","
        );
        bookingData.extra_thank_you_cards_qty = data.extra_thank_you_cards_qty
          ? Number(data.extra_thank_you_cards_qty as any)
          : 0;
      }

      await apiClient.updateBooking(booking.id, bookingData);

      toast({
        title: "Success",
        description: "Booking updated successfully!",
      });

      onClose();
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Booking</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title and Job ID</FormLabel>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                name="package_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      defaultValue="Birthday"
                    >
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
            </div>

            {/* Wedding-specific section when Wedding selected */}
            {watchPackageType === "Wedding" && (
              <div className="space-y-4 border rounded-md p-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <FormField
                    control={form.control}
                    name="wedding_hotel_name"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel>Wedding Hotel Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Wedding hotel" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="wedding_date"
                    render={({ field }) => {
                      const [isCal, setIsCal] = useState(false);
                      return (
                        <FormItem className="flex flex-col min-w-0">
                          <FormLabel>Wedding Date</FormLabel>
                          <Popover open={isCal} onOpenChange={setIsCal}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full h-10 pl-3 text-left font-normal",
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
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={(date) => {
                                  field.onChange(date);
                                  setIsCal(false);
                                }}
                                disabled={(date) => date < new Date()}
                                initialFocus
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <FormField
                    control={form.control}
                    name="homecoming_hotel_name"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel>Homecoming Hotel Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Homecoming hotel" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="homecoming_date"
                    render={({ field }) => {
                      const [isCal2, setIsCal2] = useState(false);
                      return (
                        <FormItem className="flex flex-col min-w-0">
                          <FormLabel>Homecoming Date</FormLabel>
                          <Popover open={isCal2} onOpenChange={setIsCal2}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full h-10 pl-3 text-left font-normal",
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
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={(date) => {
                                  field.onChange(date);
                                  setIsCal2(false);
                                }}
                                disabled={(date) => date < new Date()}
                                initialFocus
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="wedding_album"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                        <Checkbox
                          checked={!!field.value}
                          onCheckedChange={(v) => field.onChange(!!v)}
                        />
                        <div className="space-y-1 leading-none">
                          <FormLabel>Wedding Album</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pre_shoot_album"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                        <Checkbox
                          checked={!!field.value}
                          onCheckedChange={(v) => field.onChange(!!v)}
                        />
                        <div className="space-y-1 leading-none">
                          <FormLabel>Pre-shoot Album</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="family_album"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                        <Checkbox
                          checked={!!field.value}
                          onCheckedChange={(v) => field.onChange(!!v)}
                        />
                        <div className="space-y-1 leading-none">
                          <FormLabel>Family Album</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="group_photo_size"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Group Photo Size</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select size" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="8x12">8x12</SelectItem>
                            <SelectItem value="10x15">10x15</SelectItem>
                            <SelectItem value="12x18">12x18</SelectItem>
                            <SelectItem value="16x20">16x20</SelectItem>
                            <SelectItem value="20x30">20x30</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="homecoming_photo_size"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Homecoming Photo Size</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select size" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="4x6">4x6</SelectItem>
                            <SelectItem value="5x7">5x7</SelectItem>
                            <SelectItem value="6x8">6x8</SelectItem>
                            <SelectItem value="8x12">8x12</SelectItem>
                            <SelectItem value="10x15">10x15</SelectItem>
                            <SelectItem value="12x18">12x18</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Wedding Photo Sizes (choose one or more)</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      "4x6",
                      "5x7",
                      "6x8",
                      "8x12",
                      "10x15",
                      "12x18",
                      "16x20",
                      "20x30",
                    ].map((size) => (
                      <FormField
                        key={size}
                        control={form.control}
                        name="wedding_photo_sizes"
                        render={({ field }) => {
                          const arr = field.value || [];
                          const checked = arr.includes(size);
                          return (
                            <FormItem className="flex flex-row items-center space-x-2">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => {
                                  const next = new Set(arr);
                                  if (v) next.add(size);
                                  else next.delete(size);
                                  field.onChange(Array.from(next));
                                }}
                              />
                              <Label className="font-normal">{size}</Label>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="extra_thank_you_cards_qty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Extra Thank You Cards Qty</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Non-Wedding basic details */}
            {watchPackageType !== "Wedding" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <FormField
                    control={form.control}
                    name="booking_date"
                    render={({ field }) => {
                      const [isCalendarOpen, setIsCalendarOpen] =
                        useState(false);

                      return (
                        <FormItem className="flex flex-col min-w-0">
                          <FormLabel>Booking Date</FormLabel>
                          <Popover
                            open={isCalendarOpen}
                            onOpenChange={setIsCalendarOpen}
                          >
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full h-10 pl-3 text-left font-normal",
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
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={(date) => {
                                  field.onChange(date);
                                  setIsCalendarOpen(false);
                                }}
                                disabled={(date) => date < new Date()}
                                initialFocus
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="start_time"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
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
                      <FormItem className="min-w-0">
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    name="album"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Album</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          defaultValue="No"
                        >
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
              </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <FormField
                control={form.control}
                name="pre_shoot"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pre-shoot</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      defaultValue="Photography"
                    >
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
                  <FormLabel>Special Requests / Notes</FormLabel>
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
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Updating..." : "Update Booking"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditBookingForm;
