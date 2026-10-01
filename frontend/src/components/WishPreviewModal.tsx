import React, { useState, useEffect } from "react";
import { Sparkles, X, RefreshCw, Copy, Check } from "lucide-react";
import { api, Friend } from "../api";

interface WishPreviewModalProps {
  friendId: number | null;
  onClose: () => void;
}

export const WishPreviewModal: React.FC<WishPreviewModalProps> = ({ friendId, onClose }) => {
  const [tone, setTone] = useState("Friendly");
  const [customInstructions, setCustomInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ subject: string; body: string } | null>(null);
  const [friendData, setFriendData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (friendId) {
      generate(friendId, tone);
    } else {
      setResult(null);
      setFriendData(null);
    }
  }, [friendId]);

  const generate = async (fId: number, currentTone: string) => {
    setLoading(true);
    setCopied(false);
    try {
      const resp = await api.generateWishPreview(fId, currentTone, customInstructions);
      setResult(resp.preview);
      setFriendData(resp.friend);
    } catch (err: any) {
      console.error("Preview generation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!friendId) return null;

  const handleCopy = () => {
    if (!result) return;
    const fullText = `Subject: ${result.subject}\n\n${result.body}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tones = ["Friendly", "Professional", "Funny", "Emotional", "Casual"];

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
        padding: "22px 20px",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-lg)",
        maxHeight: "90dvh",
        overflowY: "auto"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Sparkles size={20} style={{ color: "#a5b4fc" }} />
            <span>AI Wish Preview</span>
          </h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {friendData && (
          <div style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            padding: "10px 14px",
            marginBottom: 16,
            fontSize: 13,
            color: "var(--text-secondary)"
          }}>
            Generating for: <strong style={{ color: "#fff" }}>{friendData.name}</strong> ({friendData.occasion})
          </div>
        )}

        {/* Tone Selector */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
            Select Tone:
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {tones.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTone(t);
                  generate(friendId, t);
                }}
                disabled={loading}
                style={{
                  padding: "6px 12px",
                  fontSize: 13,
                  borderRadius: "var(--radius-full)",
                  border: tone === t ? "1px solid var(--primary)" : "1px solid var(--border-card)",
                  background: tone === t ? "var(--primary-light)" : "rgba(255, 255, 255, 0.03)",
                  color: tone === t ? "#a5b4fc" : "var(--text-secondary)"
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Preview Output */}
        {loading ? (
          <div style={{
            padding: "48px 24px",
            textAlign: "center",
            color: "var(--text-muted)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12
          }}>
            <RefreshCw size={24} className="animate-spin" style={{ color: "var(--primary)" }} />
            <span>Consulting Google Gemini AI...</span>
          </div>
        ) : result ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 700 }}>
                Subject
              </div>
              <div style={{
                background: "rgba(255, 255, 255, 0.04)",
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-card)",
                fontWeight: 600,
                fontSize: 14,
                marginTop: 4
              }}>
                {result.subject}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 700 }}>
                Body
              </div>
              <div style={{
                background: "rgba(255, 255, 255, 0.04)",
                padding: 16,
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-card)",
                whiteSpace: "pre-wrap",
                lineHeight: 1.6,
                fontSize: 14,
                marginTop: 4,
                maxHeight: 240,
                overflowY: "auto"
              }}>
                {result.body}
              </div>
            </div>
          </div>
        ) : null}

        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 24,
          paddingTop: 16,
          borderTop: "1px solid var(--border-subtle)"
        }}>
          <button
            className="btn-secondary"
            onClick={handleCopy}
            disabled={!result}
            style={{ fontSize: 13 }}
          >
            {copied ? <Check size={14} style={{ color: "#34d399" }} /> : <Copy size={14} />}
            <span>{copied ? "Copied!" : "Copy to Clipboard"}</span>
          </button>
          <button className="btn-primary" onClick={onClose} style={{ fontSize: 13 }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
