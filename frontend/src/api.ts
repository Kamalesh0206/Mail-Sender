/**
 * WishMail AI — API Client for FastAPI backend.
 */

const API_BASE = "http://localhost:8000/api/v1";

export interface FriendGroup {
  id: number;
  name: string;
  description?: string;
  member_count?: number;
  created_at: string;
}

export interface Friend {
  id: number;
  name: string;
  email: string;
  birthday?: string;
  birth_month?: number;
  birth_day?: number;
  birth_year?: number;
  anniversary?: string;
  anniversary_month?: number;
  anniversary_day?: number;
  anniversary_year?: number;
  relationship: string;
  personal_notes?: string;
  is_active: boolean;
  enable_wishes: boolean;
  enable_quotes: boolean;
  groups?: string[];
  created_at: string;
  updated_at: string;
}

export interface OccasionItem {
  id: number;
  friend_id: number;
  friend_name?: string;
  friend_email?: string;
  occasion_type: string;
  title: string;
  date_str: string;
  month: number;
  day: number;
  year?: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
}

export interface QuoteItem {
  id: number;
  quote_text: string;
  author?: string;
  category: string;
  created_at: string;
}

export interface QuoteScheduleItem {
  id: number;
  quote_id: number;
  quote_text: string;
  author?: string;
  send_date: string;
  send_time: string;
  recipient_type: string;
  target_group_name?: string;
  target_friend_name?: string;
  subject: string;
  personalized_intro: boolean;
  status: "SCHEDULED" | "SENT" | "CANCELLED" | "FAILED";
  created_at: string;
}

export interface TodayScheduleItem {
  id: number;
  time: string;
  type: string;
  recipient: string;
  recipient_email: string;
  subject: string;
  status: string;
  action_id: number;
}

export interface DashboardOverview {
  todays_wishes_count: number;
  todays_quotes_count: number;
  upcoming_wishes_count: number;
  upcoming_quotes_count: number;
  emails_sent_count: number;
  pending_approval_count: number;
  failed_emails_count: number;
  today_schedule: TodayScheduleItem[];
  gmail_connected: boolean;
  gmail_email?: string;
  auto_send_wishes: boolean;
  timezone: string;
}

export interface CalendarEventItem {
  id: string;
  title: string;
  date: string;
  time: string;
  event_type: "WISH" | "QUOTE";
  recipient: string;
  status: string;
  quote_text?: string;
  subject?: string;
  entity_id: number;
}

export interface EmailHistoryItem {
  id: number;
  recipient_name: string;
  recipient_email: string;
  email_type: "WISH" | "QUOTE";
  occasion_name?: string;
  quote_id?: number;
  quote_schedule_id?: number;
  friend_id?: number;
  subject: string;
  body: string;
  sent_date: string;
  sent_time?: string;
  status: "PENDING" | "APPROVED" | "SENDING" | "SENT" | "FAILED" | "CANCELLED";
  gmail_message_id?: string;
  error_message?: string;
  created_at: string;
}

export interface AppSettings {
  id: number;
  gmail_connected: boolean;
  gmail_email?: string;
  timezone: string;
  default_send_time: string;
  default_wish_tone: string;
  auto_send_wishes: boolean;
  auto_send_quotes: boolean;
  default_quote_greeting: string;
  default_quote_closing: string;
  sender_name: string;
  email_signature: string;
  ai_model: string;
  ai_personalization: boolean;
}

export interface BulkPreviewResult {
  total_rows: number;
  valid_count: number;
  invalid_count: number;
  rows: Array<{
    row_number: number;
    date?: string;
    time?: string;
    quote?: string;
    recipients?: string;
    group?: string;
    subject?: string;
    is_valid: boolean;
    error?: string;
  }>;
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

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  // Dashboard
  getDashboard: () => request<DashboardOverview>("/dashboard"),

