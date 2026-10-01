import React, { useState } from "react";
import {
  History,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  Eye,
  RefreshCw,
  Mail,
  X,
  ExternalLink
} from "lucide-react";
import { WishItem } from "../api";

interface HistoryViewProps {
  history: WishItem[];
  onRetry: (wishId: number) => Promise<void>;
  isLoading: boolean;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ history, onRetry, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedWish, setSelectedWish] = useState<WishItem | null>(null);
  const [retryingId, setRetryingId] = useState<number | null>(null);

  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      item.recipient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.recipient_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.generated_subject.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !selectedStatus || item.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleRetry = async (id: number) => {
    setRetryingId(id);
    try {
      await onRetry(id);
    } finally {
      setRetryingId(null);
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
          <span>Email History & Delivery Audit</span>
          <span className="badge badge-primary">{history.length} Logged</span>
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
          Audit trail of sent, pending, and failed wishes with verified Gmail Message IDs.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="glass-card" style={{
        padding: "16px 20px",
        display: "grid",
        gridTemplateColumns: "2fr 1fr",
        gap: 16,
        alignItems: "center"
      }}>
        <div style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: 14, top: 13, color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search recipient name, email, or subject line..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: 40 }}
          />
        </div>

        <div>
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="SENT">Sent</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* History Table */}
      <div className="glass-card" style={{ overflow: "hidden" }}>
        {filteredHistory.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)" }}>
            <History size={36} style={{ margin: "0 auto 12px auto", opacity: 0.5 }} />
            <p>No email history records found matching your query.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
              <thead>
                <tr style={{
                  borderBottom: "1px solid var(--border-subtle)",
                  background: "rgba(255, 255, 255, 0.02)",
                  color: "var(--text-muted)",
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em"
                }}>
                  <th style={{ padding: "14px 20px" }}>Recipient</th>
                  <th style={{ padding: "14px 16px" }}>Occasion</th>
                  <th style={{ padding: "14px 16px" }}>Generated Subject</th>
                  <th style={{ padding: "14px 16px" }}>Date / Time</th>
                  <th style={{ padding: "14px 16px" }}>Status</th>
                  <th style={{ padding: "14px 16px" }}>Gmail ID</th>
                  <th style={{ padding: "14px 20px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item) => (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      transition: "var(--transition-fast)"
                    }}
                  >
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.recipient_name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{item.recipient_email}</div>
                    </td>
                    <td style={{ padding: "16px 16px" }}>
                      <span className="badge badge-primary">{item.occasion_type}</span>
                    </td>
                    <td style={{ padding: "16px 16px", maxWidth: 280 }}>
                      <div style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        color: "var(--text-secondary)"
                      }}>
                        {item.generated_subject}
                      </div>
                    </td>
                    <td style={{ padding: "16px 16px", fontSize: 13, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      {formatDateTime(item.sent_at || item.created_at)}
                    </td>
                    <td style={{ padding: "16px 16px" }}>
                      {item.status === "SENT" && (
                        <span className="badge badge-success">
                          <CheckCircle2 size={12} />
                          SENT
                        </span>
                      )}
                      {item.status === "PENDING_APPROVAL" && (
                        <span className="badge badge-warning">
                          <Clock size={12} />
                          PENDING
                        </span>
                      )}
                      {item.status === "FAILED" && (
                        <span className="badge badge-danger">
                          <AlertTriangle size={12} />
                          FAILED
                        </span>
                      )}
                      {item.status === "CANCELLED" && (
                        <span className="badge" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}>
                          <XCircle size={12} />
                          CANCELLED
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "16px 16px", fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                      {item.gmail_message_id ? (
                        <span title={item.gmail_message_id}>
                          {item.gmail_message_id.substring(0, 10)}...
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td style={{ padding: "16px 20px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <button
                          className="btn-icon"
                          onClick={() => setSelectedWish(item)}
                          title="View Full Generated Email"
                        >
                          <Eye size={16} />
                        </button>

                        {item.status === "FAILED" && (
                          <button
                            className="btn-icon"
                            onClick={() => handleRetry(item.id)}
                            disabled={retryingId === item.id}
                            title="Retry Dispatch"
                            style={{ color: "#fbbf24" }}
                          >
                            <RefreshCw size={16} className={retryingId === item.id ? "animate-spin" : ""} />
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

      {/* Email Details Modal */}
      {selectedWish && (
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
            maxWidth: 620,
            width: "100%",
            padding: 32,
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-lg)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <span className="badge badge-primary" style={{ marginBottom: 6 }}>
                  {selectedWish.occasion_type} • {selectedWish.year}
                </span>
                <h3 style={{ fontSize: 18, margin: 0 }}>{selectedWish.generated_subject}</h3>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                  To: {selectedWish.recipient_name} ({selectedWish.recipient_email})
                </div>
              </div>
              <button className="btn-icon" onClick={() => setSelectedWish(null)}>
                <X size={18} />
              </button>
            </div>

            {selectedWish.error_message && (
              <div style={{
                background: "var(--status-danger-bg)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "var(--radius-sm)",
                padding: "10px 14px",
                color: "#f87171",
                fontSize: 13,
                marginBottom: 16
              }}>
                <strong>Error Details:</strong> {selectedWish.error_message}
              </div>
            )}

            <div style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: 20,
              whiteSpace: "pre-wrap",
              fontSize: 14,
              lineHeight: 1.7,
              color: "var(--text-primary)",
              maxHeight: "360px",
              overflowY: "auto"
            }}>
              {selectedWish.generated_body}
            </div>

            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 20,
              fontSize: 12,
              color: "var(--text-muted)"
            }}>
              <div>
                Status: <strong>{selectedWish.status}</strong>
                {selectedWish.gmail_message_id && (
                  <span> • Gmail ID: {selectedWish.gmail_message_id}</span>
                )}
              </div>
              <button className="btn-secondary" onClick={() => setSelectedWish(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
