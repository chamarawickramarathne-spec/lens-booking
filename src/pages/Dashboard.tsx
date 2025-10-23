import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiClient } from "@/integrations/api/client";
import { useCurrency } from "@/hooks/useCurrency";
import { format } from "date-fns";

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
  const [loading, setLoading] = useState(true);
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [statsRes, invoicesRes] = await Promise.all([
          apiClient.getDashboardStats(),
          apiClient.getInvoices(),
        ]);

        if (!mounted) return;
        setStats(statsRes?.data ?? {});
        setInvoices(invoicesRes?.data ?? []);
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

  // Pending invoices: include statuses 'pending' and 'draft'
  const pendingInvoices = useMemo(
    () =>
      (invoices || []).filter(
        (inv) =>
          String(inv.status).toLowerCase() === "pending" ||
          String(inv.status).toLowerCase() === "draft"
      ),
    [invoices]
  );

  const pendingInvoicesAmount = useMemo(
    () =>
      pendingInvoices.reduce(
        (sum, inv) => sum + Number(inv.total_amount ?? inv.amount ?? 0),
        0
      ),
    [pendingInvoices]
  );

  // Current month revenue: prefer paid invoices payment_date within current month
  const monthlyRevenue = useMemo(() => {
    // Try derive from invoices marked paid within this month
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const paidThisMonth = (invoices || []).filter((inv) => {
      if (String(inv.status).toLowerCase() !== "paid") return false;
      const dStr = inv.payment_date || inv.updated_at || inv.issue_date;
      if (!dStr || dStr === "0000-00-00") return false;
      const d = new Date(dStr);
      return d.getFullYear() === y && d.getMonth() === m;
    });
    let total = paidThisMonth.reduce(
      (sum, inv) => sum + Number(inv.total_amount ?? inv.amount ?? 0),
      0
    );
    // Fallback to API monthly_revenue if no paid invoices were found
    if (total === 0 && stats.monthly_revenue && stats.monthly_revenue.length) {
      const apiMatch = stats.monthly_revenue.find(
        (r) => r.year === y && r.month - 1 === m // API likely 1-based month
      );
      if (apiMatch) total = Number(apiMatch.revenue ?? 0);
    }
    return total;
  }, [invoices, stats.monthly_revenue]);

  // Helpers
  const isActiveBooking = (b: any) =>
    !["completed", "cancelled", "cancel_by_client"].includes(
      String(b.status || "").toLowerCase()
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
                          String(b.status).toLowerCase() === "cancel_by_client"
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