  // Friends & Groups
  getFriends: (params?: { search?: string; relationship?: string; group_id?: number; is_active?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append("search", params.search);
    if (params?.relationship) q.append("relationship", params.relationship);
    if (params?.group_id) q.append("group_id", String(params.group_id));
    if (params?.is_active !== undefined) q.append("is_active", String(params.is_active));
    return request<Friend[]>(`/friends?${q.toString()}`);
  },
  createFriend: (data: any) => request<Friend>("/friends", { method: "POST", body: JSON.stringify(data) }),
  updateFriend: (id: number, data: any) => request<Friend>(`/friends/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteFriend: (id: number) => request<void>(`/friends/${id}`, { method: "DELETE" }),

  getGroups: () => request<FriendGroup[]>("/groups"),
  createGroup: (data: { name: string; description?: string }) => request<FriendGroup>("/groups", { method: "POST", body: JSON.stringify(data) }),
  updateGroup: (id: number, data: { name: string; description?: string }) => request<FriendGroup>(`/groups/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteGroup: (id: number) => request<void>(`/groups/${id}`, { method: "DELETE" }),

  // Wishes & Occasions
  getOccasions: (params?: { occasion_type?: string; friend_id?: number; month?: number }) => {
    const q = new URLSearchParams();
    if (params?.occasion_type) q.append("occasion_type", params.occasion_type);
    if (params?.friend_id) q.append("friend_id", String(params.friend_id));
    if (params?.month) q.append("month", String(params.month));
    return request<OccasionItem[]>(`/occasions?${q.toString()}`);
  },
  createOccasion: (data: any) => request<OccasionItem>("/occasions", { method: "POST", body: JSON.stringify(data) }),
  updateOccasion: (id: number, data: any) => request<OccasionItem>(`/occasions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteOccasion: (id: number) => request<void>(`/occasions/${id}`, { method: "DELETE" }),
  runScanNow: () => request<{ success: boolean; results: any }>("/occasions/scan-now", { method: "POST" }),
  previewWish: (friendId: number, occasionType = "Birthday", tone = "Friendly") =>
    request<{ friend: any; occasion: string; tone: string; preview: { subject: string; body: string } }>(
      `/occasions/preview?friend_id=${friendId}&occasion_type=${occasionType}&tone=${tone}`,
      { method: "POST" }
    ),
  generateWishPreview: (friendId: number, tone = "Friendly", _customInstructions?: string, occasionType = "Birthday") =>
    request<{ friend: any; occasion: string; tone: string; preview: { subject: string; body: string } }>(
      `/occasions/preview?friend_id=${friendId}&occasion_type=${occasionType}&tone=${tone}`,
      { method: "POST" }
    ),

  // Quotes Module
  getQuotes: (search?: string) => {
    const q = search ? `?search=${encodeURIComponent(search)}` : "";
    return request<QuoteItem[]>(`/quotes${q}`);
  },
  createQuote: (data: { quote_text: string; author?: string; category?: string }) =>
    request<QuoteItem>("/quotes", { method: "POST", body: JSON.stringify(data) }),
  deleteQuote: (id: number) => request<void>(`/quotes/${id}`, { method: "DELETE" }),

  getQuoteSchedules: (statusFilter?: string) => {
    const q = statusFilter ? `?status_filter=${statusFilter}` : "";
    return request<QuoteScheduleItem[]>(`/quotes/schedules${q}`);
  },
  scheduleSingleQuote: (data: any) =>
    request<QuoteScheduleItem>("/quotes/schedule", { method: "POST", body: JSON.stringify(data) }),
  quickScheduleQuotes: (data: {
    quotes_text: string;
    start_date: string;
    send_time?: string;
    frequency?: string;
    recipient_type?: string;
    target_group_id?: number;
    target_friend_id?: number;
    subject?: string;
  }) => request<{ success: boolean; count: number; schedules: any[] }>("/quotes/quick-schedule", {
    method: "POST",
    body: JSON.stringify(data)
  }),
  sendQuoteNow: (scheduleId: number) => request<{ success: boolean; result: any }>(`/quotes/${scheduleId}/send-now`, { method: "POST" }),
  cancelQuoteSchedule: (scheduleId: number) => request<{ success: boolean; message: string }>(`/quotes/${scheduleId}/cancel`, { method: "POST" }),

  // Bulk Upload Preview & Confirm
  previewBulkUpload: async (file: File): Promise<BulkPreviewResult> => {
    const formData = new FormData();
    formData.append("file", file);
    const resp = await fetch(`${API_BASE}/quotes/import-preview`, {
      method: "POST",
      body: formData
    });
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(err || "Failed to preview file");
    }
    return resp.json();
  },
  confirmBulkUpload: (validRows: any[]) =>
    request<{ success: boolean; imported_count: number }>("/quotes/import-confirm", {
      method: "POST",
      body: JSON.stringify({ valid_rows: validRows })
    }),

  // Calendar
  getCalendarEvents: (year: number, month: number) =>
    request<CalendarEventItem[]>(`/calendar?year=${year}&month=${month}`),

  // Email History & Approvals
  getEmailHistory: (params?: { email_type?: string; status_filter?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.email_type) q.append("email_type", params.email_type);
    if (params?.status_filter) q.append("status_filter", params.status_filter);
    if (params?.search) q.append("search", params.search);
    return request<EmailHistoryItem[]>(`/email-history?${q.toString()}`);
  },
  approveEmail: (id: number, custom_subject?: string, custom_body?: string) =>
    request<{ success: boolean; history_id: number; status: string; gmail_message_id?: string }>(
      `/email-history/${id}/approve`,
      { method: "POST", body: JSON.stringify({ custom_subject, custom_body }) }
    ),
  rejectEmail: (id: number) => request<{ success: boolean; message: string }>(`/email-history/${id}/reject`, { method: "POST" }),
  retryEmail: (id: number) => request<{ success: boolean; history_id: number; status: string }>(`/email-history/${id}/retry`, { method: "POST" }),
  regenerateWishContent: (id: number, tone: string) =>
    request<{ success: boolean; wish: { subject: string; body: string } }>(`/email-history/${id}/regenerate?tone=${tone}`, { method: "POST" }),

  // Settings & Gmail
  getSettings: () => request<AppSettings>("/settings"),
  updateSettings: (data: Partial<AppSettings>) => request<AppSettings>("/settings", { method: "PUT", body: JSON.stringify(data) }),
  sendTestEmail: (data: { recipient_email: string; subject?: string; body?: string }) =>
    request<{ success: boolean; message: string; message_id?: string }>("/gmail/test", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  // OAuth 2.0
  getGoogleAuthStatus: () => request<{ connected: boolean; email?: string; is_configured: boolean }>("/auth/google/status"),
  getGoogleAuthUrl: () => request<{ authorization_url: string; state: string }>("/auth/google/url"),
  disconnectGmail: () => request<{ success: boolean; message: string }>("/auth/google/disconnect", { method: "POST" })
};
