import { useState, useEffect, useMemo, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import {
  BarChart3,
  Info,
  ChevronRight,
  Calendar,
  DollarSign,
  CreditCard,
  User,
  Camera
} from "lucide-react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const Reports = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("12");
  const [installments, setInstallments] = useState<
    Array<{
      paid_date?: string;
      amount?: number;
      payment_method?: string;
      client_name?: string;
      booking_title?: string;
      client_id?: string;
    }>
  >([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();

  const fetchReportsData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const installmentsResponse = await apiClient.getAllInstallments();
      const installmentsData = installmentsResponse?.data || [];
      setInstallments(installmentsData);
    } catch (error) {
      console.error("Error fetching reports data:", error);
      toast({
        title: "Error",
        description: "Failed to load reports data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchReportsData();
    }
  }, [user, fetchReportsData]);

  const revenueChartData = useMemo(() => {
    const monthsToShow = parseInt(timeRange);
    const now = new Date();
    const data = [];

    // Helper to parse YYYY-MM-DD as a local date to avoid timezone shifts
    const parseDateLocal = (dStr: string) => {
      const [y, m, d] = dStr.split("-").map(Number);
      return new Date(y, m - 1, d);
    };

    if (timeRange === "0") {
      const monthDate = now;
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const revenue = (installments || [])
        .filter((installment) => {
          const dStr = installment.paid_date;
          if (!dStr || dStr === "0000-00-00") return false;
          const d = parseDateLocal(dStr);
          return d >= monthStart && d <= monthEnd;
        })
        .reduce((sum, installment) => sum + Number(installment.amount ?? 0), 0);

      data.push({
        month: format(monthDate, "MMM yyyy"),
        monthShort: format(monthDate, "MMM"),
        revenue: revenue,
      });
    } else if (timeRange === "1") {
      const monthDate = subMonths(now, 1);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const revenue = (installments || [])
        .filter((installment) => {
          const dStr = installment.paid_date;
          if (!dStr || dStr === "0000-00-00") return false;
          const d = parseDateLocal(dStr);
          return d >= monthStart && d <= monthEnd;
        })
        .reduce((sum, installment) => sum + Number(installment.amount ?? 0), 0);

      data.push({
        month: format(monthDate, "MMM yyyy"),
        monthShort: format(monthDate, "MMM"),
        revenue: revenue,
      });
    } else {
      for (let i = monthsToShow - 1; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);

        const revenue = (installments || [])
          .filter((installment) => {
            const dStr = installment.paid_date;
            if (!dStr || dStr === "0000-00-00") return false;
            const d = parseDateLocal(dStr);
            return d >= monthStart && d <= monthEnd;
          })
          .reduce(
            (sum, installment) => sum + Number(installment.amount ?? 0),
            0,
          );

        data.push({
          month: format(monthDate, "MMM yyyy"),
          monthShort: format(monthDate, "MMM"),
          revenue: revenue,
        });
      }
    }

    return data;
  }, [installments, timeRange]);

  const overallTotalRevenue = useMemo(() => {
    return (installments || []).reduce(
      (sum, inst) => sum + Number(inst.amount ?? 0),
      0,
    );
  }, [installments]);

  const totalRevenue = useMemo(() => {
    return revenueChartData.reduce((sum, item) => sum + item.revenue, 0);
  }, [revenueChartData]);

  const totalPayments = useMemo(() => {
    return (installments || []).filter((inst) => {
      const dStr = inst.paid_date;
      return dStr && dStr !== "0000-00-00";
    }).length;
  }, [installments]);

  const paymentMethodsData = useMemo(() => {
    const methods: Record<string, number> = {
      cash: 0,
      e_transfer_bank: 0,
      card_pay: 0,
      other: 0,
    };

    const monthsToShow = parseInt(timeRange);
    const now = new Date();
    
    // Determine the start date for the current time range filter
    let rangeStart: Date | null = null;
    if (timeRange === "0") {
      rangeStart = startOfMonth(now);
    } else if (timeRange === "1") {
      rangeStart = startOfMonth(subMonths(now, 1));
    } else if (monthsToShow > 0) {
      rangeStart = startOfMonth(subMonths(now, monthsToShow - 1));
    }

    const parseDateLocal = (dStr: string) => {
      const [y, m, d] = dStr.split("-").map(Number);
      return new Date(y, m - 1, d);
    };

    (installments || []).forEach((inst) => {
      const dStr = inst.paid_date;
      if (dStr && dStr !== "0000-00-00") {
        const d = parseDateLocal(dStr);
        // Only include in breakdown if it's within the selected range (or no range set)
        if (!rangeStart || d >= rangeStart) {
          const method = inst.payment_method || "other";
          if (method in methods) {
            methods[method as keyof typeof methods] += Number(inst.amount ?? 0);
          } else {
            methods.other += Number(inst.amount ?? 0);
          }
        }
      }
    });

    return methods;
  }, [installments, timeRange]);

  const revenueByClient = useMemo(() => {
    const clients: Record<string, {
      name: string;
      total: number;
      bookings: Record<string, {
        title: string;
        total: number;
        payments: Array<{
          amount: number;
          date: string;
          method: string;
        }>
      }>
    }> = {};

    const monthsToShow = parseInt(timeRange);
    const now = new Date();
    
    let rangeStart: Date | null = null;
    if (timeRange === "0") {
      rangeStart = startOfMonth(now);
    } else if (timeRange === "1") {
      rangeStart = startOfMonth(subMonths(now, 1));
    } else if (monthsToShow > 0) {
      rangeStart = startOfMonth(subMonths(now, monthsToShow - 1));
    }

    const parseDateLocal = (dStr: string) => {
      const [y, m, d] = dStr.split("-").map(Number);
      return new Date(y, m - 1, d);
    };

    (installments || []).forEach((inst) => {
      const dStr = inst.paid_date;
      if (dStr && dStr !== "0000-00-00") {
        const d = parseDateLocal(dStr);
        if (!rangeStart || d >= rangeStart) {
          const clientId = inst.client_id || "unknown-" + (inst.client_name || "unnamed");
          const clientName = inst.client_name || "Unknown Client";
          const bookingTitle = inst.booking_title || "Direct Payment / Other";
          const amount = Number(inst.amount ?? 0);

          if (!clients[clientId]) {
            clients[clientId] = { name: clientName, total: 0, bookings: {} };
          }
          
          clients[clientId].total += amount;

          if (!clients[clientId].bookings[bookingTitle]) {
            clients[clientId].bookings[bookingTitle] = { title: bookingTitle, total: 0, payments: [] };
          }

          clients[clientId].bookings[bookingTitle].total += amount;
          clients[clientId].bookings[bookingTitle].payments.push({
            amount: amount,
            date: dStr,
            method: inst.payment_method || "Other"
          });
        }
      }
    });

    return Object.values(clients)
      .sort((a, b) => b.total - a.total)
      .map(client => ({
        ...client,
        bookings: Object.values(client.bookings).sort((a, b) => b.total - a.total)
      }));
  }, [installments, timeRange]);

  const revenueByBooking = useMemo(() => {
    const bookings: Record<string, number> = {};
    const monthsToShow = parseInt(timeRange);
    const now = new Date();
    
    let rangeStart: Date | null = null;
    if (timeRange === "0") {
      rangeStart = startOfMonth(now);
    } else if (timeRange === "1") {
      rangeStart = startOfMonth(subMonths(now, 1));
    } else if (monthsToShow > 0) {
      rangeStart = startOfMonth(subMonths(now, monthsToShow - 1));
    }

    const parseDateLocal = (dStr: string) => {
      const [y, m, d] = dStr.split("-").map(Number);
      return new Date(y, m - 1, d);
    };

    (installments || []).forEach((inst) => {
      const dStr = inst.paid_date;
      if (dStr && dStr !== "0000-00-00") {
        const d = parseDateLocal(dStr);
        if (!rangeStart || d >= rangeStart) {
          const title = inst.booking_title || "Direct Payment / Other";
          bookings[title] = (bookings[title] || 0) + Number(inst.amount ?? 0);
        }
      }
    });

    return Object.entries(bookings)
      .sort((a, b) => b[1] - a[1])
      .map(([title, amount]) => ({ title, amount }));
  }, [installments, timeRange]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading reports...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Reports</h1>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-2xl font-bold">
              Revenue Overview
            </CardTitle>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Current Month</SelectItem>
                <SelectItem value="1">Last Month</SelectItem>
                <SelectItem value="3">Last 3 months</SelectItem>
                <SelectItem value="6">Last 6 months</SelectItem>
                <SelectItem value="12">Last 12 months</SelectItem>
                <SelectItem value="24">Last 24 months</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-8">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground uppercase tracking-wider">
                      Revenue (Period)
                    </span>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-3xl font-bold">
                    {formatCurrency(totalRevenue)}
                  </div>
                </div>
                <div className="h-12 w-px bg-border hidden sm:block"></div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground uppercase tracking-wider">
                      Lifetime Revenue
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-primary">
                    {formatCurrency(overallTotalRevenue)}
                  </div>
                </div>
              </div>
              <div className="h-[300px] w-full">
                {revenueChartData.length === 0 || totalRevenue === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No payments yet</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={revenueChartData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="monthShort"
                        className="text-xs"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis
                        className="text-xs"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(value) => `LKR${value}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                        }}
                        formatter={(value: number) => [
                          formatCurrency(value),
                          "Revenue",
                        ]}
                        labelFormatter={(label, payload) =>
                          payload[0]?.payload?.month || label
                        }
                      />
                      <Bar
                        dataKey="revenue"
                        fill="hsl(var(--primary))"
                        radius={[8, 8, 0, 0]}
                        opacity={0.7}
                      />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))", r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>
              Payment methods breakdown{" "}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({timeRange === "0" ? "Current Month" : timeRange === "1" ? "Last Month" : `Last ${timeRange} Months`})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span className="text-sm">E-Transfer / Bank</span>
                  </div>
                  <span className="font-semibold">
                    {formatCurrency(paymentMethodsData.e_transfer_bank)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                    <span className="text-sm">Cash</span>
                  </div>
                  <span className="font-semibold">
                    {formatCurrency(paymentMethodsData.cash)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-sm">Card Pay</span>
                  </div>
                  <span className="font-semibold">
                    {formatCurrency(paymentMethodsData.card_pay)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                    <span className="text-sm">Other</span>
                  </div>
                  <span className="font-semibold">
                    {formatCurrency(paymentMethodsData.other)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Revenue by Client and Booking Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Revenue by Client (Nested View)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {revenueByClient.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No data for this period</p>
                ) : (
                  <div className="max-h-[600px] overflow-y-auto pr-2">
                    <Accordion type="single" collapsible className="w-full space-y-2">
                      {revenueByClient.map((client, cIdx) => (
                        <AccordionItem 
                          key={`client-${cIdx}`} 
                          value={`client-${cIdx}`}
                          className="border rounded-lg px-2 bg-muted/10 data-[state=open]:bg-muted/20 transition-all"
                        >
                          <AccordionTrigger className="hover:no-underline py-3">
                            <div className="flex justify-between items-center w-full pr-4">
                              <span className="font-semibold text-base">{client.name}</span>
                              <span className="font-bold text-primary">{formatCurrency(client.total)}</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-0 pb-4">
                            <div className="pl-4 border-l-2 border-primary/20 space-y-3 mt-2">
                              <Accordion type="multiple" className="w-full space-y-2">
                                {client.bookings.map((booking, bIdx) => (
                                  <AccordionItem 
                                    key={`booking-${cIdx}-${bIdx}`} 
                                    value={`booking-${cIdx}-${bIdx}`}
                                    className="border-none"
                                  >
                                    <AccordionTrigger className="hover:no-underline py-2 px-3 rounded-md bg-background/50 border border-border/40">
                                      <div className="flex justify-between items-center w-full pr-4 text-sm">
                                        <div className="flex items-center gap-2">
                                          <Camera className="h-3 w-3 text-muted-foreground" />
                                          <span className="font-medium">{booking.title}</span>
                                        </div>
                                        <span className="font-semibold">{formatCurrency(booking.total)}</span>
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2 pb-1">
                                      <div className="pl-6 space-y-2">
                                        {booking.payments.map((payment, pIdx) => (
                                          <div key={pIdx} className="flex justify-between items-center text-xs p-2 rounded bg-muted/30">
                                            <div className="flex flex-col">
                                              <span className="text-muted-foreground">{format(new Date(payment.date), "MMM dd, yyyy")}</span>
                                              <span className="flex items-center gap-1">
                                                <CreditCard className="h-3 w-3" />
                                                {payment.method.replace(/_/g, ' ')}
                                              </span>
                                            </div>
                                            <span className="font-medium text-success">{formatCurrency(payment.amount)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                ))}
                              </Accordion>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Revenue by Booking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {revenueByBooking.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No data for this period</p>
                ) : (
                  <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2">
                    {revenueByBooking.map((booking, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 rounded-md bg-muted/20 border border-border/50">
                        <span className="font-medium truncate mr-4">{booking.title}</span>
                        <span className="font-bold whitespace-nowrap text-primary">{formatCurrency(booking.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
