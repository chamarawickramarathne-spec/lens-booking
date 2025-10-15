import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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

const paymentScheduleSchema = z.object({
  booking_id: z.string().optional(),
  invoice_id: z.string().optional(),
  schedule_type: z.enum(["deposit", "milestone", "final", "custom"]),
  due_date: z.date({
    required_error: "Due date is required",
  }),
  amount: z.string().min(1, "Amount is required"),
  notes: z.string().optional(),
}).refine((data) => data.booking_id || data.invoice_id, {
  message: "Either a booking or invoice must be selected",
  path: ["invoice_id"],
});

type PaymentScheduleFormData = z.infer<typeof paymentScheduleSchema>;

interface PaymentScheduleFormProps {
  onSuccess: () => void;
  trigger: React.ReactNode;
}

const PaymentScheduleForm = ({ onSuccess, trigger }: PaymentScheduleFormProps) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<PaymentScheduleFormData>({
    resolver: zodResolver(paymentScheduleSchema),
    defaultValues: {
      booking_id: "",
      invoice_id: "",
      schedule_type: "custom",
      amount: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (open && user) {
      fetchBookingsAndInvoices();
    }
  }, [open, user]);

  const fetchBookingsAndInvoices = async () => {
    if (!user) return;
    
    try {
      // Fetch bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select(`
          id, 
          title,
          clients (name)
        `)
        .eq("photographer_id", user.id)
        .order("booking_date", { ascending: false });

      if (bookingsError) throw bookingsError;
      setBookings(bookingsData || []);

      // Fetch invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from("invoices")
        .select(`
          id, 
          invoice_number,
          clients (name)
        `)
        .eq("photographer_id", user.id)
        .order("created_at", { ascending: false });

      if (invoicesError) throw invoicesError;
      setInvoices(invoicesData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: PaymentScheduleFormData) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const bookingId = data.booking_id === "none" ? null : data.booking_id || null;
      const invoiceId = data.invoice_id === "none" ? null : data.invoice_id || null;

      // Check if payment schedule already exists for this invoice
      if (invoiceId) {
        const { data: existing, error: checkError } = await supabase
          .from("payment_schedules")
          .select("id")
          .eq("invoice_id", invoiceId)
          .maybeSingle();

        if (checkError) throw checkError;
        
        if (existing) {
          toast({
            title: "Error",
            description: "A payment schedule already exists for this invoice.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      }

      // Generate payment name based on type and reference
      let paymentName = data.schedule_type.charAt(0).toUpperCase() + data.schedule_type.slice(1) + " Payment";
      if (bookingId) {
        const booking = bookings.find(b => b.id === bookingId);
        paymentName = `${paymentName} - ${booking?.title || 'Booking'}`;
      } else if (invoiceId) {
        const invoice = invoices.find(i => i.id === invoiceId);
        paymentName = `${paymentName} - Invoice ${invoice?.invoice_number || ''}`;
      }

      const scheduleData = {
        payment_name: paymentName,
        schedule_type: data.schedule_type,
        due_date: format(data.due_date, "yyyy-MM-dd"),
        amount: parseFloat(data.amount),
        booking_id: bookingId,
        invoice_id: invoiceId,
        notes: data.notes || null,
        photographer_id: user.id,
        status: "pending",
      };

      const { error } = await supabase
        .from("payment_schedules")
        .insert(scheduleData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment schedule created successfully!",
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
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Payment Schedule</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="booking_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Related Booking</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a booking" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No booking</SelectItem>
                      {bookings.map((booking) => (
                        <SelectItem key={booking.id} value={booking.id}>
                          {booking.title} - {booking.clients?.name}
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
              name="invoice_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Related Invoice</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an invoice" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No invoice</SelectItem>
                      {invoices.map((invoice) => (
                        <SelectItem key={invoice.id} value={invoice.id}>
                          Invoice #{invoice.invoice_number} - {invoice.clients?.name}
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
              name="schedule_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Schedule Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="deposit">Deposit</SelectItem>
                      <SelectItem value="milestone">Milestone</SelectItem>
                      <SelectItem value="final">Final Payment</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date</FormLabel>
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
                        onSelect={field.onChange}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional notes about this payment" {...field} />
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
                {isLoading ? "Creating..." : "Create Schedule"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentScheduleForm;