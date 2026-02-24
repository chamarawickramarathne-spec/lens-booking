import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getBaseUrl = () => {
  if (window.location.hostname === "localhost") {
    return "http://localhost/lens-booking/";
  } else {
    return "https://lensmanager.hireartist.studio/";
  }
};

export const API_BASE_URL = `${getBaseUrl()}api`;