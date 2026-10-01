import React, { useState } from "react";
import {
  Quote,
  Calendar,
  Send,
  Upload,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Trash2,
  X,
  Play
} from "lucide-react";
import { QuoteScheduleItem, FriendGroup, Friend, BulkPreviewResult, api } from "../api";

interface QuotesViewProps {
  schedules: QuoteScheduleItem[];
  groups: FriendGroup[];
  friends: Friend[];
  onScheduleSingle: (data: any) => Promise<void>;
  onQuickSchedule: (data: any) => Promise<void>;
  onSendNow: (scheduleId: number) => Promise<void>;
  onCancelSchedule: (scheduleId: number) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export const QuotesView: React.FC<QuotesViewProps> = ({
  schedules,
  groups,
  friends,
  onScheduleSingle,
  onQuickSchedule,
  onSendNow,
  onCancelSchedule,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<"schedules" | "add" | "quick" | "bulk">("schedules");

  // Single Quote Form State
  const [singleQuoteText, setSingleQuoteText] = useState("");
  const [singleAuthor, setSingleAuthor] = useState("");
  const [singleDate, setSingleDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [singleTime, setSingleTime] = useState("08:00");
  const [singleRecipientType, setSingleRecipientType] = useState("ALL");
  const [singleGroupId, setSingleGroupId] = useState<number | undefined>(groups[0]?.id);
  const [singleFriendId, setSingleFriendId] = useState<number | undefined>(friends[0]?.id);
  const [singleSubject, setSingleSubject] = useState("🌅 Today's Thought");
  const [singleIntro, setSingleIntro] = useState(true);
  const [isSubmittingSingle, setIsSubmittingSingle] = useState(false);

  // Quick Scheduler State
  const [quickQuotesText, setQuickQuotesText] = useState(
    "Success is built one small step at a time.\nEvery day is a new opportunity to become better.\nHappiness is not by chance, but by choice.\nThe secret of getting ahead is getting started."
  );
  const [quickStartDate, setQuickStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [quickTime, setQuickTime] = useState("08:00");
  const [quickFrequency, setQuickFrequency] = useState("Daily");
  const [quickRecipientType, setQuickRecipientType] = useState("ALL");
  const [quickGroupId, setQuickGroupId] = useState<number | undefined>(groups[0]?.id);
  const [isQuickSubmitting, setIsQuickSubmitting] = useState(false);

  // Bulk Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [previewResult, setPreviewResult] = useState<BulkPreviewResult | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleQuoteText.trim()) return;

    setIsSubmittingSingle(true);
    try {
      await onScheduleSingle({
        quote_text: singleQuoteText.trim(),
        author: singleAuthor.trim() || undefined,
        send_date: singleDate,
        send_time: singleTime,
        recipient_type: singleRecipientType,
        target_group_id: singleRecipientType === "GROUP" ? singleGroupId : undefined,
        target_friend_id: singleRecipientType === "INDIVIDUAL" ? singleFriendId : undefined,
        subject: singleSubject.trim(),
        personalized_intro: singleIntro
      });
      setSingleQuoteText("");
      setSingleAuthor("");
      setActiveTab("schedules");
    } finally {
      setIsSubmittingSingle(false);
    }
  };

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickQuotesText.trim()) return;

    setIsQuickSubmitting(true);
    try {
      await onQuickSchedule({
        quotes_text: quickQuotesText,
        start_date: quickStartDate,
        send_time: quickTime,
        frequency: quickFrequency,
        recipient_type: quickRecipientType,
        target_group_id: quickRecipientType === "GROUP" ? quickGroupId : undefined
      });
      setActiveTab("schedules");
    } finally {
      setIsQuickSubmitting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadFile(file);
      setIsPreviewLoading(true);
      setPreviewResult(null);
      setUploadSuccessMsg(null);
      try {
        const preview = await api.previewBulkUpload(file);
        setPreviewResult(preview);
      } catch (err: any) {
        alert(err.message || "Failed to preview file");
        setUploadFile(null);
      } finally {
        setIsPreviewLoading(false);
      }
    }
  };

  const handleConfirmImport = async () => {
    if (!previewResult) return;
    const validRows = previewResult.rows.filter(r => r.is_valid);
    if (validRows.length === 0) return;

    setIsImporting(true);
    try {
      await api.confirmBulkUpload(validRows);
      setUploadSuccessMsg(`Successfully imported and scheduled ${validRows.length} quotes!`);
      setPreviewResult(null);
      setUploadFile(null);
      await onRefresh();
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
          <Quote size={24} style={{ color: "#a5b4fc" }} />
          <span>Quotes Module</span>
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
          Schedule and broadcast user-provided exact quotes to friends or groups.
        </p>
      </div>

      {/* Principle Banner */}
      <div style={{
        background: "rgba(99, 102, 241, 0.08)",
        border: "1px solid rgba(99, 102, 241, 0.25)",
        borderRadius: "var(--radius-sm)",
        padding: "12px 18px",
        fontSize: 13,
        color: "#c7d2fe",
        display: "flex",
        alignItems: "center",
        gap: 10
      }}>
        <CheckCircle2 size={16} style={{ color: "var(--primary)", flexShrink: 0 }} />
        <span>
          <strong>Exact Preservation Principle:</strong> The quotes you enter or upload remain <em>strictly verbatim</em>. We never paraphrase, rewrite, or alter your quote text.
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 10, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 12, flexWrap: "wrap" }}>
        <button
          onClick={() => setActiveTab("schedules")}
          style={{
            padding: "8px 16px",
            borderRadius: "var(--radius-sm)",
            fontSize: 14,
            fontWeight: 600,
            background: activeTab === "schedules" ? "rgba(99, 102, 241, 0.15)" : "transparent",
            color: activeTab === "schedules" ? "#ffffff" : "var(--text-secondary)",
            border: activeTab === "schedules" ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid transparent",
            display: "flex",
            alignItems: "center",
            gap: 8
          }}
        >
          <Clock size={15} />
          <span>Scheduled Broadcasts ({schedules.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("add")}
          style={{
            padding: "8px 16px",
            borderRadius: "var(--radius-sm)",
            fontSize: 14,
            fontWeight: 600,
            background: activeTab === "add" ? "rgba(99, 102, 241, 0.15)" : "transparent",
            color: activeTab === "add" ? "#ffffff" : "var(--text-secondary)",
            border: activeTab === "add" ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid transparent",
            display: "flex",
            alignItems: "center",
            gap: 8
          }}
        >
          <Plus size={15} />
          <span>Add Single Quote</span>
        </button>

        <button
          onClick={() => setActiveTab("quick")}
          style={{
            padding: "8px 16px",
            borderRadius: "var(--radius-sm)",
            fontSize: 14,
            fontWeight: 600,
            background: activeTab === "quick" ? "rgba(99, 102, 241, 0.15)" : "transparent",
            color: activeTab === "quick" ? "#ffffff" : "var(--text-secondary)",
            border: activeTab === "quick" ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid transparent",
            display: "flex",
            alignItems: "center",
            gap: 8
          }}
        >
          <Calendar size={15} />
          <span>Quick Multiple Quotes</span>
        </button>

        <button
          onClick={() => setActiveTab("bulk")}
          style={{
            padding: "8px 16px",
            borderRadius: "var(--radius-sm)",
            fontSize: 14,
            fontWeight: 600,
            background: activeTab === "bulk" ? "rgba(99, 102, 241, 0.15)" : "transparent",
            color: activeTab === "bulk" ? "#ffffff" : "var(--text-secondary)",
            border: activeTab === "bulk" ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid transparent",
            display: "flex",
            alignItems: "center",
            gap: 8
          }}
        >
          <FileSpreadsheet size={15} />
          <span>Bulk Upload (Excel / CSV)</span>
        </button>
      </div>

      {/* Tab 1: Scheduled Broadcasts Table */}
      {activeTab === "schedules" && (
        <div className="glass-card" style={{ overflow: "hidden" }}>
          {schedules.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)" }}>
              <Quote size={32} style={{ margin: "0 auto 10px auto", opacity: 0.4 }} />
              <p style={{ fontSize: 13 }}>No quotes currently scheduled. Add or upload quotes to begin automated broadcasts.</p>
            </div>
          ) : (
            <div className="table-responsive" style={{ margin: 0 }}>
              <table style={{ width: "100%", minWidth: 620, borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
                <thead>
                  <tr style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    background: "rgba(255, 255, 255, 0.02)",
                    color: "var(--text-muted)",
                    fontSize: 12,
                    textTransform: "uppercase"
                  }}>
                    <th style={{ padding: "14px 18px" }}>Send Date / Time</th>
                    <th style={{ padding: "14px 18px" }}>Quote (Exact)</th>
                    <th style={{ padding: "14px 18px" }}>Recipients</th>
                    <th style={{ padding: "14px 18px" }}>Status</th>
                    <th style={{ padding: "14px 18px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((sc) => {
                    const recipText = sc.recipient_type === "GROUP"
                      ? `Group: ${sc.target_group_name || "Group"}`
                      : sc.recipient_type === "INDIVIDUAL"
                      ? sc.target_friend_name || "Friend"
                      : "All Active Friends";

                    return (
                      <tr key={sc.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "14px 18px", whiteSpace: "nowrap" }}>
                          <div style={{ fontWeight: 600 }}>{sc.send_date}</div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{sc.send_time}</div>
                        </td>
                        <td style={{ padding: "14px 18px", maxWidth: 360 }}>
                          <div style={{ fontStyle: "italic", color: "var(--text-primary)" }}>
                            "{sc.quote_text}"
                          </div>
                          {sc.author && (
                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                              — {sc.author}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          <span className="badge badge-info">{recipText}</span>
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          {sc.status === "SCHEDULED" && <span className="badge badge-primary">Scheduled</span>}
                          {sc.status === "SENT" && <span className="badge badge-success">Sent</span>}
                          {sc.status === "CANCELLED" && <span className="badge" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}>Cancelled</span>}
                          {sc.status === "FAILED" && <span className="badge badge-danger">Failed</span>}
                        </td>
                        <td style={{ padding: "14px 18px", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: 8 }}>
                            {sc.status === "SCHEDULED" && (
                              <>
                                <button
                                  className="btn-success"
                                  onClick={() => onSendNow(sc.id)}
                                  style={{ padding: "5px 10px", fontSize: 12 }}
                                  title="Broadcast quote right now"
                                >
                                  <Play size={12} />
                                  <span>Send Now</span>
                                </button>
                                <button
                                  className="btn-secondary"
                                  onClick={() => onCancelSchedule(sc.id)}
                                  style={{ padding: "5px 10px", fontSize: 12 }}
                                  title="Cancel schedule"
                                >
                                  <span>Cancel</span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Add Single Quote Form */}
      {activeTab === "add" && (
        <div className="glass-card" style={{ padding: 28, maxWidth: 680 }}>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Schedule Single Quote</h2>
          <form onSubmit={handleSingleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Quote Text (Will be preserved verbatim) *
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Success is built one small step at a time."
                value={singleQuoteText}
                onChange={(e) => setSingleQuoteText(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Author / Attribution (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Marcus Aurelius"
                value={singleAuthor}
                onChange={(e) => setSingleAuthor(e.target.value)}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Send Date *
                </label>
                <input
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Send Time (HH:MM) *
                </label>
                <input
                  type="time"
                  value={singleTime}
                  onChange={(e) => setSingleTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Target Recipients *
                </label>
                <select value={singleRecipientType} onChange={(e) => setSingleRecipientType(e.target.value)}>
                  <option value="ALL">All Active Friends</option>
                  <option value="GROUP">Specific Friend Group</option>
                  <option value="INDIVIDUAL">Individual Friend</option>
                </select>
              </div>

              {singleRecipientType === "GROUP" && (
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    Select Group *
                  </label>
                  <select value={singleGroupId} onChange={(e) => setSingleGroupId(Number(e.target.value))}>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {singleRecipientType === "INDIVIDUAL" && (
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    Select Friend *
                  </label>
                  <select value={singleFriendId} onChange={(e) => setSingleFriendId(Number(e.target.value))}>
                    {friends.map((f) => (
                      <option key={f.id} value={f.id}>{f.name} ({f.email})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Email Subject
              </label>
              <input
                type="text"
                value={singleSubject}
                onChange={(e) => setSingleSubject(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
              <input
                type="checkbox"
                id="intro_check"
                checked={singleIntro}
                onChange={(e) => setSingleIntro(e.target.checked)}
                style={{ width: "auto" }}
              />
              <label htmlFor="intro_check" style={{ fontSize: 13, cursor: "pointer" }}>
                Include polite opening ("Hope you're having a wonderful day.")
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 12 }}>
              <button type="submit" className="btn-primary" disabled={isSubmittingSingle}>
                <span>{isSubmittingSingle ? "Scheduling..." : "Schedule Quote Broadcast"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Quick Multiple Quotes Scheduler */}
      {activeTab === "quick" && (
        <div className="glass-card" style={{ padding: 28, maxWidth: 720 }}>
          <h2 style={{ fontSize: 18, marginBottom: 6 }}>Quick Multiple Quotes Scheduler</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
            Paste several quotes (one per line). Choose a start date and frequency — WishMail AI will automatically schedule them sequentially!
          </p>

          <form onSubmit={handleQuickSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Paste Quotes (One per line) *
              </label>
              <textarea
                rows={6}
                value={quickQuotesText}
                onChange={(e) => setQuickQuotesText(e.target.value)}
                placeholder="Quote 1&#10;Quote 2&#10;Quote 3..."
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Start Date *
                </label>
                <input
                  type="date"
                  value={quickStartDate}
                  onChange={(e) => setQuickStartDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Time *
                </label>
                <input
                  type="time"
                  value={quickTime}
                  onChange={(e) => setQuickTime(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Frequency *
                </label>
                <select value={quickFrequency} onChange={(e) => setQuickFrequency(e.target.value)}>
                  <option value="Daily">Daily (Every Day)</option>
                  <option value="Weekdays">Weekdays Only (Mon-Fri)</option>
                  <option value="Weekly">Weekly (Every 7 Days)</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Recipients *
                </label>
                <select value={quickRecipientType} onChange={(e) => setQuickRecipientType(e.target.value)}>
                  <option value="ALL">All Active Friends</option>
                  <option value="GROUP">Specific Group</option>
                </select>
              </div>

              {quickRecipientType === "GROUP" && (
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    Select Group *
                  </label>
                  <select value={quickGroupId} onChange={(e) => setQuickGroupId(Number(e.target.value))}>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
              <button type="submit" className="btn-primary" disabled={isQuickSubmitting}>
                <span>{isQuickSubmitting ? "Generating Sequence..." : "Schedule All Quotes Sequentially"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 4: Bulk Upload (Excel / CSV) with Validation Preview */}
      {activeTab === "bulk" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="glass-card" style={{ padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, margin: 0 }}>Bulk Quotes Upload</h2>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                  Upload Excel (.xlsx) or CSV (.csv) containing quotes. Validates all rows before importing.
                </p>
              </div>
              <a
                href="http://localhost:8000/api/v1/quotes/template"
                download="wishmail_quotes_template.csv"
                className="btn-secondary"
                style={{ fontSize: 12 }}
              >
                <FileSpreadsheet size={14} />
                <span>Download Template (.csv)</span>
              </a>
            </div>

            {/* Upload Zone */}
            <div style={{
              border: "2px dashed var(--border-card)",
              borderRadius: "var(--radius-md)",
              padding: "36px 20px",
              textAlign: "center",
              background: "rgba(255, 255, 255, 0.01)"
            }}>
              <Upload size={32} style={{ color: "var(--primary)", margin: "0 auto 12px auto" }} />
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                Choose Excel (.xlsx) or CSV file to import
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
                Template Format: Date | Time | Quote | Recipients | Group | Subject
              </div>
              <input
                type="file"
                accept=".xlsx, .csv"
                onChange={handleFileChange}
                style={{ maxWidth: 320, margin: "0 auto" }}
              />
            </div>
          </div>

          {/* Success Banner */}
          {uploadSuccessMsg && (
            <div style={{
              background: "var(--status-success-bg)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: "var(--radius-sm)",
              padding: "14px 18px",
              color: "#34d399",
              display: "flex",
              alignItems: "center",
              gap: 10
            }}>
              <CheckCircle2 size={18} />
              <span>{uploadSuccessMsg}</span>
            </div>
          )}

          {/* IMPORT PREVIEW MODAL / SECTION */}
          {previewResult && (
            <div className="glass-card" style={{ padding: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontSize: 18, margin: 0 }}>IMPORT PREVIEW</h3>
                <div style={{ display: "flex", gap: 10 }}>
                  <span className="badge badge-info">Total Rows: {previewResult.total_rows}</span>
                  <span className="badge badge-success">Valid: {previewResult.valid_count}</span>
                  {previewResult.invalid_count > 0 && (
                    <span className="badge badge-danger">Invalid: {previewResult.invalid_count}</span>
                  )}
                </div>
              </div>

              {/* Rows List */}
              <div style={{ maxHeight: 300, overflowY: "auto", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", marginBottom: 20 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "rgba(255, 255, 255, 0.03)", borderBottom: "1px solid var(--border-subtle)" }}>
                      <th style={{ padding: "8px 12px" }}>Row</th>
                      <th style={{ padding: "8px 12px" }}>Date</th>
                      <th style={{ padding: "8px 12px" }}>Quote</th>
                      <th style={{ padding: "8px 12px" }}>Group</th>
                      <th style={{ padding: "8px 12px" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewResult.rows.map((row) => (
                      <tr key={row.row_number} style={{ borderBottom: "1px solid var(--border-subtle)", background: !row.is_valid ? "rgba(239, 68, 68, 0.05)" : "transparent" }}>
                        <td style={{ padding: "8px 12px", fontWeight: 600 }}>#{row.row_number}</td>
                        <td style={{ padding: "8px 12px" }}>{row.date || "—"}</td>
                        <td style={{ padding: "8px 12px", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          "{row.quote}"
                        </td>
                        <td style={{ padding: "8px 12px" }}>{row.group || "All"}</td>
                        <td style={{ padding: "8px 12px" }}>
                          {row.is_valid ? (
                            <span className="badge badge-success" style={{ fontSize: 11 }}>Valid</span>
                          ) : (
                            <span className="badge badge-danger" style={{ fontSize: 11 }} title={row.error}>
                              {row.error}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <button className="btn-secondary" onClick={() => setPreviewResult(null)}>
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={handleConfirmImport}
                  disabled={isImporting || previewResult.valid_count === 0}
                >
                  <CheckCircle2 size={15} />
                  <span>{isImporting ? "Importing..." : `Import ${previewResult.valid_count} Valid Quotes`}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
