import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiClient } from "@/integrations/api/client";
import { useCurrency } from "@/hooks/useCurrency";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Info } from "lucide-react";

type DashboardStats = {
  booking_stats?: {
    total_bookings?: number;
    confirmed_bookings?: number;
  };
  client_count?: number;
  recent_bookings?: any[];
  monthly_revenue?: Array<{ month: number; year: number; revenue: number }>; // from API
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({});
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<string>("12"); // months
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [statsRes, invoicesRes, paymentsRes, installmentsRes] =
          await Promise.all([
            apiClient.getDashboardStats(),
            apiClient.getInvoices(),
            apiClient.getPayments(),
            apiClient.getAllInstallments(),
          ]);

        if (!mounted) return;
        setStats(statsRes?.data ?? {});
        setInvoices(invoicesRes?.data ?? []);
        setPayments(paymentsRes?.data ?? []);
        setInstallments(installmentsRes?.data ?? []);
      } catch (e) {
        console.error("Failed to load dashboard data", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const totalBookings = stats.booking_stats?.total_bookings ?? 0;
  const activeClients = stats.client_count ?? 0;

  // Pending invoices: include statuses 'pending', 'draft', and 'sent'
  const pendingInvoices = useMemo(
    () =>
      (invoices || []).filter((inv) => {
        const status = String(inv.status).toLowerCase();
        return status === "pending" || status === "draft" || status === "sent";
      }),
    [invoices],
  );

  const pendingInvoicesAmount = useMemo(
    () =>
      pendingInvoices.reduce(
        (sum, inv) => sum + Number(inv.total_amount ?? inv.amount ?? 0),
        0,
      ),
    [pendingInvoices],
  );

  // Current month revenue: calculate from installments paid this month
  const monthlyRevenue = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    const paidThisMonth = (installments || []).filter((installment) => {
      const dStr = installment.paid_date;
      if (!dStr || dStr === "0000-00-00") return false;
      const d = new Date(dStr);
      return d.getFullYear() === y && d.getMonth() === m;
    });

    return paidThisMonth.reduce(
      (sum, installment) => sum + Number(installment.amount ?? 0),
      0,
    );
  }, [installments]);

  // Revenue chart data based on selected time range
  const revenueChartData = useMemo(() => {
    const months = parseInt(timeRange);
    const now = new Date();
    const data = [];

    for (let i = months - 1; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const revenue = (installments || [])
        .filter((installment) => {
          const dStr = installment.paid_date;
          if (!dStr || dStr === "0000-00-00") return false;
          const d = new Date(dStr);
          return d >= monthStart && d <= monthEnd;
        })
        .reduce((sum, installment) => sum + Number(installment.amount ?? 0), 0);

      data.push({
        month: format(monthDate, "MMM yyyy"),
        monthShort: format(monthDate, "MMM"),
        revenue: revenue,
      });
    }

    return data;
  }, [installments, timeRange]);

  // Total revenue for selected period
  const totalRevenue = useMemo(() => {
    return revenueChartData.reduce((sum, item) => sum + item.revenue, 0);
  }, [revenueChartData]);

  // Helpers
  const isActiveBooking = (b: any) =>
    !["completed", "cancelled", "cancel_by_client"].includes(
      String(b.status || "").toLowerCase(),
    );

  const parseDateSafe = (d?: string) => {
    if (!d || d === "0000-00-00") return 0;
    const t = new Date(d).getTime();
    return isNaN(t) ? 0 : t;
  };

  const getStatusLabel = (status: string) => {
    const statusLower = String(status || "").toLowerCase();
    if (statusLower === "completed") return "Completed & Delivered";
    if (statusLower === "shoot_completed") return "Shoot Completed";
    if (statusLower === "cancel_by_client") return "Cancelled by Client";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // 1 & 2) Recent bookings: show recent 10; active first; order by booking date (newest first)
  const recentBookings = useMemo(() => {
    const arr = [...(stats.recent_bookings ?? [])];
    arr.sort((a, b) => {
      const aA = isActiveBooking(a) ? 1 : 0;
      const bA = isActiveBooking(b) ? 1 : 0;
      if (bA !== aA) return bA - aA; // active first
      // booking_date descending (recent first)
      return parseDateSafe(b.booking_date) - parseDateSafe(a.booking_date);
    });
    return arr.slice(0, 10);
  }, [stats.recent_bookings]);

  // 3 & 4) Recent Pending Invoices: order by due date; active (status 'pending') first; limit 10
  const recentPendingInvoices = useMemo(() => {
    const arr = [...pendingInvoices];
    arr.sort((a, b) => {
      const aActive = String(a.status).toLowerCase() === "pending" ? 1 : 0;
      const bActive = String(b.status).toLowerCase() === "pending" ? 1 : 0;
      if (bActive !== aActive) return bActive - aActive; // pending before draft
      // Due date ascending (nearest due first); missing dates last
      const aDue = parseDateSafe(a.due_date);
      const bDue = parseDateSafe(b.due_date);
      if (aDue === 0 && bDue === 0) return 0;
      if (aDue === 0) return 1;
      if (bDue === 0) return -1;
      return aDue - bDue;
    });
    return arr.slice(0, 10);
  }, [pendingInvoices]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of your photography business.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Total Bookings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalBookings}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total scheduled bookings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Active Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{activeClients}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Registered clients
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Pending Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{pendingInvoices.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(pendingInvoicesAmount)} pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Monthly Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatCurrency(monthlyRevenue)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                This month's revenue
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Payments</CardTitle>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Last 3 months</SelectItem>
                <SelectItem value="6">Last 6 months</SelectItem>
                <SelectItem value="12">Last 12 months</SelectItem>
                <SelectItem value="24">Last 24 months</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Total revenue
                </span>
                <Info className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-3xl font-bold">
                {formatCurrency(totalRevenue)}
              </div>
              <div className="h-[300px] w-full">
                {revenueChartData.length === 0 || totalRevenue === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No payments yet</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={revenueChartData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-muted"
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
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))", r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Bookings */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Bookings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentBookings.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No recent bookings
                </p>
              )}
              {recentBookings.map((b, idx) => (
                <div
                  key={b.id ?? idx}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {b.title || b.package_name || "Untitled booking"} -{" "}
                      {b.location || b.client_name || ""}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {b.booking_date ? (
                        <>
                          {format(new Date(b.booking_date), "PPP")}{" "}
                          {b.start_time ? `• ${b.start_time}` : ""}
                        </>
                      ) : (
                        ""
                      )}
                    </div>
                  </div>
                  <Badge
                    className={
                      String(b.status).toLowerCase() === "confirmed" ||
                      String(b.status).toLowerCase() === "shoot_completed"
                        ? "bg-green-600 text-white"
                        : String(b.status).toLowerCase() === "cancelled" ||
                            String(b.status).toLowerCase() ===
                              "cancel_by_client"
                          ? "bg-red-600 text-white"
                          : String(b.status).toLowerCase() === "completed"
                            ? "bg-blue-600 text-white"
                            : ""
                    }
                  >
                    {getStatusLabel(b.status)}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Pending Invoices */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Pending Invoices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentPendingInvoices.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No pending invoices
                </p>
              )}
              {recentPendingInvoices.map((inv, idx) => (
                <div key={inv.id ?? idx} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      {inv.invoice_number || `INV-${inv.id}`}
                    </div>
                    <div className="text-sm font-semibold">
                      {formatCurrency(inv.total_amount ?? inv.amount ?? 0)}
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground flex items-center justify-between">
                    <div>
                      {(inv.clients?.name || inv.client_name) ?? "Unknown"} •{" "}
                      {inv.due_date && inv.due_date !== "0000-00-00" ? (
                        <>Due: {format(new Date(inv.due_date), "MMM dd")}</>
                      ) : (
                        "No due date"
                      )}
                    </div>
                    <div className="text-xs">
                      {String(inv.status).toLowerCase()}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {loading && (
          <>
            <Separator className="my-2" />
            <p className="text-sm text-muted-foreground">
              Loading dashboard...
            </p>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
