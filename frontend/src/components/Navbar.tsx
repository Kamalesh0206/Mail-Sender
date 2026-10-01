import React from "react";
import { Sparkles, Calendar, CheckCircle2, Users, History, Settings, Play, Mail, ShieldAlert, Zap } from "lucide-react";
import { DashboardStats } from "../api";

interface NavbarProps {
  activeTab: "dashboard" | "approvals" | "friends" | "history" | "settings";
  setActiveTab: (tab: "dashboard" | "approvals" | "friends" | "history" | "settings") => void;
  stats: DashboardStats | null;
  onRunScan: () => void;
  isScanning: boolean;
  onOpenTestEmail: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  stats,
  onRunScan,
  isScanning,
  onOpenTestEmail
}) => {
  return (
    <header style={{
      borderBottom: "1px solid var(--border-subtle)",
      background: "rgba(10, 13, 20, 0.8)",
      backdropFilter: "blur(20px)",
      position: "sticky",
      top: 0,
      zIndex: 100,
      padding: "0 24px"
    }}>
      <div style={{
        maxWidth: 1300,
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 72
      }}>
        {/* Brand Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: "var(--radius-md)",
            background: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 16px rgba(99, 102, 241, 0.4)",
            color: "#ffffff"
          }}>
            <Sparkles size={22} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                fontFamily: "var(--font-heading)",
                fontSize: 19,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                background: "linear-gradient(90deg, #ffffff 0%, #cbd5e1 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}>
                WishesAI
              </span>
              <span className="badge badge-primary" style={{ fontSize: 11, padding: "2px 8px" }}>
                AGENT
              </span>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
              Autonomous Birthday & Occasions Agent
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            id="nav-dashboard-btn"
            onClick={() => setActiveTab("dashboard")}
            style={{
              padding: "8px 14px",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              background: activeTab === "dashboard" ? "rgba(255, 255, 255, 0.08)" : "transparent",
              color: activeTab === "dashboard" ? "var(--text-primary)" : "var(--text-secondary)",
              border: activeTab === "dashboard" ? "1px solid var(--border-card)" : "1px solid transparent"
            }}
          >
            <Calendar size={16} />
            <span>Dashboard</span>
          </button>

          <button
            id="nav-approvals-btn"
            onClick={() => setActiveTab("approvals")}
            style={{
              padding: "8px 14px",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              position: "relative",
              background: activeTab === "approvals" ? "rgba(255, 255, 255, 0.08)" : "transparent",
              color: activeTab === "approvals" ? "var(--text-primary)" : "var(--text-secondary)",
              border: activeTab === "approvals" ? "1px solid var(--border-card)" : "1px solid transparent"
            }}
          >
            <CheckCircle2 size={16} />
            <span>Approvals</span>
            {stats && stats.pending_count > 0 && (
              <span style={{
                background: "var(--status-warning)",
                color: "#000",
                fontSize: 11,
                fontWeight: 700,
                borderRadius: "var(--radius-full)",
                padding: "1px 7px",
                marginLeft: 2
              }}>
                {stats.pending_count}
              </span>
            )}
          </button>

          <button
            id="nav-friends-btn"
            onClick={() => setActiveTab("friends")}
            style={{
              padding: "8px 14px",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              background: activeTab === "friends" ? "rgba(255, 255, 255, 0.08)" : "transparent",
              color: activeTab === "friends" ? "var(--text-primary)" : "var(--text-secondary)",
              border: activeTab === "friends" ? "1px solid var(--border-card)" : "1px solid transparent"
            }}
          >
            <Users size={16} />
            <span>Friends</span>
          </button>

          <button
            id="nav-history-btn"
            onClick={() => setActiveTab("history")}
            style={{
              padding: "8px 14px",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              background: activeTab === "history" ? "rgba(255, 255, 255, 0.08)" : "transparent",
              color: activeTab === "history" ? "var(--text-primary)" : "var(--text-secondary)",
              border: activeTab === "history" ? "1px solid var(--border-card)" : "1px solid transparent"
            }}
          >
            <History size={16} />
            <span>History</span>
          </button>

          <button
            id="nav-settings-btn"
            onClick={() => setActiveTab("settings")}
            style={{
              padding: "8px 14px",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              background: activeTab === "settings" ? "rgba(255, 255, 255, 0.08)" : "transparent",
              color: activeTab === "settings" ? "var(--text-primary)" : "var(--text-secondary)",
              border: activeTab === "settings" ? "1px solid var(--border-card)" : "1px solid transparent"
            }}
          >
            <Settings size={16} />
            <span>Settings</span>
          </button>
        </nav>

        {/* Action Controls & Status */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Mode Pill */}
          {stats && (
            <div
              className={`badge ${stats.automation_mode === "APPROVAL" ? "badge-info" : "badge-success"}`}
              title={stats.automation_mode === "APPROVAL" ? "Emails require your manual approval before sending" : "Emails send automatically upon daily check"}
            >
              <span className="pulse-indicator" style={{
                backgroundColor: stats.automation_mode === "APPROVAL" ? "var(--status-info)" : "var(--status-success)"
              }} />
              {stats.automation_mode === "APPROVAL" ? "APPROVAL MODE" : "AUTO MODE"}
            </div>
          )}

          {/* Test Email Button */}
          <button
            id="test-email-header-btn"
            className="btn-secondary"
            onClick={onOpenTestEmail}
            title="Send a test email to verify Gmail API integration"
            style={{ padding: "8px 14px", fontSize: 13 }}
          >
            <Mail size={15} />
            <span>Test Email</span>
          </button>

          {/* Trigger Scan Button */}
          <button
            id="run-scan-btn"
            className="btn-primary"
            onClick={onRunScan}
            disabled={isScanning}
            style={{ padding: "8px 16px", fontSize: 13 }}
          >
            <Play size={14} className={isScanning ? "animate-spin" : ""} style={{ fill: "currentColor" }} />
            <span>{isScanning ? "Scanning..." : "Run Check Now"}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
