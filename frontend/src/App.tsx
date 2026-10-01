import React, { useState, useEffect, useCallback } from "react";
import { Sidebar } from "./components/Sidebar";
import { DashboardView } from "./components/DashboardView";
import { WishesView } from "./components/WishesView";
import { QuotesView } from "./components/QuotesView";
import { FriendsView } from "./components/FriendsView";
import { CalendarView } from "./components/CalendarView";
import { HistoryView } from "./components/HistoryView";
import { SettingsView } from "./components/SettingsView";
import { TestEmailModal } from "./components/TestEmailModal";
import { WishPreviewModal } from "./components/WishPreviewModal";
import {
  api,
  DashboardOverview,
  Friend,
  FriendGroup,
  OccasionItem,
  QuoteScheduleItem,
  EmailHistoryItem,
  AppSettings
} from "./api";
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  Sparkles,
  Menu,
  LayoutDashboard,
  Heart,
  Quote,
  Users,
  Settings as SettingsIcon
} from "lucide-react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

type TabType = "dashboard" | "wishes" | "quotes" | "friends" | "calendar" | "history" | "settings";

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Core data states
  const [dashboard, setDashboard] = useState<DashboardOverview | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<FriendGroup[]>([]);
  const [occasions, setOccasions] = useState<OccasionItem[]>([]);
  const [quoteSchedules, setQuoteSchedules] = useState<QuoteScheduleItem[]>([]);
  const [history, setHistory] = useState<EmailHistoryItem[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isTestEmailOpen, setIsTestEmailOpen] = useState(false);
  const [previewFriendId, setPreviewFriendId] = useState<number | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: "success" | "error" | "info" = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Master data loader
  const loadData = useCallback(async () => {
    try {
      const [
        dashData,
        friendsData,
        groupsData,
        occasionsData,
        schedulesData,
        historyData,
        settingsData
      ] = await Promise.all([
        api.getDashboard().catch(() => null),
        api.getFriends().catch(() => []),
        api.getGroups().catch(() => []),
        api.getOccasions().catch(() => []),
        api.getQuoteSchedules().catch(() => []),
        api.getEmailHistory().catch(() => []),
        api.getSettings().catch(() => null)
      ]);

      if (dashData) setDashboard(dashData);
      setFriends(friendsData);
      setGroups(groupsData);
      setOccasions(occasionsData);
      setQuoteSchedules(schedulesData);
      setHistory(historyData);
      if (settingsData) setSettings(settingsData);
    } catch (err: any) {
      console.error("Error loading WishMail AI state:", err);
      addToast("Failed to connect to backend server. Make sure FastAPI is running on port 8000.", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Check for Google OAuth callback parameters in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("oauth") === "success") {
      addToast("Google Account successfully connected with Gmail send permissions! 🎉", "success");
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get("oauth_error")) {
      addToast(`OAuth failed: ${urlParams.get("oauth_error")}`, "error");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [loadData]);

  // Run daily scan across wishes and quotes
  const handleRunScan = async () => {
    setIsScanning(true);
    try {
      const resp = await api.runScanNow();
      await loadData();
      const count = resp.results?.found_count ?? 0;
      const pendingCount = resp.results?.pending?.length ?? 0;
      const sentCount = resp.results?.sent?.length ?? 0;

      if (count === 0) {
        addToast("Occasion check complete. No birthdays or celebrations found for today.", "info");
      } else if (pendingCount > 0) {
        addToast(`Found ${count} occasion(s)! ${pendingCount} wish draft(s) staged in Approval Queue.`, "success");
        setActiveTab("wishes");
      } else if (sentCount > 0) {
        addToast(`Found ${count} occasion(s)! ${sentCount} wish(es) sent automatically via Gmail.`, "success");
      } else {
        addToast(`Check completed for ${count} friend(s). Duplicate protection applied.`, "info");
      }
    } catch (err: any) {
      addToast(err.message || "Failed to run scan", "error");
    } finally {
      setIsScanning(false);
    }
  };

  // Wishes Actions
  const handleApproveWish = async (historyId: number, subject?: string, body?: string) => {
    try {
      await api.approveEmail(historyId, subject, body);
      addToast("Wishes email dispatched successfully through Gmail! 🎂✉️", "success");
      await loadData();
    } catch (err: any) {
      addToast(err.message || "Approval and delivery failed", "error");
      throw err;
    }
  };

  const handleRejectWish = async (historyId: number) => {
    try {
      await api.rejectEmail(historyId);
      addToast("Wish draft skipped and removed from queue.", "info");
      await loadData();
    } catch (err: any) {
      addToast(err.message || "Rejection failed", "error");
      throw err;
    }
  };

  const handleRegenerateWish = async (historyId: number, tone: string) => {
    try {
      await api.regenerateWishContent(historyId, tone);
      addToast(`Draft regenerated with '${tone}' tone via Gemini API! ✨`, "success");
      await loadData();
    } catch (err: any) {
      addToast(err.message || "Regeneration failed", "error");
      throw err;
    }
  };

  const handleToggleAutoSend = async (enabled: boolean) => {
    try {
      await api.updateSettings({ auto_send_wishes: enabled });
      addToast(
        enabled
          ? "Switched to Auto Send Mode: Wishes will send automatically upon detection."
          : "Switched to Approval Mode: Wishes will require manual review before sending.",
        "info"
      );
      await loadData();
    } catch (err: any) {
      addToast(err.message || "Failed to update mode", "error");
      throw err;
    }
  };

  const handleCreateOccasion = async (data: any) => {
    try {
      await api.createOccasion(data);
      addToast("Occasion saved successfully!", "success");
      await loadData();
    } catch (err: any) {
      addToast(err.message || "Failed to create occasion", "error");
      throw err;
    }
  };

  const handleDeleteOccasion = async (id: number) => {
    try {
      await api.deleteOccasion(id);
      addToast("Occasion removed.", "info");
      await loadData();
    } catch (err: any) {
      addToast(err.message || "Failed to delete occasion", "error");
      throw err;
    }
  };

  // Quotes Actions
  const handleScheduleSingleQuote = async (data: any) => {
    try {
      await api.scheduleSingleQuote(data);
      addToast("Quote scheduled successfully! Exact text preserved verbatim.", "success");
      await loadData();
    } catch (err: any) {
      addToast(err.message || "Failed to schedule quote", "error");
      throw err;
    }
  };

  const handleQuickScheduleQuotes = async (data: any) => {
    try {
      const resp = await api.quickScheduleQuotes(data);
      addToast(`Successfully scheduled ${resp.count} sequential quote(s)!`, "success");
      await loadData();
    } catch (err: any) {
      addToast(err.message || "Failed to quick schedule quotes", "error");
      throw err;
    }
  };

  const handleSendQuoteNow = async (scheduleId: number) => {
    try {
      await api.sendQuoteNow(scheduleId);
      addToast("Quote dispatched immediately via Gmail! 🚀", "success");
      await loadData();
    } catch (err: any) {
      addToast(err.message || "Failed to send quote now", "error");
      throw err;
    }
  };

  const handleCancelQuote = async (scheduleId: number) => {
    try {
      await api.cancelQuoteSchedule(scheduleId);
      addToast("Quote schedule cancelled.", "info");
      await loadData();
    } catch (err: any) {
      addToast(err.message || "Failed to cancel quote schedule", "error");
      throw err;
    }
  };

  // Friends & Groups Actions
  const handleAddFriend = async (data: any) => {
    try {
      await api.createFriend(data);
      addToast(`Added ${data.name} to friend contacts!`, "success");
      await loadData();
    } catch (err: any) {
      addToast(err.message || "Failed to add friend", "error");
      throw err;
    }
  };

  const handleUpdateFriend = async (id: number, data: any) => {
    try {
      await api.updateFriend(id, data);
      addToast("Friend details updated successfully!", "success");
      await loadData();
    } catch (err: any) {
      addToast(err.message || "Failed to update friend", "error");
      throw err;
    }
  };

  const handleDeleteFriend = async (id: number) => {
    try {
      await api.deleteFriend(id);
      addToast("Friend removed from directory.", "info");
      await loadData();
    } catch (err: any) {
      addToast(err.message || "Failed to delete friend", "error");
      throw err;
    }
  };

  const handleCreateGroup = async (data: { name: string; description?: string }) => {
    try {
      await api.createGroup(data);
      addToast(`Group '${data.name}' created!`, "success");
      await loadData();
    } catch (err: any) {
      addToast(err.message || "Failed to create group", "error");
      throw err;
    }
  };

  const handleDeleteGroup = async (id: number) => {
    try {
      await api.deleteGroup(id);
      addToast("Friend group deleted.", "info");
      await loadData();
    } catch (err: any) {
      addToast(err.message || "Failed to delete group", "error");
      throw err;
    }
  };

  // History & Retry Actions
  const handleRetryFailed = async (id: number) => {
    try {
      await api.retryEmail(id);
      addToast("Email retry sent successfully!", "success");
      await loadData();
    } catch (err: any) {
      addToast(err.message || "Retry failed", "error");
      throw err;
    }
  };

  // Settings Actions
  const handleUpdateSettings = async (data: Partial<AppSettings>) => {
    try {
      await api.updateSettings(data);
      addToast("Settings successfully updated!", "success");
      await loadData();
    } catch (err: any) {
      addToast(err.message || "Failed to update settings", "error");
      throw err;
    }
  };

  const handleSendTestEmail = async (recipient: string, subject?: string, body?: string) => {
    try {
      const resp = await api.sendTestEmail({ recipient_email: recipient, subject, body });
      addToast(`Test email delivered to ${recipient}!`, "success");
      await loadData();
      return resp;
    } catch (err: any) {
      addToast(err.message || "Failed to send test email", "error");
      throw err;
    }
  };

  // Extract pending wishes for approval queue
  const pendingWishesList = history.filter(
    (h) => h.email_type === "WISH" && h.status === "PENDING"
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", width: "100%", background: "var(--bg-primary)" }}>
      {/* Responsive Sidebar (Sticky on Desktop, Off-Canvas Drawer on Mobile) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        dashboard={dashboard}
        onRunScan={handleRunScan}
        isScanning={isScanning}
        onOpenTestEmail={() => setIsTestEmailOpen(true)}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        width: "100%",
        overflowX: "hidden"
      }}>
        {/* Top Header Bar */}
        <header style={{
          height: 60,
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 18px",
          background: "rgba(12, 17, 29, 0.92)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          position: "sticky",
          top: 0,
          zIndex: 40
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Mobile Hamburger Drawer Toggle */}
            <button
              id="mobile-menu-btn"
              className="btn-icon mobile-only"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open sidebar menu"
              style={{ padding: 6 }}
            >
              <Menu size={22} />
            </button>

            <span className="desktop-only" style={{ fontSize: 13, color: "var(--text-muted)", textTransform: "capitalize" }}>
              WishMail AI /
            </span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", textTransform: "capitalize" }}>
              {activeTab === "friends" ? "Friends & Groups" : activeTab === "history" ? "Email History" : activeTab}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="desktop-only" style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              padding: "4px 12px",
              background: "rgba(255, 255, 255, 0.04)",
              borderRadius: "var(--radius-full)",
              border: "1px solid var(--border-subtle)"
            }}>
              <Sparkles size={13} style={{ color: "#a5b4fc" }} />
              <span style={{ color: "var(--text-secondary)" }}>Direct Gemini API</span>
            </div>

            <button
              onClick={() => setIsTestEmailOpen(true)}
              className="btn-secondary"
              style={{ fontSize: 12, padding: "6px 12px", minHeight: 32 }}
            >
              Test Email
            </button>
          </div>
        </header>

        {/* Tab Views */}
        <main
          className="main-content-wrapper"
          style={{
            flex: 1,
            padding: "24px 20px 48px 20px",
            maxWidth: 1380,
            width: "100%",
            margin: "0 auto",
            minWidth: 0
          }}
        >
          {activeTab === "dashboard" && (
            <DashboardView
              data={dashboard}
              onNavigate={setActiveTab}
              onRunScan={handleRunScan}
              isScanning={isScanning}
            />
          )}

          {activeTab === "wishes" && (
            <WishesView
              occasions={occasions}
              pendingWishes={pendingWishesList}
              friends={friends}
              autoSendMode={settings?.auto_send_wishes ?? false}
              onToggleAutoSend={handleToggleAutoSend}
              onApproveWish={handleApproveWish}
              onRejectWish={handleRejectWish}
              onRegenerateWish={handleRegenerateWish}
              onCreateOccasion={handleCreateOccasion}
              onDeleteOccasion={handleDeleteOccasion}
              onPreviewWish={(id) => setPreviewFriendId(id)}
              isLoading={isLoading}
            />
          )}

          {activeTab === "quotes" && (
            <QuotesView
              schedules={quoteSchedules}
              groups={groups}
              friends={friends}
              onScheduleSingle={handleScheduleSingleQuote}
              onQuickSchedule={handleQuickScheduleQuotes}
              onSendNow={handleSendQuoteNow}
              onCancelSchedule={handleCancelQuote}
              onRefresh={loadData}
            />
          )}

          {activeTab === "friends" && (
            <FriendsView
              friends={friends}
              groups={groups}
              onAddFriend={handleAddFriend}
              onUpdateFriend={handleUpdateFriend}
              onDeleteFriend={handleDeleteFriend}
              onCreateGroup={handleCreateGroup}
              onDeleteGroup={handleDeleteGroup}
            />
          )}

          {activeTab === "calendar" && (
            <CalendarView
              onRefresh={loadData}
              onSendQuoteNow={handleSendQuoteNow}
              onCancelQuote={handleCancelQuote}
            />
          )}

          {activeTab === "history" && (
            <HistoryView
              history={history}
              onRetry={handleRetryFailed}
              isLoading={isLoading}
            />
          )}

          {activeTab === "settings" && (
            <SettingsView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onOpenTestEmail={() => setIsTestEmailOpen(true)}
              onRefreshAuth={loadData}
            />
          )}
        </main>

        {/* Mobile Bottom Navigation Bar (iOS / Android App Experience) */}
        <nav className="mobile-bottom-nav">
          <button
            className={`mobile-bottom-nav-item ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
            aria-label="Dashboard"
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>
          <button
            className={`mobile-bottom-nav-item ${activeTab === "wishes" ? "active" : ""}`}
            onClick={() => setActiveTab("wishes")}
            aria-label="Wishes"
          >
            <div style={{ position: "relative", display: "inline-flex" }}>
              <Heart size={20} />
              {dashboard?.pending_approval_count && dashboard.pending_approval_count > 0 ? (
                <span style={{
                  position: "absolute",
                  top: -4,
                  right: -8,
                  background: "var(--status-warning)",
                  color: "#000",
                  fontSize: 9,
                  fontWeight: 800,
                  borderRadius: "var(--radius-full)",
                  padding: "0 4px",
                  minWidth: 14,
                  textAlign: "center"
                }}>
                  {dashboard.pending_approval_count}
                </span>
              ) : null}
            </div>
            <span>Wishes</span>
          </button>
          <button
            className={`mobile-bottom-nav-item ${activeTab === "quotes" ? "active" : ""}`}
            onClick={() => setActiveTab("quotes")}
            aria-label="Quotes"
          >
            <Quote size={20} />
            <span>Quotes</span>
          </button>
          <button
            className={`mobile-bottom-nav-item ${activeTab === "friends" ? "active" : ""}`}
            onClick={() => setActiveTab("friends")}
            aria-label="Friends"
          >
            <Users size={20} />
            <span>Friends</span>
          </button>
          <button
            className={`mobile-bottom-nav-item ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
            aria-label="Settings"
          >
            <SettingsIcon size={20} />
            <span>Settings</span>
          </button>
        </nav>
      </div>

      {/* Modals with Mobile-Fit Overlays */}
      <TestEmailModal
        isOpen={isTestEmailOpen}
        onClose={() => setIsTestEmailOpen(false)}
        onSendTest={handleSendTestEmail}
        gmailConnected={dashboard?.gmail_connected ?? false}
      />

      <WishPreviewModal
        friendId={previewFriendId}
        onClose={() => setPreviewFriendId(null)}
      />

      {/* Floating Toast Alerts */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast">
            {toast.type === "success" && <CheckCircle2 size={18} style={{ color: "#34d399", flexShrink: 0 }} />}
            {toast.type === "error" && <AlertTriangle size={18} style={{ color: "#f87171", flexShrink: 0 }} />}
            {toast.type === "info" && <Info size={18} style={{ color: "#60a5fa", flexShrink: 0 }} />}
            <span style={{ fontSize: 13, flex: 1, color: "var(--text-primary)" }}>{toast.message}</span>
            <button className="btn-icon" onClick={() => removeToast(toast.id)} style={{ padding: 4 }}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
