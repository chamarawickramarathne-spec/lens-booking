import { ReactNode, useEffect, useState } from "react";
import { Users, Calendar, HardDrive, Tag, Percent } from "lucide-react";
import apiClient from "@/integrations/api/client";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

interface AccessLevelData {
  id: number;
  level_name: string;
  max_clients: number | null;
  max_bookings: number | null;
  max_storage_gb: number;
  package_price: number;
  discount_percentage: number;
}

const getBorderColor = (name: string) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("free")) return "border-t-blue-200";
  if (lowerName.includes("pro")) return "border-t-blue-500";
  if (lowerName.includes("premium")) return "border-t-pink-500";
  if (lowerName.includes("unlimited")) return "border-t-orange-500";
  return "border-t-gray-500";
};

const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
  const [packages, setPackages] = useState<AccessLevelData[]>([]);

  useEffect(() => {
    const fetchAccessLevels = async () => {
      try {
        const data = await apiClient.getAccessLevels();
        setPackages(data);
      } catch (error) {
        console.error("Failed to fetch access levels", error);
      }
    };
    fetchAccessLevels();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] flex items-center justify-center p-4">
      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-8 items-start justify-center">
        
        {/* Packages Sidebar - Visible on lg screens, hidden on smaller screens */}
        <div className="hidden lg:grid grid-cols-2 gap-3 w-full lg:w-2/3 max-w-2xl [grid-auto-rows:1fr]">
          {packages.map((pkg) => (
            <div key={pkg.id} className={`bg-[#1e1e2d] rounded-xl border border-white/10 p-4 flex flex-col transform hover:scale-105 transition-transform duration-300 border-t-4 ${getBorderColor(pkg.level_name)}`}>
              <h3 className="text-base font-bold text-white mb-3">{pkg.level_name} Package</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center text-gray-300">
                  <Users className="w-4 h-4 mr-2 shrink-0 text-blue-400" />
                  <span>{pkg.max_clients === null ? 'Unlimited' : pkg.max_clients} Max Clients</span>
                </div>
                <div className="flex items-center text-gray-300">
                  <Calendar className="w-4 h-4 mr-2 shrink-0 text-pink-400" />
                  <span>{pkg.max_bookings === null ? 'Unlimited' : pkg.max_bookings} Max Bookings</span>
                </div>
                <div className="flex items-center text-gray-300">
                  <HardDrive className="w-4 h-4 mr-2 shrink-0 text-purple-400" />
                  <span>{pkg.max_storage_gb} GB Max Storage</span>
                </div>
                <div className="flex items-center text-gray-300">
                  <Tag className="w-4 h-4 mr-2 shrink-0 text-emerald-400" />
                  <span>LKR {Number(pkg.package_price).toFixed(2)} Package Price</span>
                </div>
                <div className="flex items-center text-gray-300">
                  <Percent className="w-4 h-4 mr-2 shrink-0 text-emerald-400" />
                  <span className="text-emerald-400">{Number(pkg.discount_percentage).toFixed(0)}%</span>&nbsp;<span>Discount</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Existing Auth Form Container */}
        <div className="w-full max-w-md lg:w-1/3">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#e94560] to-[#533483] bg-clip-text text-transparent mb-2">{title}</h1>
              <p className="text-gray-600">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default AuthLayout;