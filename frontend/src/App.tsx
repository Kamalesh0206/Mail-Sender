import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "./components/Navbar";
import { DashboardView } from "./components/DashboardView";
import { ApprovalQueueView } from "./components/ApprovalQueueView";
import { FriendsView } from "./components/FriendsView";
import { HistoryView } from "./components/HistoryView";
import { SettingsView } from "./components/SettingsView";
import { TestEmailModal } from "./components/TestEmailModal";
import { WishPreviewModal } from "./components/WishPreviewModal";
import {
  api,
  DashboardStats,
  TodayOccasionItem,
  UpcomingOccasionItem,
  Friend,
  WishItem,
  AppSettings
} from "./api";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "approvals" | "friends" | "history" | "settings">("dashboard");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayOccasions, setTodayOccasions] = useState<TodayOccasionItem[]>([]);
  const [upcomingOccasions, setUpcomingOccasions] = useState<UpcomingOccasionItem[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingWishes, setPendingWishes] = useState<WishItem[]>([]);
  const [history, setHistory] = useState<WishItem[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);

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

  // Load all initial data from backend
  const loadData = useCallback(async () => {
    try {
      const [
        statsData,
        todayData,
        upcomingData,
        friendsData,
        pendingData,
        historyData,
        settingsData
      ] = await Promise.all([
        api.getStats().catch(() => null),
        api.getTodaysOccasions().catch(() => []),
        api.getUpcomingOccasions().catch(() => []),
        api.getFriends().catch(() => []),
        api.getPendingWishes().catch(() => []),
        api.getWishesHistory().catch(() => []),
        api.getSettings().catch(() => null)
      ]);

      if (statsData) setStats(statsData);
      setTodayOccasions(todayData);
      setUpcomingOccasions(upcomingData);
      setFriends(friendsData);
      setPendingWishes(pendingData);
      setHistory(historyData);
      if (settingsData) setSettings(settingsData);
    } catch (err: any) {
      console.error("Error loading application state:", err);
      addToast("Failed to connect to backend server. Make sure FastAPI is running on port 8000.", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Check for OAuth redirect query parameters
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("oauth") === "success") {
      addToast("Google Account successfully connected with Gmail send permissions! 🎉", "success");
      // Clean query parameter from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get("oauth_error")) {
      addToast(`OAuth failed: ${urlParams.get("oauth_error")}`, "error");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [loadData]);

  // Trigger manual daily scan
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
        setActiveTab("approvals");
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

  // Approval actions
  const handleApproveAndSend = async (wishId: number, customSubject?: string, customBody?: string) => {
    try {
      await api.approveAndSendWish(wishId, customSubject, customBody);
      addToast("Wishes email dispatched successfully through Gmail! 🎂✉️", "success");
      await loadData();
    } catch (err: any) {
      addToast(err.message || "Approval and delivery failed", "error");
      throw err;
    }
  };

  const handleRejectWish = async (wishId: number) => {
    try {
      await api.rejectWish(wishId);
      addToast("Wish draft skipped and removed from queue.", "info");
      await loadData();
    } catch (err: any) {
      addToast(err.message || "Rejection failed", "error");
    }
  };

  const handleRegenerateWish = async (wishId: number, tone: string) => {
    try {
      await api.regenerateWish(wishId, tone);
      addToast(`Draft regenerated with '${tone}' tone via Gemini API! ✨`, "success");
      await loadData();
    } catch (err: any) {
      addToast(err.message || "Regeneration failed", "error");
      throw err;
    }
  };

  const handleRetryFailed = async (wishId: number) => {
    try {
      await api.retryFailedWish(wishId);
      addToast("Email retry sent successfully!", "success");
      await loadData();
    } catch (err: any) {
      addToast(err.message || "Retry failed", "error");
    }
  };

  // Friend actions
  const handleAddFriend = async (data: Partial<Friend>) => {
    try {
      await api.createFriend(data);
      addToast(`Added ${data.name} to monitored occasions!`, "success");
      await loadData();
    } catch (err: any) {
      addToast(err.message || "Failed to add friend", "error");
      throw err;
    }
  };

  const handleUpdateFriend = async (id: number, data: Partial<Friend>) => {
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
      addToast("Contact removed from registry.", "info");
      await loadData();
    } catch (err: any) {
      addToast(err.message || "Failed to delete friend", "error");
    }
  };

  // Settings actions
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

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        onRunScan={handleRunScan}
        isScanning={isScanning}
        onOpenTestEmail={() => setIsTestEmailOpen(true)}
      />

      {/* Main Content Area */}
      <main style={{
        maxWidth: 1300,
        width: "100%",
        margin: "0 auto",
        padding: "36px 24px 60px 24px",
        flex: 1
      }}>
        {activeTab === "dashboard" && (
          <DashboardView
            stats={stats}
            todayOccasions={todayOccasions}
            upcomingOccasions={upcomingOccasions}
            onNavigateToApprovals={() => setActiveTab("approvals")}
            onNavigateToFriends={() => setActiveTab("friends")}
            onNavigateToSettings={() => setActiveTab("settings")}
            onPreviewWish={(id) => setPreviewFriendId(id)}
          />
        )}

        {activeTab === "approvals" && (
          <ApprovalQueueView
            pendingWishes={pendingWishes}
            onApproveAndSend={handleApproveAndSend}
            onRejectWish={handleRejectWish}
            onRegenerateWish={handleRegenerateWish}
            isProcessing={isLoading}
          />
        )}

        {activeTab === "friends" && (
          <FriendsView
            friends={friends}
            onAddFriend={handleAddFriend}
            onUpdateFriend={handleUpdateFriend}
            onDeleteFriend={handleDeleteFriend}
            onPreviewWish={(id) => setPreviewFriendId(id)}
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

      {/* Modals */}
      <TestEmailModal
        isOpen={isTestEmailOpen}
        onClose={() => setIsTestEmailOpen(false)}
        onSendTest={handleSendTestEmail}
        gmailConnected={stats?.gmail_connected ?? false}
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
