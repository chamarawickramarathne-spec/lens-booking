import { useState, useEffect, useMemo, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Info } from "lucide-react";
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
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
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

    if (timeRange === "0") {
      const monthDate = now;
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
    } else if (timeRange === "1") {
      const monthDate = subMonths(now, 1);
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
    } else {
      for (let i = monthsToShow - 1; i >= 0; i--) {
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
    const methods = {
      cash: 0,
      e_transfer_bank: 0,
      card_pay: 0,
      other: 0,
    };

    (installments || []).forEach((inst) => {
      const dStr = inst.paid_date;
      if (dStr && dStr !== "0000-00-00") {
        const method = inst.payment_method || "other";
        if (method in methods) {
          methods[method as keyof typeof methods] += Number(inst.amount ?? 0);
        } else {
          methods.other += Number(inst.amount ?? 0);
        }
      }
    });

    return methods;
  }, [installments]);

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
            <CardTitle>Payment methods breakdown</CardTitle>
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
      </div>
    </DashboardLayout>
  );
};

export default Reports;
