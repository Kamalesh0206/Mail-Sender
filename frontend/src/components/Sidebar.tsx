import React from "react";
import {
  LayoutDashboard,
  Heart,
  Quote,
  Users,
  Calendar,
  History,
  Settings,
  Play,
  Mail,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { DashboardOverview } from "../api";

interface SidebarProps {
  activeTab: "dashboard" | "wishes" | "quotes" | "friends" | "calendar" | "history" | "settings";
  setActiveTab: (tab: "dashboard" | "wishes" | "quotes" | "friends" | "calendar" | "history" | "settings") => void;
  dashboard: DashboardOverview | null;
  onRunScan: () => void;
  isScanning: boolean;
  onOpenTestEmail: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  dashboard,
  onRunScan,
  isScanning,
  onOpenTestEmail
}) => {
  const navItems: Array<{
    id: "dashboard" | "wishes" | "quotes" | "friends" | "calendar" | "history" | "settings";
    label: string;
    icon: any;
    count?: number;
  }> = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "wishes", label: "Wishes", icon: Heart, count: dashboard?.pending_approval_count },
    { id: "quotes", label: "Quotes", icon: Quote },
    { id: "friends", label: "Friends & Groups", icon: Users },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "history", label: "Email History", icon: History },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside style={{
      width: 260,
      background: "rgba(12, 17, 29, 0.95)",
      borderRight: "1px solid var(--border-subtle)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      height: "100vh",
      position: "sticky",
      top: 0,
      zIndex: 100,
      padding: "24px 16px"
    }}>
      <div>
        {/* Brand Header */}
        <div style={{ padding: "0 8px 24px 8px", borderBottom: "1px solid var(--border-subtle)", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: "var(--radius-md)",
              background: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: "0 4px 12px rgba(99, 102, 241, 0.4)"
            }}>
              <Heart size={20} style={{ fill: "currentColor" }} />
            </div>
            <div>
              <div style={{
                fontFamily: "var(--font-heading)",
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: "#ffffff"
              }}>
                WishMail AI
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.2 }}>
                Personal wishes. Meaningful quotes.
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}-btn`}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: "var(--radius-sm)",
                  background: isActive ? "rgba(99, 102, 241, 0.15)" : "transparent",
                  color: isActive ? "#ffffff" : "var(--text-secondary)",
                  border: isActive ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid transparent",
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  transition: "var(--transition-fast)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Icon size={18} style={{ color: isActive ? "#a5b4fc" : "inherit" }} />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span style={{
                    background: "var(--status-warning)",
                    color: "#000",
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: "var(--radius-full)",
                    padding: "1px 7px"
                  }}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / Controls */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid var(--border-subtle)", paddingTop: 16 }}>
        {/* Gmail Status Pill */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          background: dashboard?.gmail_connected ? "var(--status-success-bg)" : "rgba(255, 255, 255, 0.03)",
          borderRadius: "var(--radius-sm)",
          border: `1px solid ${dashboard?.gmail_connected ? "rgba(16, 185, 129, 0.3)" : "var(--border-subtle)"}`,
          fontSize: 12
        }}>
          {dashboard?.gmail_connected ? (
            <>
              <CheckCircle2 size={14} style={{ color: "var(--status-success)" }} />
              <span style={{ color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {dashboard.gmail_email || "Gmail Connected"}
              </span>
            </>
          ) : (
            <>
              <AlertCircle size={14} style={{ color: "var(--status-warning)" }} />
              <span style={{ color: "var(--text-muted)" }}>Gmail Disconnected</span>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <button
          id="sidebar-scan-btn"
          className="btn-primary"
          onClick={onRunScan}
          disabled={isScanning}
          style={{ width: "100%", padding: "9px 12px", fontSize: 13 }}
        >
          <Play size={13} className={isScanning ? "animate-spin" : ""} style={{ fill: "currentColor" }} />
          <span>{isScanning ? "Scanning..." : "Run Daily Check"}</span>
        </button>

        <button
          className="btn-secondary"
          onClick={onOpenTestEmail}
          style={{ width: "100%", padding: "8px 12px", fontSize: 12 }}
        >
          <Mail size={13} />
          <span>Send Test Email</span>
        </button>
      </div>
    </aside>
  );
};
