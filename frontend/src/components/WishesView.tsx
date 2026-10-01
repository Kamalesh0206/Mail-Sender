import React, { useState } from "react";
import {
  Heart,
  Sparkles,
  Send,
  XCircle,
  RefreshCw,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  Trash2,
  X,
  AlertCircle
} from "lucide-react";
import confetti from "canvas-confetti";
import { OccasionItem, EmailHistoryItem, Friend, api } from "../api";

interface WishesViewProps {
  occasions: OccasionItem[];
  pendingWishes: EmailHistoryItem[];
  friends: Friend[];
  autoSendMode: boolean;
  onToggleAutoSend: (enabled: boolean) => Promise<void>;
  onApproveWish: (historyId: number, subject?: string, body?: string) => Promise<void>;
  onRejectWish: (historyId: number) => Promise<void>;
  onRegenerateWish: (historyId: number, tone: string) => Promise<void>;
  onCreateOccasion: (data: any) => Promise<void>;
  onDeleteOccasion: (id: number) => Promise<void>;
  onPreviewWish: (friendId: number) => void;
  isLoading: boolean;
}

export const WishesView: React.FC<WishesViewProps> = ({
  occasions,
  pendingWishes,
  friends,
  autoSendMode,
  onToggleAutoSend,
  onApproveWish,
  onRejectWish,
  onRegenerateWish,
  onCreateOccasion,
  onDeleteOccasion,
  onPreviewWish,
  isLoading
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"pending" | "occasions">("pending");
  const [editedSubjects, setEditedSubjects] = useState<Record<number, string>>({});
  const [editedBodies, setEditedBodies] = useState<Record<number, string>>({});
  const [selectedTones, setSelectedTones] = useState<Record<number, string>>({});
  const [actionInProgress, setActionInProgress] = useState<number | null>(null);

  // Add Occasion modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<number>(friends[0]?.id || 1);
  const [occType, setOccType] = useState("Birthday");
  const [occTitle, setOccTitle] = useState("");
  const [occMonth, setOccMonth] = useState(10);
  const [occDay, setOccDay] = useState(5);
  const [occNotes, setOccNotes] = useState("");

  const tones = ["Friendly", "Casual", "Emotional", "Funny", "Professional"];

  const handleApprove = async (item: EmailHistoryItem) => {
    setActionInProgress(item.id);
    const subj = editedSubjects[item.id] !== undefined ? editedSubjects[item.id] : item.subject;
    const body = editedBodies[item.id] !== undefined ? editedBodies[item.id] : item.body;
    try {
      await onApproveWish(item.id, subj, body);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRegenerate = async (item: EmailHistoryItem) => {
    setActionInProgress(item.id);
    const tone = selectedTones[item.id] || "Friendly";
    try {
      await onRegenerateWish(item.id, tone);
      setEditedSubjects(p => { const c = { ...p }; delete c[item.id]; return c; });
      setEditedBodies(p => { const c = { ...p }; delete c[item.id]; return c; });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleAddOccasionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fr = friends.find(f => f.id === Number(selectedFriendId));
    const title = occTitle.trim() || `${fr?.name || "Friend"}'s ${occType}`;
    const dateStr = `${String(occDay).padStart(2, "0")} ${new Date(2000, occMonth - 1, 1).toLocaleString("default", { month: "long" })}`;

    await onCreateOccasion({
      friend_id: Number(selectedFriendId),
      occasion_type: occType,
      title: title,
      date_str: dateStr,
      month: occMonth,
      day: occDay,
      notes: occNotes.trim() || undefined
    });

    setIsAddModalOpen(false);
    setOccTitle("");
    setOccNotes("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
            <Heart size={26} style={{ color: "#ec4899", fill: "#ec4899" }} />
            <span>Wishes Module</span>
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
            Occasion-based AI-generated messages (Birthdays, Anniversaries & Custom Occasions).
          </p>
        </div>

        {/* Safety Mode Toggle Card */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 16px",
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-sm)"
        }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Dispatch Mode:</span>
          <button
            onClick={() => onToggleAutoSend(false)}
            style={{
              padding: "4px 10px",
              borderRadius: "var(--radius-sm)",
              fontSize: 12,
              fontWeight: 600,
              background: !autoSendMode ? "var(--status-info-bg)" : "transparent",
              color: !autoSendMode ? "#60a5fa" : "var(--text-muted)",
              border: !autoSendMode ? "1px solid rgba(59, 130, 246, 0.4)" : "1px solid transparent"
            }}
          >
            APPROVAL MODE (Safe)
          </button>
          <button
            onClick={() => onToggleAutoSend(true)}
            style={{
              padding: "4px 10px",
              borderRadius: "var(--radius-sm)",
              fontSize: 12,
              fontWeight: 600,
              background: autoSendMode ? "var(--status-success-bg)" : "transparent",
              color: autoSendMode ? "#34d399" : "var(--text-muted)",
              border: autoSendMode ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid transparent"
            }}
          >
            AUTO SEND MODE
          </button>
        </div>
      </div>

      {/* Tabs: Pending Approvals & All Occasions */}
      <div style={{ display: "flex", gap: 10, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 12 }}>
        <button
          onClick={() => setActiveSubTab("pending")}
          style={{
            padding: "8px 16px",
            borderRadius: "var(--radius-sm)",
            fontSize: 14,
            fontWeight: 600,
            background: activeSubTab === "pending" ? "rgba(99, 102, 241, 0.15)" : "transparent",
            color: activeSubTab === "pending" ? "#ffffff" : "var(--text-secondary)",
            border: activeSubTab === "pending" ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid transparent",
            display: "flex",
            alignItems: "center",
            gap: 8
          }}
        >
          <Clock size={15} />
          <span>Pending Approvals</span>
          {pendingWishes.length > 0 && (
            <span style={{ background: "var(--status-warning)", color: "#000", fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 999 }}>
              {pendingWishes.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab("occasions")}
          style={{
            padding: "8px 16px",
            borderRadius: "var(--radius-sm)",
            fontSize: 14,
            fontWeight: 600,
            background: activeSubTab === "occasions" ? "rgba(99, 102, 241, 0.15)" : "transparent",
            color: activeSubTab === "occasions" ? "#ffffff" : "var(--text-secondary)",
            border: activeSubTab === "occasions" ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid transparent",
            display: "flex",
            alignItems: "center",
            gap: 8
          }}
        >
          <Calendar size={15} />
          <span>Monitored Occasions ({occasions.length})</span>
        </button>
      </div>

      {/* Subtab 1: Pending Approvals Queue */}
      {activeSubTab === "pending" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {pendingWishes.length === 0 ? (
            <div className="glass-card" style={{ padding: "48px 24px", textAlign: "center" }}>
              <CheckCircle2 size={40} style={{ color: "#34d399", margin: "0 auto 12px auto" }} />
              <h3 style={{ fontSize: 18, marginBottom: 6 }}>Approval Queue is Clean!</h3>
              <p style={{ fontSize: 14, color: "var(--text-muted)", maxWidth: 460, margin: "0 auto" }}>
                All generated occasion wishes have been approved or delivered. When an occasion date arrives, pending drafts will appear here for 1-click review.
              </p>
            </div>
          ) : (
            pendingWishes.map((item) => {
              const currentSubj = editedSubjects[item.id] !== undefined ? editedSubjects[item.id] : item.subject;
              const currentBody = editedBodies[item.id] !== undefined ? editedBodies[item.id] : item.body;
              const currentTone = selectedTones[item.id] || "Friendly";
              const inProgress = actionInProgress === item.id;

              return (
                <div key={item.id} className="glass-card" style={{ padding: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <h3 style={{ fontSize: 17, margin: 0 }}>{item.recipient_name}</h3>
                        <span className="badge badge-primary">{item.occasion_name || "Occasion Wish"}</span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                        {item.recipient_email} • Date: {item.sent_date}
                      </div>
                    </div>

                    {/* Tone Selector & Regenerate */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Tone:</span>
                      {tones.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSelectedTones(p => ({ ...p, [item.id]: t }))}
                          style={{
                            padding: "3px 8px",
                            fontSize: 11,
                            borderRadius: 999,
                            background: currentTone === t ? "var(--primary-light)" : "transparent",
                            color: currentTone === t ? "#a5b4fc" : "var(--text-secondary)",
                            border: currentTone === t ? "1px solid var(--primary)" : "1px solid var(--border-subtle)"
                          }}
                        >
                          {t}
                        </button>
                      ))}
                      <button
                        className="btn-secondary"
                        onClick={() => handleRegenerate(item)}
                        disabled={inProgress}
                        style={{ padding: "4px 10px", fontSize: 12, marginLeft: 4 }}
                      >
                        <RefreshCw size={12} className={inProgress ? "animate-spin" : ""} />
                        <span>Regenerate</span>
                      </button>
                    </div>
                  </div>

                  {/* Inline Edit Subject & Body */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                        Subject Line
                      </label>
                      <input
                        type="text"
                        value={currentSubj}
                        onChange={(e) => setEditedSubjects(p => ({ ...p, [item.id]: e.target.value }))}
                        style={{ fontSize: 14 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                        Email Body
                      </label>
                      <textarea
                        rows={5}
                        value={currentBody}
                        onChange={(e) => setEditedBodies(p => ({ ...p, [item.id]: e.target.value }))}
                        style={{ fontSize: 14, lineHeight: 1.6 }}
                      />
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--border-subtle)" }}>
                    <button
                      className="btn-danger"
                      onClick={() => onRejectWish(item.id)}
                      disabled={inProgress}
                      style={{ fontSize: 13 }}
                    >
                      <XCircle size={14} />
                      <span>Reject & Skip</span>
                    </button>

                    <button
                      className="btn-success"
                      onClick={() => handleApprove(item)}
                      disabled={inProgress}
                      style={{ fontSize: 13, padding: "8px 20px" }}
                    >
                      <Send size={14} />
                      <span>{inProgress ? "Sending..." : "Approve & Send via Gmail"}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Subtab 2: Monitored Occasions Registry */}
      {activeSubTab === "occasions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="btn-primary" onClick={() => setIsAddModalOpen(true)} style={{ fontSize: 13 }}>
              <Plus size={15} />
              <span>Add Occasion</span>
            </button>
          </div>

          <div className="glass-card" style={{ overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
              <thead>
                <tr style={{
                  borderBottom: "1px solid var(--border-subtle)",
                  background: "rgba(255, 255, 255, 0.02)",
                  color: "var(--text-muted)",
                  fontSize: 12,
                  textTransform: "uppercase"
                }}>
                  <th style={{ padding: "14px 18px" }}>Friend</th>
                  <th style={{ padding: "14px 18px" }}>Occasion Type</th>
                  <th style={{ padding: "14px 18px" }}>Title</th>
                  <th style={{ padding: "14px 18px" }}>Date</th>
                  <th style={{ padding: "14px 18px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {occasions.map((occ) => (
                  <tr key={occ.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "14px 18px", fontWeight: 600 }}>
                      {occ.friend_name}
                      <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 400 }}>{occ.friend_email}</div>
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      <span className={`badge ${occ.occasion_type === "Birthday" ? "badge-primary" : "badge-info"}`}>
                        {occ.occasion_type}
                      </span>
                    </td>
                    <td style={{ padding: "14px 18px" }}>{occ.title}</td>
                    <td style={{ padding: "14px 18px" }}>{occ.date_str}</td>
                    <td style={{ padding: "14px 18px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 8 }}>
                        <button
                          className="btn-secondary"
                          onClick={() => onPreviewWish(occ.friend_id)}
                          style={{ fontSize: 12, padding: "5px 10px" }}
                          title="Preview Gemini AI generated wish"
                        >
                          <Sparkles size={13} style={{ color: "#a5b4fc" }} />
                          <span>Preview Wish</span>
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => {
                            if (confirm(`Delete ${occ.title}?`)) onDeleteOccasion(occ.id);
                          }}
                          style={{ color: "#f87171" }}
                          title="Delete Occasion"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Occasion Modal */}
      {isAddModalOpen && (
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
          <div className="glass-card" style={{ maxWidth: 500, width: "100%", padding: 28, borderRadius: "var(--radius-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <Plus size={18} style={{ color: "var(--primary)" }} />
                <span>Add Occasion</span>
              </h3>
              <button className="btn-icon" onClick={() => setIsAddModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddOccasionSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Select Friend *</label>
                <select value={selectedFriendId} onChange={(e) => setSelectedFriendId(Number(e.target.value))}>
                  {friends.map((f) => (
                    <option key={f.id} value={f.id}>{f.name} ({f.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Occasion Type *</label>
                <select value={occType} onChange={(e) => setOccType(e.target.value)}>
                  <option value="Birthday">Birthday</option>
                  <option value="Anniversary">Anniversary</option>
                  <option value="Custom Occasion">Custom Occasion</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Custom Title (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 5th Anniversary or Graduation"
                  value={occTitle}
                  onChange={(e) => setOccTitle(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Month *</label>
                  <select value={occMonth} onChange={(e) => setOccMonth(Number(e.target.value))}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {new Date(2000, m - 1, 1).toLocaleString("default", { month: "long" })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Day *</label>
                  <select value={occDay} onChange={(e) => setOccDay(Number(e.target.value))}>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>Day {d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Personal Context / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Additional context for Gemini to personalize this wish."
                  value={occNotes}
                  onChange={(e) => setOccNotes(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button type="button" className="btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Occasion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
