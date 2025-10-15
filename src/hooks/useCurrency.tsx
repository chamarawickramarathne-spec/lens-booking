import { useState } from "react";

export const useCurrency = () => {
  const [currency] = useState("LKR");

  const formatCurrency = (amount: number) => {
    if (!amount) return "LKR 0.00";
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return {
    currency,
    formatCurrency,
  };
};
