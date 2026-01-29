/**
 * API Client for Lens Booking Pro
 * Replaces Supabase integration with PHP backend API calls
 */

// For root deployment, default to relative '/api'. Use VITE_API_URL to override in dev.
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiClient {
  private baseURL: string;
  private token: string | null;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('auth_token');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      mode: 'cors',
      credentials: 'omit',
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      const rawText = await response.text();

      if (!response.ok) {
        // Check for 401 Unauthorized (session expired or invalid token)
        if (response.status === 401) {
          this.logout();
          // Redirect to login page
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          throw new Error('Session expired. Please login again.');
        }

        // Attempt to parse JSON error if possible
        try {
          const errJson = JSON.parse(rawText);
          const errorMessage = errJson.details 
            ? `${errJson.message} ${errJson.details}` 
            : (errJson.message || rawText || 'API request failed');
          const error = new Error(errorMessage);
          (error as any).statusCode = response.status;
          throw error;
        } catch (parseError) {
          // If parsing fails, check if parseError is the Error we just threw
          if (parseError instanceof Error && (parseError as any).statusCode) {
            throw parseError;
          }
          // Otherwise it's a real parsing error, use raw text
          throw new Error(rawText || 'API request failed');
        }
      }

      // Try to parse JSON safely, handling potential BOM or leading warnings
      try {
        // Remove BOM and trim
        const cleaned = rawText.replace(/^\uFEFF/, '').trim();
        // If there is noise before the first { or [, slice it out
        const firstBrace = cleaned.indexOf('{');
        const firstBracket = cleaned.indexOf('[');
        let candidate = cleaned;
        if (firstBrace > 0 || firstBracket > 0) {
          const idx = [firstBrace, firstBracket].filter((i) => i >= 0).sort((a, b) => a - b)[0] ?? 0;
          candidate = cleaned.slice(idx);
        }
        const data = JSON.parse(candidate);
        return data;
      } catch (e) {
        throw new Error('Invalid JSON response from server');
      }
    } catch (error) {
      throw error;
    }
  }

  // Authentication methods
  async login(email: string, password: string) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.token) {
      this.token = response.token;
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('user_data', JSON.stringify(response.user));
    }

    return response;
  }

  async register(userData: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    role?: string;
  }) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (response.token) {
      this.token = response.token;
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('user_data', JSON.stringify(response.user));
    }

    return response;
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  async updateProfile(profileData: any) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async uploadProfileImage(file: File) {
    const formData = new FormData();
    formData.append('profile_image', file);

    const url = `${this.baseURL}/auth/upload-profile-image`;
    const headers: HeadersInit = {};
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      mode: 'cors',
      credentials: 'omit',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to upload image');
    }

    const rawText = await response.text();
    const cleaned = rawText.replace(/^\uFEFF/, '').trim();
    const firstBrace = cleaned.indexOf('{');
    const candidate = firstBrace > 0 ? cleaned.slice(firstBrace) : cleaned;
    return JSON.parse(candidate);
  }

  logout() {
    this.token = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
  }

  // Client methods
  async getClients() {
    return this.request('/clients');
  }

  async getClient(id: number) {
    return this.request(`/clients/${id}`);
  }

  async createClient(clientData: any) {
    return this.request('/clients', {
      method: 'POST',
      body: JSON.stringify(clientData),
    });
  }

  async updateClient(id: number, clientData: any) {
    return this.request(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(clientData),
    });
  }

  async deleteClient(id: number) {
    return this.request(`/clients/${id}`, {
      method: 'DELETE',
    });
  }

  async getClientDeletionInfo(id: number) {
    return this.request(`/clients/${id}/deletion-info`);
  }

  // Booking methods
  async getBookings() {
    return this.request('/bookings');
  }

  async getBooking(id: number) {
    return this.request(`/bookings/${id}`);
  }

  async createBooking(bookingData: any) {
    return this.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }

  async updateBooking(id: number, bookingData: any) {
    return this.request(`/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(bookingData),
    });
  }

  async updateBookingStatus(id: number, status: string) {
    return this.request(`/bookings/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async deleteBooking(id: number) {
    return this.request(`/bookings/${id}`, {
      method: 'DELETE',
    });
  }

  // Gallery methods
  async getGalleries() {
    return this.request('/galleries');
  }

  async getGallery(id: number) {
    return this.request(`/galleries/${id}`);
  }

  async createGallery(galleryData: any) {
    return this.request('/galleries', {
      method: 'POST',
      body: JSON.stringify(galleryData),
    });
  }

  async updateGallery(id: number, galleryData: any) {
    return this.request(`/galleries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(galleryData),
    });
  }

  async deleteGallery(id: number) {
    return this.request(`/galleries/${id}`, {
      method: 'DELETE',
    });
  }

  // Invoice methods
  async getInvoices() {
    return this.request('/invoices');
  }

  async getInvoice(id: number) {
    return this.request(`/invoices/${id}`);
  }

  async createInvoice(invoiceData: any) {
    return this.request('/invoices', {
      method: 'POST',
      body: JSON.stringify(invoiceData),
    });
  }

  async updateInvoice(id: number, invoiceData: any) {
    return this.request(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(invoiceData),
    });
  }

  async sendInvoiceEmail(invoiceId: number) {
    return this.request('/send-invoice-email', {
      method: 'POST',
      body: JSON.stringify({ invoice_id: invoiceId }),
    });
  }

  async deleteInvoice(id: number) {
    return this.request(`/invoices/${id}`, {
      method: 'DELETE',
    });
  }

  // Payment methods
  async getPayments() {
    return this.request('/payments');
  }

  async getPaymentInstallments(scheduleId: number) {
    return this.request(`/payments/${scheduleId}/installments`);
  }

  async addPaymentInstallment(scheduleId: number, installmentData: any) {
    return this.request(`/payments/${scheduleId}/installments`, {
      method: 'POST',
      body: JSON.stringify(installmentData),
    });
  }

  async getPayment(id: number) {
    return this.request(`/payments/${id}`);
  }

  async createPayment(paymentData: any) {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  async updatePayment(id: number, paymentData: any) {
    return this.request(`/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(paymentData),
    });
  }

  async deletePayment(id: number) {
    return this.request(`/payments/${id}`, {
      method: 'DELETE',
    });
  }

  // Dashboard methods
  async getDashboardStats() {
    return this.request('/dashboard');
  }

  // Access Level methods
  async getUserAccessInfo() {
    return this.request('/access-levels/user-info');
  }

  async getAccessLevels() {
    return this.request('/access-levels');
  }

  async checkClientPermission() {
    return this.request('/access-levels/check-client');
  }

  async checkBookingPermission() {
    return this.request('/access-levels/check-booking');
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!this.token;
  }

  getToken(): string | null {
    return this.token;
  }

  getCurrentUser() {
    const userData = localStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient();

// Export types for better TypeScript support
export interface User {
  id: number;
  email: string;
  full_name: string;
  phone?: string;
  role: 'admin' | 'photographer' | 'client';
  profile_picture?: string;
  currency_type?: string;
  business_name?: string;
  business_email?: string;
  business_phone?: string;
  business_address?: string;
  bio?: string;
  website?: string;
  portfolio_url?: string;
  access_level?: {
    id: number;
    name: string;
    role: 'admin' | 'photographer' | 'client';
    max_clients: number | null;
    max_bookings: number | null;
  };
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: number;
  user_id: number;
  full_name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  status?: 'active' | 'inactive' | 'blacklisted';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: number;
  user_id: number;
  client_id: number;
  booking_date: string;
  booking_time?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  title?: string;
  description?: string;
  package_type?: string;
  package_name?: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  total_amount?: number;
  paid_amount?: number;
  deposit_amount?: number;
  deposit_paid?: boolean;
  special_requirements?: string;
  notes?: string;
  wedding_hotel_name?: string;
  wedding_date?: string;
  homecoming_hotel_name?: string;
  homecoming_date?: string;
  wedding_album?: boolean;
  pre_shoot_album?: boolean;
  family_album?: boolean;
  group_photo_size?: string;
  homecoming_photo_size?: string;
  wedding_photo_sizes?: string;
  extra_thank_you_cards_qty?: number;
  created_at: string;
  updated_at: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
}

// Re-export the client as default for easier imports
export default apiClient;