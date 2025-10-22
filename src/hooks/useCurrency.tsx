import { useMemo } from "react";

// Determine a safe currency code from profile (localStorage) with a fallback
const getCurrencyFromProfile = (): string => {
  try {
    const raw = localStorage.getItem("user_data");
    if (raw) {
      const user = JSON.parse(raw);
      const code = String(user?.currency_type || "").toUpperCase();
      if (code && code.length === 3) return code; // ISO 4217
    }
  } catch {}
  return "LKR"; // fallback
};

export const useCurrency = () => {
  const currency = useMemo(() => getCurrencyFromProfile(), []);

  const formatCurrency = (amount: number | string | null | undefined) => {
    const value = Number(amount ?? 0);
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
      }).format(value);
    } catch {
      // Fallback to code + fixed decimals
      return `${currency} ${value.toFixed(2)}`;
    }
  };

  return { currency, formatCurrency };
};
