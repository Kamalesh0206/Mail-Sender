import React, { useState, useEffect } from "react";
import {
  Settings,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Save,
  Lock,
  ExternalLink,
  Power
} from "lucide-react";
import { AppSettings, api } from "../api";

interface SettingsViewProps {
  settings: AppSettings | null;
  onUpdateSettings: (data: Partial<AppSettings>) => Promise<void>;
  onOpenTestEmail: () => void;
  onRefreshAuth: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onOpenTestEmail,
  onRefreshAuth
}) => {
  const [automationMode, setAutomationMode] = useState<"APPROVAL" | "AUTO">("APPROVAL");
  const [dailySendTime, setDailySendTime] = useState("08:00");
  const [defaultTone, setDefaultTone] = useState("Friendly");
  const [senderName, setSenderName] = useState("Kamalesh");
  const [signature, setSignature] = useState("Best wishes,\nKamalesh");
  const [aiModel, setAiModel] = useState("gemini-2.5-flash");
  const [isSaving, setIsSaving] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (settings) {
      setAutomationMode(settings.automation_mode);
      setDailySendTime(settings.daily_send_time || "08:00");
      setDefaultTone(settings.default_tone || "Friendly");
      setSenderName(settings.sender_name || "Kamalesh");
      setSignature(settings.email_signature || "Best wishes,\nKamalesh");
      setAiModel(settings.ai_model || "gemini-2.5-flash");
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    try {
      await onUpdateSettings({
        automation_mode: automationMode,
        daily_send_time: dailySendTime,
        default_tone: defaultTone,
        sender_name: senderName,
        email_signature: signature,
        ai_model: aiModel
      });
      setStatusMessage({ text: "Settings saved successfully! Scheduler updated.", type: "success" });
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Failed to save settings.", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectGoogle = async () => {
    setIsConnectingGoogle(true);
    setStatusMessage(null);
    try {
      const resp = await api.getGoogleAuthUrl();
      if (resp.authorization_url) {
        window.location.href = resp.authorization_url;
      }
    } catch (err: any) {
      setStatusMessage({
        text: `Google OAuth Error: ${err.message}. Please verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.`,
        type: "error"
      });
      setIsConnectingGoogle(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!confirm("Are you sure you want to disconnect Gmail? Automated sending will be paused.")) return;
    try {
      await api.disconnectGmail();
      await onRefreshAuth();
      setStatusMessage({ text: "Gmail account disconnected successfully.", type: "success" });
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Failed to disconnect.", type: "error" });
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, maxWidth: 900 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
          <span>Agent Configuration & Settings</span>
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
          Control Gmail API connection, daily scan triggers, safety approval mode, and AI models.
        </p>
      </div>

      {statusMessage && (
        <div style={{
          background: statusMessage.type === "success" ? "var(--status-success-bg)" : "var(--status-danger-bg)",
          border: `1px solid ${statusMessage.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
          borderRadius: "var(--radius-sm)",
          padding: "12px 16px",
          color: statusMessage.type === "success" ? "#34d399" : "#f87171",
          fontSize: 14,
          display: "flex",
          alignItems: "center",
          gap: 10
        }}>
          {statusMessage.type === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Section 1: Gmail Integration & OAuth */}
      <div className="glass-card" style={{ padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: "var(--radius-md)",
              background: "rgba(239, 68, 68, 0.12)",
              color: "#f87171",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Mail size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: 17, margin: 0 }}>Gmail API Integration</h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "2px 0 0 0" }}>
                Google OAuth 2.0 with minimal required permissions (gmail.send)
              </p>
            </div>
          </div>

          <div>
            {settings?.gmail_connected ? (
              <span className="badge badge-success">
                <CheckCircle2 size={13} />
                Connected
              </span>
            ) : (
              <span className="badge badge-warning">
                <AlertTriangle size={13} />
                Not Connected
              </span>
            )}
          </div>
        </div>

        <div style={{
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-sm)",
          padding: 18,
          marginBottom: 20
        }}>
          {settings?.gmail_connected ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Authenticated Google Account:</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginTop: 2 }}>
                  {settings.gmail_email || "Active Gmail Account"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onOpenTestEmail}
                  style={{ fontSize: 13, padding: "8px 14px" }}
                >
                  <Mail size={14} />
                  <span>Send Test Email</span>
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={handleDisconnectGoogle}
                  style={{ fontSize: 13, padding: "8px 14px" }}
                >
                  <Power size={14} />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, maxWidth: 500 }}>
                  Click below to authorize your Gmail account securely via official Google OAuth. The agent will only request permission to send emails and never accesses or reads your private inbox messages.
                </p>
              </div>
              <button
                id="connect-google-oauth-btn"
                type="button"
                className="btn-primary"
                onClick={handleConnectGoogle}
                disabled={isConnectingGoogle}
                style={{ fontSize: 13, padding: "10px 18px", whiteSpace: "nowrap" }}
              >
                <ExternalLink size={14} />
                <span>{isConnectingGoogle ? "Redirecting..." : "Connect Google Account"}</span>
              </button>
            </div>
          )}
        </div>

        {/* Security Note */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "var(--text-muted)" }}>
          <Lock size={14} style={{ color: "var(--status-success)" }} />
          <span>
            Security guarantee: We never store your Google password. Refresh tokens are encrypted at rest using AES-128 Fernet key.
          </span>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {/* Section 2: Automation & Approval Mode */}
        <div className="glass-card" style={{ padding: 28 }}>
          <h3 style={{ fontSize: 17, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
            <ShieldCheck size={20} style={{ color: "var(--primary)" }} />
            <span>Safety / Automation Mode</span>
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 18 }}>
            Choose whether to review AI wishes before they are sent or allow full autonomy.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Mode Option 1: Approval Mode */}
            <div
              onClick={() => setAutomationMode("APPROVAL")}
              style={{
                border: automationMode === "APPROVAL" ? "2px solid var(--primary)" : "1px solid var(--border-card)",
                background: automationMode === "APPROVAL" ? "rgba(99, 102, 241, 0.1)" : "rgba(255, 255, 255, 0.02)",
                borderRadius: "var(--radius-md)",
                padding: 20,
                cursor: "pointer",
                transition: "var(--transition-fast)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <input
                  type="radio"
                  name="automation_mode"
                  checked={automationMode === "APPROVAL"}
                  onChange={() => setAutomationMode("APPROVAL")}
                  style={{ width: "auto" }}
                />
                <span style={{ fontWeight: 700, fontSize: 15 }}>APPROVAL MODE</span>
                <span className="badge badge-success" style={{ fontSize: 10 }}>Recommended</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
                Generates personalized emails at 8:00 AM and stages them in the Approval Queue. Emails are ONLY sent after you click "Approve & Send".
              </p>
            </div>

            {/* Mode Option 2: Auto Mode */}
            <div
              onClick={() => setAutomationMode("AUTO")}
              style={{
                border: automationMode === "AUTO" ? "2px solid var(--status-success)" : "1px solid var(--border-card)",
                background: automationMode === "AUTO" ? "rgba(16, 185, 129, 0.1)" : "rgba(255, 255, 255, 0.02)",
                borderRadius: "var(--radius-md)",
                padding: 20,
                cursor: "pointer",
                transition: "var(--transition-fast)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <input
                  type="radio"
                  name="automation_mode"
                  checked={automationMode === "AUTO"}
                  onChange={() => setAutomationMode("AUTO")}
                  style={{ width: "auto" }}
                />
                <span style={{ fontWeight: 700, fontSize: 15 }}>AUTO MODE</span>
                <span className="badge badge-warning" style={{ fontSize: 10 }}>Hands-free</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
                Directly sends personalized birthday and occasion wishes through Gmail automatically at the scheduled time without manual review.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Schedule, AI Model & Default Tone */}
        <div className="glass-card" style={{ padding: 28 }}>
          <h3 style={{ fontSize: 17, marginBottom: 18, display: "flex", alignItems: "center", gap: 10 }}>
            <Clock size={20} style={{ color: "var(--primary)" }} />
            <span>Daily Schedule & AI Intelligence</span>
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Daily Scan Time (24h)
              </label>
              <input
                type="time"
                value={dailySendTime}
                onChange={(e) => setDailySendTime(e.target.value)}
                required
              />
              <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, display: "block" }}>
                APScheduler executes automatically every morning
              </span>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                AI Model Engine
              </label>
              <select value={aiModel} onChange={(e) => setAiModel(e.target.value)}>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Ultra Fast)</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Standard)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deeply Personal)</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Default Wish Tone
              </label>
              <select value={defaultTone} onChange={(e) => setDefaultTone(e.target.value)}>
                <option value="Friendly">Friendly</option>
                <option value="Professional">Professional</option>
                <option value="Funny">Funny</option>
                <option value="Emotional">Emotional</option>
                <option value="Casual">Casual</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Sender Profile & Custom Signature */}
        <div className="glass-card" style={{ padding: 28 }}>
          <h3 style={{ fontSize: 17, marginBottom: 18, display: "flex", alignItems: "center", gap: 10 }}>
            <Sparkles size={20} style={{ color: "var(--primary)" }} />
            <span>Sender Identity & Email Signature</span>
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Your Name (Sender Identity)
              </label>
              <input
                type="text"
                placeholder="e.g. Kamalesh"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Email Signature (Appended to all generated wishes)
              </label>
              <textarea
                rows={3}
                placeholder="Best wishes,\nKamalesh"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* Save Changes Button */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button id="save-settings-btn" type="submit" className="btn-primary" disabled={isSaving} style={{ padding: "12px 28px" }}>
            <Save size={16} />
            <span>{isSaving ? "Saving Configuration..." : "Save Settings"}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
