/**
 * WishesAI API Client for interacting with the FastAPI backend.
 */

const API_BASE = "http://localhost:8000/api/v1";

export interface Friend {
  id: number;
  name: string;
  email: string;
  birth_date?: string;
  birth_month: number;
  birth_day: number;
  birth_year?: number;
  occasion_type: string;
  relationship_type: string;
  personal_notes?: string;
  preferred_tone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WishItem {
  id: number;
  friend_id: number;
  occasion_type: string;
  year: number;
  recipient_name: string;
  recipient_email: string;
  tone: string;
  generated_subject: string;
  generated_body: string;
  status: "PENDING_APPROVAL" | "SENT" | "FAILED" | "CANCELLED" | "SKIPPED";
  scheduled_for: string;
  sent_at?: string;
  gmail_message_id?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  todays_count: number;
  upcoming_count: number;
  sent_count: number;
  pending_count: number;
  failed_count: number;
  total_friends: number;
  automation_mode: "APPROVAL" | "AUTO";
  gmail_connected: boolean;
  gmail_email?: string;
}

export interface TodayOccasionItem {
  friend_id: number;
  name: string;
  email: string;
  occasion_type: string;
  relationship_type: string;
  preferred_tone: string;
  status: string;
  wish_id?: number;
  subject?: string;
  sent_at?: string;
}

export interface UpcomingOccasionItem {
  friend_id: number;
  name: string;
  email: string;
  occasion_type: string;
  relationship_type: string;
  month: number;
  day: number;
  year?: number;
  days_until: number;
  target_date: string;
  formatted_date: string;
}

export interface AppSettings {
  id: number;
  gmail_connected: boolean;
  gmail_email?: string;
  automation_mode: "APPROVAL" | "AUTO";
  daily_send_time: string;
  default_tone: string;
  sender_name: string;
  email_signature: string;
  ai_model: string;
  is_scheduler_running: boolean;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
    } catch {
      errorMessage = await response.text();
    }
    throw new Error(errorMessage || "Request failed");
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  // Stats & Dashboard
  getStats: () => request<DashboardStats>("/stats/summary"),
  getTodaysOccasions: () => request<TodayOccasionItem[]>("/stats/today"),
  getUpcomingOccasions: () => request<UpcomingOccasionItem[]>("/stats/upcoming"),

  // Friends Management
  getFriends: (params?: { search?: string; occasion?: string; relationship?: string; is_active?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.occasion) query.append("occasion", params.occasion);
    if (params?.relationship) query.append("relationship", params.relationship);
    if (params?.is_active !== undefined) query.append("is_active", String(params.is_active));
    return request<Friend[]>(`/friends?${query.toString()}`);
  },
  createFriend: (data: Partial<Friend>) => request<Friend>("/friends", { method: "POST", body: JSON.stringify(data) }),
  updateFriend: (id: number, data: Partial<Friend>) => request<Friend>(`/friends/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteFriend: (id: number) => request<void>(`/friends/${id}`, { method: "DELETE" }),

  // Wishes & Approvals
  getPendingWishes: () => request<WishItem[]>("/wishes/pending"),
  getWishesHistory: (params?: { status?: string; search?: string; occasion?: string; year?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append("status_filter", params.status);
    if (params?.search) query.append("search", params.search);
    if (params?.occasion) query.append("occasion", params.occasion);
    if (params?.year) query.append("year", String(params.year));
    return request<WishItem[]>(`/wishes/history?${query.toString()}`);
  },
  runScanNow: () => request<{ success: boolean; results: any }>("/wishes/scan-now", { method: "POST" }),
  approveAndSendWish: (id: number, custom_subject?: string, custom_body?: string) =>
    request<{ success: boolean; wish_id: number; status: string; gmail_message_id?: string }>(
      `/wishes/${id}/approve`,
      { method: "POST", body: JSON.stringify({ custom_subject, custom_body }) }
    ),
  rejectWish: (id: number) => request<{ success: boolean }>(`/wishes/${id}/reject`, { method: "POST" }),
  regenerateWish: (id: number, tone?: string, custom_instructions?: string) =>
    request<{ success: boolean; wish: { subject: string; body: string } }>(
      `/wishes/${id}/regenerate`,
      { method: "POST", body: JSON.stringify({ tone, custom_instructions }) }
    ),
  retryFailedWish: (id: number) => request<{ success: boolean }>(`/wishes/${id}/retry`, { method: "POST" }),
  generateWishPreview: (friend_id: number, tone?: string, custom_instructions?: string) =>
    request<{ friend: any; preview: { subject: string; body: string } }>(
      "/wishes/generate-preview",
      { method: "POST", body: JSON.stringify({ friend_id, tone, custom_instructions }) }
    ),

  // Settings & Test Email
  getSettings: () => request<AppSettings>("/settings"),
  updateSettings: (data: Partial<AppSettings>) => request<AppSettings>("/settings", { method: "PUT", body: JSON.stringify(data) }),
  sendTestEmail: (data: { recipient_email: string; subject?: string; body?: string }) =>
    request<{ success: boolean; message: string; message_id?: string }>("/settings/send-test", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  // Google OAuth
  getGoogleAuthStatus: () => request<{ connected: boolean; email?: string; token_expiry?: string; is_configured: boolean; client_id_configured: boolean }>("/auth/google/status"),
  getGoogleAuthUrl: () => request<{ authorization_url: string; state: string }>("/auth/google/url"),
  disconnectGmail: () => request<{ success: boolean; message: string }>("/auth/google/disconnect", { method: "POST" })
};
