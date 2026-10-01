import React from "react";
import {
  Heart,
  Quote,
  Calendar,
  Send,
  Clock,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Plus,
  MailCheck,
  CheckCircle2
} from "lucide-react";
import { DashboardOverview } from "../api";

interface DashboardViewProps {
  data: DashboardOverview | null;
  onNavigate: (tab: "wishes" | "quotes" | "friends" | "calendar" | "history" | "settings") => void;
  onRunScan: () => void;
  isScanning: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  data,
  onNavigate,
  onRunScan,
  isScanning
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Welcome Banner */}
      <div className="glass-card" style={{
        padding: "20px 22px",
        background: "linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(236, 72, 153, 0.08) 100%)",
        border: "1px solid rgba(99, 102, 241, 0.25)",
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16
      }}>
        <div style={{ minWidth: 260, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 20 }}>👋</span>
            <h1 style={{ fontSize: "clamp(18px, 4vw, 22px)", margin: 0 }}>Good Day! Welcome to WishMail AI</h1>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
            Personal wishes. Meaningful quotes. Automatically delivered. ({data?.timezone || "Asia/Kolkata"})
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button className="btn-secondary" onClick={() => onNavigate("wishes")} style={{ fontSize: 13, padding: "8px 14px", flex: "1 1 auto" }}>
            <Heart size={14} style={{ color: "#ec4899" }} />
            <span>Wishes</span>
          </button>
          <button className="btn-secondary" onClick={() => onNavigate("quotes")} style={{ fontSize: 13, padding: "8px 14px", flex: "1 1 auto" }}>
            <Quote size={14} style={{ color: "#a5b4fc" }} />
            <span>Quotes</span>
          </button>
          <button className="btn-primary" onClick={onRunScan} disabled={isScanning} style={{ fontSize: 13, padding: "8px 14px", flex: "1 1 auto" }}>
            <Sparkles size={14} />
            <span>{isScanning ? "Checking..." : "Run Check"}</span>
          </button>
        </div>
      </div>

      {/* 7 Dashboard Cards */}
      <div className="stats-grid-responsive">
        {/* Card 1: Today's Wishes */}
        <div
          className="glass-card"
          onClick={() => onNavigate("wishes")}
          style={{ padding: "14px 16px", cursor: "pointer", transition: "var(--transition-fast)" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>TODAY'S WISHES</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(236, 72, 153, 0.15)", color: "#f472b6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Heart size={16} />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "var(--font-heading)" }}>
            {data?.todays_wishes_count ?? 0}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
            Celebrations today
          </div>
        </div>

        {/* Card 2: Today's Quotes */}
        <div
          className="glass-card"
          onClick={() => onNavigate("quotes")}
          style={{ padding: "18px 20px", cursor: "pointer", transition: "var(--transition-fast)" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>TODAY'S QUOTES</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(99, 102, 241, 0.15)", color: "#a5b4fc", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Quote size={16} />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "var(--font-heading)" }}>
            {data?.todays_quotes_count ?? 0}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
            Scheduled thoughts
          </div>
        </div>

        {/* Card 3: Upcoming Wishes */}
        <div
          className="glass-card"
          onClick={() => onNavigate("calendar")}
          style={{ padding: "18px 20px", cursor: "pointer", transition: "var(--transition-fast)" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>UPCOMING WISHES</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(139, 92, 246, 0.15)", color: "#c084fc", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Calendar size={16} />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "var(--font-heading)" }}>
            {data?.upcoming_wishes_count ?? 0}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
            In next 30 days
          </div>
        </div>

        {/* Card 4: Upcoming Quotes */}
        <div
          className="glass-card"
          onClick={() => onNavigate("quotes")}
          style={{ padding: "18px 20px", cursor: "pointer", transition: "var(--transition-fast)" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>UPCOMING QUOTES</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(6, 182, 212, 0.15)", color: "#22d3ee", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Calendar size={16} />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "var(--font-heading)" }}>
            {data?.upcoming_quotes_count ?? 0}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
            Queued broadcasts
          </div>
        </div>

        {/* Card 5: Emails Sent */}
        <div
          className="glass-card"
          onClick={() => onNavigate("history")}
          style={{ padding: "18px 20px", cursor: "pointer", transition: "var(--transition-fast)" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>EMAILS SENT</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(16, 185, 129, 0.15)", color: "#34d399", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Send size={16} />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "var(--font-heading)" }}>
            {data?.emails_sent_count ?? 0}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
            Successfully delivered
          </div>
        </div>

        {/* Card 6: Pending Approval */}
        <div
          className="glass-card"
          onClick={() => onNavigate("wishes")}
          style={{ padding: "18px 20px", cursor: "pointer", transition: "var(--transition-fast)", border: (data?.pending_approval_count ?? 0) > 0 ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid var(--border-card)" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>PENDING APPROVAL</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Clock size={16} />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "var(--font-heading)", color: (data?.pending_approval_count ?? 0) > 0 ? "#fbbf24" : "var(--text-primary)" }}>
            {data?.pending_approval_count ?? 0}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
            Requires your review
          </div>
        </div>

        {/* Card 7: Failed Emails */}
        <div
          className="glass-card"
          onClick={() => onNavigate("history")}
          style={{ padding: "18px 20px", cursor: "pointer", transition: "var(--transition-fast)" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>FAILED EMAILS</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(239, 68, 68, 0.15)", color: "#f87171", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={16} />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "var(--font-heading)", color: (data?.failed_emails_count ?? 0) > 0 ? "#f87171" : "var(--text-primary)" }}>
            {data?.failed_emails_count ?? 0}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
            Need retry attention
          </div>
        </div>
      </div>

      {/* TODAY'S SCHEDULE Table */}
      <div className="glass-card" style={{ padding: "18px 20px" }}>
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 16
        }}>
          <div>
            <h2 style={{ fontSize: 17, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
              <span>TODAY'S SCHEDULE</span>
              <span className="badge badge-primary">{data?.today_schedule?.length ?? 0}</span>
            </h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0 0" }}>
              Chronological schedule of today's automated wishes and quote broadcasts.
            </p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button className="btn-secondary" onClick={() => onNavigate("wishes")} style={{ fontSize: 12, padding: "6px 12px" }}>
              <Plus size={13} />
              <span>Add Wish</span>
            </button>
            <button className="btn-secondary" onClick={() => onNavigate("quotes")} style={{ fontSize: 12, padding: "6px 12px" }}>
              <Plus size={13} />
              <span>Schedule Quote</span>
            </button>
          </div>
        </div>

        {(!data?.today_schedule || data.today_schedule.length === 0) ? (
          <div style={{ textAlign: "center", padding: "36px 16px", color: "var(--text-muted)" }}>
            <Calendar size={32} style={{ margin: "0 auto 10px auto", opacity: 0.4 }} />
            <p style={{ fontSize: 13 }}>No events scheduled for today. Run the daily check or schedule a quote.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table style={{ width: "100%", minWidth: 520, borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
              <thead>
                <tr style={{
                  borderBottom: "1px solid var(--border-subtle)",
                  background: "rgba(255, 255, 255, 0.02)",
                  color: "var(--text-muted)",
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em"
                }}>
                  <th style={{ padding: "12px 18px" }}>Time</th>
                  <th style={{ padding: "12px 18px" }}>Type</th>
                  <th style={{ padding: "12px 18px" }}>Recipient</th>
                  <th style={{ padding: "12px 18px" }}>Subject</th>
                  <th style={{ padding: "12px 18px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.today_schedule.map((row) => (
                  <tr key={`${row.type}-${row.id}-${row.time}`} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "14px 18px", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                      {row.time}
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      <span className={`badge ${row.type.includes("Wish") ? "badge-primary" : "badge-info"}`}>
                        {row.type}
                      </span>
                    </td>
                    <td style={{ padding: "14px 18px", fontWeight: 500 }}>
                      {row.recipient}
                    </td>
                    <td style={{ padding: "14px 18px", color: "var(--text-secondary)", maxWidth: 260 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.subject}
                      </div>
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      {row.status.toLowerCase() === "sent" && (
                        <span className="badge badge-success">
                          <CheckCircle2 size={12} />
                          Sent
                        </span>
                      )}
                      {row.status.toLowerCase() === "pending" && (
                        <span className="badge badge-warning" style={{ cursor: "pointer" }} onClick={() => onNavigate("wishes")}>
                          <Clock size={12} />
                          Pending Review
                        </span>
                      )}
                      {row.status.toLowerCase() === "scheduled" && (
                        <span className="badge badge-info">
                          Scheduled
                        </span>
                      )}
                      {row.status.toLowerCase() === "failed" && (
                        <span className="badge badge-danger">
                          Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
