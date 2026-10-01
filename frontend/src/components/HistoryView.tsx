import React, { useState } from "react";
import {
  History,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  Eye,
  RefreshCw,
  X,
  Heart,
  Quote
} from "lucide-react";
import { EmailHistoryItem } from "../api";

interface HistoryViewProps {
  history: EmailHistoryItem[];
  onRetry: (id: number) => Promise<void>;
  isLoading: boolean;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ history, onRetry, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<EmailHistoryItem | null>(null);
  const [retryingId, setRetryingId] = useState<number | null>(null);

  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      item.recipient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.recipient_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.subject.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = !selectedType || item.email_type === selectedType;
    const matchesStatus = !selectedStatus || item.status === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleRetry = async (id: number) => {
    setRetryingId(id);
    try {
      await onRetry(id);
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
          <History size={24} style={{ color: "var(--primary)" }} />
          <span>Email History & Delivery Audit</span>
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
          Audit trail of every occasion wish and quote email dispatched through Gmail.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="glass-card" style={{
        padding: "12px 14px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 10,
        alignItems: "center"
      }}>
        <div style={{ position: "relative" }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: 12, color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search name, email, subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: 36, fontSize: 13 }}
          />
        </div>

        <div>
          <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} style={{ fontSize: 13 }}>
            <option value="">All Types (Wishes & Quotes)</option>
            <option value="WISH">💌 Wishes Only</option>
            <option value="QUOTE">💬 Quotes Only</option>
          </select>
        </div>

        <div>
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} style={{ fontSize: 13 }}>
            <option value="">All Statuses</option>
            <option value="SENT">Sent</option>
            <option value="PENDING">Pending Approval</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* History Table */}
      <div className="glass-card" style={{ overflow: "hidden" }}>
        {filteredHistory.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)" }}>
            <History size={32} style={{ margin: "0 auto 10px auto", opacity: 0.4 }} />
            <p style={{ fontSize: 13 }}>No email history records found matching your filters.</p>
          </div>
        ) : (
          <div className="table-responsive" style={{ margin: 0 }}>
            <table style={{ width: "100%", minWidth: 640, borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
              <thead>
                <tr style={{
                  borderBottom: "1px solid var(--border-subtle)",
                  background: "rgba(255, 255, 255, 0.02)",
                  color: "var(--text-muted)",
                  fontSize: 12,
                  textTransform: "uppercase"
                }}>
                  <th style={{ padding: "14px 18px" }}>Recipient</th>
                  <th style={{ padding: "14px 18px" }}>Type</th>
                  <th style={{ padding: "14px 18px" }}>Subject</th>
                  <th style={{ padding: "14px 18px" }}>Date & Time</th>
                  <th style={{ padding: "14px 18px" }}>Status</th>
                  <th style={{ padding: "14px 18px" }}>Gmail ID</th>
                  <th style={{ padding: "14px 18px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "14px 18px" }}>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.recipient_name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.recipient_email}</div>
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      <span className={`badge ${item.email_type === "WISH" ? "badge-primary" : "badge-info"}`}>
                        {item.email_type === "WISH" ? <Heart size={10} /> : <Quote size={10} />}
                        {item.email_type}
                      </span>
                    </td>
                    <td style={{ padding: "14px 18px", maxWidth: 280 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-secondary)" }}>
                        {item.subject}
                      </div>
                    </td>
                    <td style={{ padding: "14px 18px", whiteSpace: "nowrap", color: "var(--text-muted)", fontSize: 12 }}>
                      <div>{item.sent_date}</div>
                      <div>{item.sent_time || "—"}</div>
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      {item.status === "SENT" && (
                        <span className="badge badge-success"><CheckCircle2 size={12} /> SENT</span>
                      )}
                      {item.status === "PENDING" && (
                        <span className="badge badge-warning"><Clock size={12} /> PENDING</span>
                      )}
                      {item.status === "FAILED" && (
                        <span className="badge badge-danger"><AlertTriangle size={12} /> FAILED</span>
                      )}
                      {item.status === "CANCELLED" && (
                        <span className="badge" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}>
                          <XCircle size={12} /> CANCELLED
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "14px 18px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
                      {item.gmail_message_id ? `${item.gmail_message_id.substring(0, 10)}...` : "—"}
                    </td>
                    <td style={{ padding: "14px 18px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button className="btn-icon" onClick={() => setSelectedItem(item)} title="View Email">
                          <Eye size={15} />
                        </button>
                        {item.status === "FAILED" && (
                          <button
                            className="btn-icon"
                            onClick={() => handleRetry(item.id)}
                            disabled={retryingId === item.id}
                            title="Retry Dispatch"
                            style={{ color: "#fbbf24" }}
                          >
                            <RefreshCw size={15} className={retryingId === item.id ? "animate-spin" : ""} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Email Dialog */}
      {selectedItem && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: 16
        }}>
          <div className="glass-card" style={{ maxWidth: 600, width: "100%", padding: 28, borderRadius: "var(--radius-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <span className={`badge ${selectedItem.email_type === "WISH" ? "badge-primary" : "badge-info"}`} style={{ marginBottom: 6 }}>
                  {selectedItem.email_type} • {selectedItem.sent_date}
                </span>
                <h3 style={{ fontSize: 18, margin: 0 }}>{selectedItem.subject}</h3>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                  To: {selectedItem.recipient_name} ({selectedItem.recipient_email})
                </div>
              </div>
              <button className="btn-icon" onClick={() => setSelectedItem(null)}>
                <X size={18} />
              </button>
            </div>

            {selectedItem.error_message && (
              <div style={{
                background: "var(--status-danger-bg)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                color: "#f87171",
                fontSize: 12,
                marginBottom: 14
              }}>
                <strong>Error:</strong> {selectedItem.error_message}
              </div>
            )}

            <div style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: 18,
              whiteSpace: "pre-wrap",
              fontSize: 13,
              lineHeight: 1.6,
              maxHeight: 340,
              overflowY: "auto"
            }}>
              {selectedItem.body}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Status: <strong>{selectedItem.status}</strong> {selectedItem.gmail_message_id && `• ID: ${selectedItem.gmail_message_id}`}
              </div>
              <button className="btn-secondary" onClick={() => setSelectedItem(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
