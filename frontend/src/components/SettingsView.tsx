import React, { useState, useEffect } from "react";
import {
  Settings,
  Mail,
  Lock,
  ExternalLink,
  Power,
  Clock,
  Globe,
  Sparkles,
  Save,
  CheckCircle2,
  AlertTriangle,
  Send
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
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [defaultSendTime, setDefaultSendTime] = useState("08:00");
  const [defaultWishTone, setDefaultWishTone] = useState("Friendly");
  const [autoSendWishes, setAutoSendWishes] = useState(false);
  const [autoSendQuotes, setAutoSendQuotes] = useState(true);
  const [quoteGreeting, setQuoteGreeting] = useState("Hi {{friend_name}},");
  const [quoteClosing, setQuoteClosing] = useState("Have a great day!");
  const [senderName, setSenderName] = useState("Kamalesh");
  const [signature, setSignature] = useState("Best wishes,\nKamalesh");
  const [aiModel, setAiModel] = useState("gemini-2.5-flash");
  const [aiPersonalization, setAiPersonalization] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (settings) {
      setTimezone(settings.timezone || "Asia/Kolkata");
      setDefaultSendTime(settings.default_send_time || "08:00");
      setDefaultWishTone(settings.default_wish_tone || "Friendly");
      setAutoSendWishes(settings.auto_send_wishes ?? false);
      setAutoSendQuotes(settings.auto_send_quotes ?? true);
      setQuoteGreeting(settings.default_quote_greeting || "Hi {{friend_name}},");
      setQuoteClosing(settings.default_quote_closing || "Have a great day!");
      setSenderName(settings.sender_name || "Kamalesh");
      setSignature(settings.email_signature || "Best wishes,\nKamalesh");
      setAiModel(settings.ai_model || "gemini-2.5-flash");
      setAiPersonalization(settings.ai_personalization ?? true);
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg(null);
    try {
      await onUpdateSettings({
        timezone,
        default_send_time: defaultSendTime,
        default_wish_tone: defaultWishTone,
        auto_send_wishes: autoSendWishes,
        auto_send_quotes: autoSendQuotes,
        default_quote_greeting: quoteGreeting,
        default_quote_closing: quoteClosing,
        sender_name: senderName,
        email_signature: signature,
        ai_model: aiModel,
        ai_personalization: aiPersonalization
      });
      setStatusMsg({ text: "Settings saved successfully! Scheduler updated.", type: "success" });
    } catch (err: any) {
      setStatusMsg({ text: err.message || "Failed to save settings.", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const resp = await api.getGoogleAuthUrl();
      if (resp.authorization_url) window.location.href = resp.authorization_url;
    } catch (err: any) {
      setStatusMsg({ text: `Google OAuth Error: ${err.message}. Check GOOGLE_CLIENT_ID in .env`, type: "error" });
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!confirm("Are you sure you want to disconnect Gmail? Automated sending will pause.")) return;
    try {
      await api.disconnectGmail();
      await onRefreshAuth();
      setStatusMsg({ text: "Gmail account disconnected successfully.", type: "success" });
    } catch (err: any) {
      setStatusMsg({ text: err.message || "Failed to disconnect.", type: "error" });
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, maxWidth: 900 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
          <Settings size={24} style={{ color: "var(--primary)" }} />
          <span>WishMail AI Settings & Integrations</span>
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
          Manage your Gmail connection, Asia/Kolkata timezone, automated sending modes, and AI preferences.
        </p>
      </div>

      {statusMsg && (
        <div style={{
          background: statusMsg.type === "success" ? "var(--status-success-bg)" : "var(--status-danger-bg)",
          border: `1px solid ${statusMsg.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
          borderRadius: "var(--radius-sm)",
          padding: "12px 16px",
          color: statusMsg.type === "success" ? "#34d399" : "#f87171",
          fontSize: 14,
          display: "flex",
          alignItems: "center",
          gap: 10
        }}>
          {statusMsg.type === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Gmail Integration Card */}
      <div className="glass-card" style={{ padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: "var(--radius-md)",
              background: "rgba(239, 68, 68, 0.15)",
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

          <span className={`badge ${settings?.gmail_connected ? "badge-success" : "badge-warning"}`}>
            {settings?.gmail_connected ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
            {settings?.gmail_connected ? "Connected" : "Not Connected"}
          </span>
        </div>

        <div style={{
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-sm)",
          padding: 18,
          marginBottom: 16
        }}>
          {settings?.gmail_connected ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Connected Google Account:</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginTop: 2 }}>
                  {settings.gmail_email || "Active Gmail Account"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" className="btn-secondary" onClick={onOpenTestEmail} style={{ fontSize: 13, padding: "8px 14px" }}>
                  <Send size={13} />
                  <span>Send Test Email</span>
                </button>
                <button type="button" className="btn-danger" onClick={handleDisconnectGoogle} style={{ fontSize: 13, padding: "8px 14px" }}>
                  <Power size={13} />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, maxWidth: 520 }}>
                Authorize WishMail AI with your Google account via OAuth 2.0. We request the minimum required permissions to send emails and never access or store passwords.
              </p>
              <button type="button" className="btn-primary" onClick={handleConnectGoogle} style={{ fontSize: 13, padding: "10px 18px", whiteSpace: "nowrap" }}>
                <ExternalLink size={14} />
                <span>Connect Gmail</span>
              </button>
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)" }}>
          <Lock size={14} style={{ color: "var(--status-success)" }} />
          <span>Security: Refresh tokens are encrypted using AES-128 Fernet key at rest.</span>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Localization & Daily Schedule */}
        <div className="glass-card" style={{ padding: 28 }}>
          <h3 style={{ fontSize: 17, marginBottom: 18, display: "flex", alignItems: "center", gap: 10 }}>
            <Globe size={18} style={{ color: "var(--primary)" }} />
            <span>Timezone & Schedule</span>
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Application Timezone
              </label>
              <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+05:30) [Default]</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Default Daily Send Time
              </label>
              <input
                type="time"
                value={defaultSendTime}
                onChange={(e) => setDefaultSendTime(e.target.value)}
                required
              />
              <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, display: "block" }}>
                APScheduler scans everyday at this time in {timezone}
              </span>
            </div>
          </div>
        </div>

        {/* Automation Modes */}
        <div className="glass-card" style={{ padding: 28 }}>
          <h3 style={{ fontSize: 17, marginBottom: 18, display: "flex", alignItems: "center", gap: 10 }}>
            <Sparkles size={18} style={{ color: "var(--primary)" }} />
            <span>Automation & Approval Modes</span>
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div style={{
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: 16
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>Wishes Auto-Send</span>
                <input
                  type="checkbox"
                  checked={autoSendWishes}
                  onChange={(e) => setAutoSendWishes(e.target.checked)}
                  style={{ width: "auto", cursor: "pointer" }}
                />
              </div>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
                {autoSendWishes
                  ? "AUTO MODE: Sends personalized occasion wishes automatically at 8:00 AM."
                  : "APPROVAL MODE (Default): Staged in Approval Queue. Sends only after you click Approve."}
              </p>
            </div>

            <div style={{
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: 16
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>Quotes Auto-Send</span>
                <input
                  type="checkbox"
                  checked={autoSendQuotes}
                  onChange={(e) => setAutoSendQuotes(e.target.checked)}
                  style={{ width: "auto", cursor: "pointer" }}
                />
              </div>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
                Automatically dispatches scheduled quote broadcasts at their designated date & time.
              </p>
            </div>
          </div>
        </div>

        {/* Tone, AI Personalization & Templates */}
        <div className="glass-card" style={{ padding: 28 }}>
          <h3 style={{ fontSize: 17, marginBottom: 18 }}>AI & Email Content Defaults</h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Default Wish Tone
              </label>
              <select value={defaultWishTone} onChange={(e) => setDefaultWishTone(e.target.value)}>
                <option value="Friendly">Friendly</option>
                <option value="Casual">Casual</option>
                <option value="Emotional">Emotional</option>
                <option value="Funny">Funny</option>
                <option value="Professional">Professional</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                AI Model Engine
              </label>
              <select value={aiModel} onChange={(e) => setAiModel(e.target.value)}>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Ultra Fast)</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Standard)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deeply Personal)</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Default Quote Greeting
              </label>
              <input
                type="text"
                value={quoteGreeting}
                onChange={(e) => setQuoteGreeting(e.target.value)}
                placeholder="Hi {{friend_name}},"
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Default Quote Closing
              </label>
              <input
                type="text"
                value={quoteClosing}
                onChange={(e) => setQuoteClosing(e.target.value)}
                placeholder="Have a great day!"
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Sender Name
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Email Signature
              </label>
              <textarea
                rows={3}
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" className="btn-primary" disabled={isSaving} style={{ padding: "12px 28px" }}>
            <Save size={16} />
            <span>{isSaving ? "Saving..." : "Save Settings"}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
