import React, { useState } from "react";
import { Mail, Send, X, AlertCircle, CheckCircle2 } from "lucide-react";

interface TestEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendTest: (recipientEmail: string, subject?: string, body?: string) => Promise<any>;
  gmailConnected: boolean;
}

export const TestEmailModal: React.FC<TestEmailModalProps> = ({
  isOpen,
  onClose,
  onSendTest,
  gmailConnected
}) => {
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("Test Birthday Wish from AI Agent 🎉");
  const [body, setBody] = useState(
    "Hi there,\n\nThis is a test email sent from your AI Birthday & Wishes Email Agent to verify that your Google Gmail API integration and OAuth permissions are working flawlessly!\n\nHave a wonderful day!"
  );
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim() || !recipient.includes("@")) {
      setError("Please enter a valid recipient email address.");
      return;
    }

    setIsSending(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const resp = await onSendTest(recipient.trim(), subject.trim(), body.trim());
      setSuccessMsg(`Test email sent successfully! Message ID: ${resp.message_id || "verified"}`);
      setTimeout(() => {
        // Leave message visible for a moment then allow user to close
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to dispatch test email.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0, 0, 0, 0.75)",
      backdropFilter: "blur(8px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: 16
    }}>
      <div className="glass-card" style={{
        maxWidth: 540,
        width: "100%",
        padding: 32,
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-lg)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Mail size={20} style={{ color: "var(--primary)" }} />
            <span>Send Test Email</span>
          </h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {!gmailConnected && (
          <div style={{
            background: "var(--status-warning-bg)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            borderRadius: "var(--radius-sm)",
            padding: "10px 14px",
            color: "#fbbf24",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16
          }}>
            <AlertCircle size={16} />
            <span>Gmail is currently disconnected. Connect Gmail before sending tests.</span>
          </div>
        )}

        {error && (
          <div style={{
            background: "var(--status-danger-bg)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "var(--radius-sm)",
            padding: "10px 14px",
            color: "#f87171",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div style={{
            background: "var(--status-success-bg)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            borderRadius: "var(--radius-sm)",
            padding: "10px 14px",
            color: "#34d399",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16
          }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Recipient Email Address *
            </label>
            <input
              type="email"
              placeholder="e.g. your-own-email@gmail.com"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Test Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Test Email Body
            </label>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSending}>
              Cancel
            </button>
            <button
              id="submit-test-email-btn"
              type="submit"
              className="btn-primary"
              disabled={isSending || !gmailConnected}
            >
              <Send size={15} />
              <span>{isSending ? "Sending..." : "Dispatch Test Email"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
