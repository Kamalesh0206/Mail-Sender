import React, { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sparkles,
  Send,
  Edit3,
  Calendar,
  User,
  HeartHandshake,
  MessageSquare
} from "lucide-react";
import confetti from "canvas-confetti";
import { WishItem } from "../api";

interface ApprovalQueueViewProps {
  pendingWishes: WishItem[];
  onApproveAndSend: (wishId: number, customSubject?: string, customBody?: string) => Promise<void>;
  onRejectWish: (wishId: number) => Promise<void>;
  onRegenerateWish: (wishId: number, tone: string) => Promise<void>;
  isProcessing: boolean;
}

export const ApprovalQueueView: React.FC<ApprovalQueueViewProps> = ({
  pendingWishes,
  onApproveAndSend,
  onRejectWish,
  onRegenerateWish,
  isProcessing
}) => {
  // Local editable draft state mapped by wish ID
  const [editedSubjects, setEditedSubjects] = useState<Record<number, string>>({});
  const [editedBodies, setEditedBodies] = useState<Record<number, string>>({});
  const [selectedTones, setSelectedTones] = useState<Record<number, string>>({});
  const [actionInProgress, setActionInProgress] = useState<number | null>(null);

  const tones = ["Friendly", "Professional", "Funny", "Emotional", "Casual"];

  const handleSubjectChange = (id: number, text: string) => {
    setEditedSubjects(prev => ({ ...prev, [id]: text }));
  };

  const handleBodyChange = (id: number, text: string) => {
    setEditedBodies(prev => ({ ...prev, [id]: text }));
  };

  const handleToneChange = (id: number, tone: string) => {
    setSelectedTones(prev => ({ ...prev, [id]: tone }));
  };

  const handleApprove = async (wish: WishItem) => {
    setActionInProgress(wish.id);
    const subject = editedSubjects[wish.id] !== undefined ? editedSubjects[wish.id] : wish.generated_subject;
    const body = editedBodies[wish.id] !== undefined ? editedBodies[wish.id] : wish.generated_body;

    try {
      await onApproveAndSend(wish.id, subject, body);
      // Trigger festive celebration confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRegenerate = async (wish: WishItem) => {
    setActionInProgress(wish.id);
    const tone = selectedTones[wish.id] || wish.tone || "Friendly";
    try {
      await onRegenerateWish(wish.id, tone);
      // Reset local edits so the newly generated text is reflected
      setEditedSubjects(prev => {
        const copy = { ...prev };
        delete copy[wish.id];
        return copy;
      });
      setEditedBodies(prev => {
        const copy = { ...prev };
        delete copy[wish.id];
        return copy;
      });
    } finally {
      setActionInProgress(null);
    }
  };

  if (pendingWishes.length === 0) {
    return (
      <div className="glass-card" style={{ padding: "64px 32px", textAlign: "center" }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "rgba(16, 185, 129, 0.15)",
          color: "#34d399",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px auto"
        }}>
          <CheckCircle2 size={32} />
        </div>
        <h2 style={{ fontSize: 22, marginBottom: 8 }}>Approval Queue is Clean!</h2>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 450, margin: "0 auto" }}>
          All wishes for today have been reviewed and approved. When the next scheduled daily scan runs at 8:00 AM, pending drafts will appear here.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 24, margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
            <span>Approval Queue</span>
            <span className="badge badge-warning" style={{ fontSize: 13, padding: "3px 10px" }}>
              {pendingWishes.length} Pending Review
            </span>
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
            Review, edit, or regenerate personalized AI messages before sending via Gmail.
          </p>
        </div>
      </div>

      {/* List of Pending Wishes */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {pendingWishes.map((wish) => {
          const currentSubject = editedSubjects[wish.id] !== undefined ? editedSubjects[wish.id] : wish.generated_subject;
          const currentBody = editedBodies[wish.id] !== undefined ? editedBodies[wish.id] : wish.generated_body;
          const currentTone = selectedTones[wish.id] || wish.tone || "Friendly";
          const isCurrentAction = actionInProgress === wish.id;

          return (
            <div key={wish.id} className="glass-card" style={{ padding: 28, position: "relative" }}>
              {/* Header: Recipient Metadata */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                paddingBottom: 20,
                borderBottom: "1px solid var(--border-subtle)",
                marginBottom: 20
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: "var(--radius-md)",
                    background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    fontWeight: 700
                  }}>
                    {wish.recipient_name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <h3 style={{ fontSize: 18, margin: 0 }}>{wish.recipient_name}</h3>
                      <span className="badge badge-primary">{wish.occasion_type}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, fontSize: 13, color: "var(--text-secondary)" }}>
                      <span>{wish.recipient_email}</span>
                      <span>•</span>
                      <span>Target Date: {wish.scheduled_for}</span>
                      <span>•</span>
                      <span>Year: {wish.year}</span>
                    </div>
                  </div>
                </div>

                {/* Tone Selector Pills */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", marginRight: 4 }}>Tone:</span>
                  {tones.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleToneChange(wish.id, t)}
                      style={{
                        padding: "4px 10px",
                        fontSize: 12,
                        borderRadius: "var(--radius-full)",
                        border: currentTone.toLowerCase() === t.toLowerCase() ? "1px solid var(--primary)" : "1px solid var(--border-subtle)",
                        background: currentTone.toLowerCase() === t.toLowerCase() ? "var(--primary-light)" : "rgba(255, 255, 255, 0.03)",
                        color: currentTone.toLowerCase() === t.toLowerCase() ? "#a5b4fc" : "var(--text-secondary)"
                      }}
                    >
                      {t}
                    </button>
                  ))}
                  <button
                    className="btn-secondary"
                    onClick={() => handleRegenerate(wish)}
                    disabled={isCurrentAction || isProcessing}
                    title="Regenerate with Gemini API"
                    style={{ padding: "5px 10px", fontSize: 12, marginLeft: 6 }}
                  >
                    <RefreshCw size={13} className={isCurrentAction ? "animate-spin" : ""} />
                    <span>Regenerate</span>
                  </button>
                </div>
              </div>

              {/* Editable Fields: Subject & Body */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={currentSubject}
                    onChange={(e) => handleSubjectChange(wish.id, e.target.value)}
                    style={{ fontSize: 15, fontWeight: 500 }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                    Email Body (Plain Text + Signature)
                  </label>
                  <textarea
                    rows={6}
                    value={currentBody}
                    onChange={(e) => handleBodyChange(wish.id, e.target.value)}
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: 14,
                      lineHeight: 1.6,
                      resize: "vertical"
                    }}
                  />
                </div>
              </div>

              {/* Actions Footer */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 24,
                paddingTop: 18,
                borderTop: "1px solid var(--border-subtle)"
              }}>
                <button
                  className="btn-danger"
                  onClick={() => onRejectWish(wish.id)}
                  disabled={isCurrentAction || isProcessing}
                  title="Discard this wish without sending"
                >
                  <XCircle size={15} />
                  <span>Reject & Skip</span>
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button
                    id={`approve-send-btn-${wish.id}`}
                    className="btn-success"
                    onClick={() => handleApprove(wish)}
                    disabled={isCurrentAction || isProcessing}
                    style={{ padding: "10px 22px" }}
                  >
                    <Send size={15} />
                    <span>{isCurrentAction ? "Dispatching..." : "Approve & Send"}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
