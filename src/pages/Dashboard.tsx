import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, FileText, CreditCard, Clock } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { format } from "date-fns";

const PendingInvoicesList = () => {
  const [pendingInvoices, setPendingInvoices] = useState<any[]>([]);
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    if (user) {
      fetchPendingInvoices();
    }
  }, [user]);

  const fetchPendingInvoices = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          clients (name)
        `)
        .eq("photographer_id", user.id)
        .in("status", ["draft", "pending"])
        .order("due_date", { ascending: true })
        .limit(5);

      if (error) throw error;
      setPendingInvoices(data || []);
    } catch (error) {
      console.error("Error fetching pending invoices:", error);
    }
  };

  if (pendingInvoices.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No pending invoices
      </div>
    );
  }

  return (
    <>
      {pendingInvoices.map((invoice) => (
        <div key={invoice.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div>
            <p className="font-medium">{invoice.invoice_number}</p>
            <p className="text-sm text-muted-foreground">
              {invoice.clients?.name} • Due: {format(new Date(invoice.due_date), "MMM dd")}
            </p>
          </div>
          <div className="text-right">
            <p className="font-medium">{formatCurrency(invoice.total_amount)}</p>
            <span className={`px-2 py-1 rounded-full text-xs ${
              invoice.status === 'draft' 
                ? 'bg-secondary text-secondary-foreground'
                : 'bg-warning text-warning-foreground'
            }`}>
              {invoice.status}
            </span>
          </div>
        </div>
      ))}
    </>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalBookings: 0,
    activeClients: 0,
    pendingInvoices: 0,
    pendingAmount: 0,
    monthlyRevenue: 0,
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, []);

  const fetchDashboardData = async () => {
    if (!user) return;
    
    try {
      // Fetch bookings
      const { data: bookings } = await supabase
        .from("bookings")
        .select(`
          *,
          clients (name)
        `)
        .eq("photographer_id", user.id);

      // Fetch clients
      const { data: clients } = await supabase
        .from("clients")
        .select("*")
        .eq("photographer_id", user.id);

      // Fetch invoices
      const { data: invoices } = await supabase
        .from("invoices")
        .select("*")
        .eq("photographer_id", user.id);

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const monthlyRevenue = invoices
        ?.filter(invoice => {
          const invoiceDate = new Date(invoice.created_at);
          return invoiceDate.getMonth() === currentMonth && 
                 invoiceDate.getFullYear() === currentYear &&
                 invoice.status === "paid";
        })
        .reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0) || 0;

      const pendingInvoices = invoices?.filter(invoice => invoice.status !== "paid") || [];
      const pendingAmount = pendingInvoices.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0);

      setStats({
        totalBookings: bookings?.length || 0,
        activeClients: clients?.length || 0,
        pendingInvoices: pendingInvoices.length,
        pendingAmount,
        monthlyRevenue,
      });

      // Get recent bookings (last 3)
      const recentBookingsData = bookings
        ?.sort((a, b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime())
        .slice(0, 3) || [];
      
      setRecentBookings(recentBookingsData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="text-center py-8 text-muted-foreground">
            Loading dashboard...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of your photography business.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-card shadow-elegant">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBookings}</div>
              <p className="text-xs text-muted-foreground">
                Total scheduled bookings
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-elegant">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeClients}</div>
              <p className="text-xs text-muted-foreground">
                Registered clients
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-elegant">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingInvoices}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(stats.pendingAmount)} pending
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-elegant">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.monthlyRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                This month's revenue
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Bookings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentBookings.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No recent bookings
                </div>
              ) : (
                recentBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">{booking.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(booking.booking_date), "MMM dd, yyyy")}
                        {booking.start_time && ` • ${booking.start_time}`}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      booking.status === 'confirmed' 
                        ? 'bg-success text-success-foreground'
                        : booking.status === 'pending'
                        ? 'bg-warning text-warning-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Recent Pending Invoices
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <PendingInvoicesList />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;