import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getBaseUrl = () => {
  if (window.location.hostname === "localhost") {
    return "http://localhost/lens-booking/";
  } else {
    // Check if we are on the specific production domain or just use current origin
    if (window.location.hostname === "lensmanager.hireartist.studio") {
      return "https://lensmanager.hireartist.studio/";
    }
    return window.location.origin + "/";
  }
};

export const BASE_URL = getBaseUrl();
export const API_BASE_URL = `${BASE_URL}api`;

// This is the subpath where the app is hosted (e.g., "/lens-booking/" or "/")
export const APP_BASE_PATH = window.location.hostname === "localhost" ? "/lens-booking/" : "/";