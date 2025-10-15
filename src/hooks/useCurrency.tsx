import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useCurrency = () => {
  const { user } = useAuth();
  const [currency, setCurrency] = useState<string>("USD");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrency = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("currency_type")
        .eq("user_id", user.id)
        .single();

      if (data && !error) {
        setCurrency(data.currency_type || "USD");
      }
      setLoading(false);
    };

    fetchCurrency();
  }, [user]);

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    return `${currency} ${numAmount.toFixed(2)}`;
  };

  return { currency, formatCurrency, loading };
};
