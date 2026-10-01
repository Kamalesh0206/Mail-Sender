import React from "react";
import {
  Gift,
  Calendar,
  Send,
  Clock,
  AlertTriangle,
  Users,
  CheckCircle,
  ArrowRight,
  ExternalLink,
  Sparkles,
  MailCheck,
  AlertCircle
} from "lucide-react";
import { DashboardStats, TodayOccasionItem, UpcomingOccasionItem } from "../api";

interface DashboardViewProps {
  stats: DashboardStats | null;
  todayOccasions: TodayOccasionItem[];
  upcomingOccasions: UpcomingOccasionItem[];
  onNavigateToApprovals: () => void;
  onNavigateToFriends: () => void;
  onNavigateToSettings: () => void;
  onPreviewWish: (friendId: number) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  todayOccasions,
  upcomingOccasions,
  onNavigateToApprovals,
  onNavigateToFriends,
  onNavigateToSettings,
  onPreviewWish
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* Gmail Disconnected Alert Banner if needed */}
      {stats && !stats.gmail_connected && (
        <div style={{
          background: "linear-gradient(90deg, rgba(239, 68, 68, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: "var(--radius-md)",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "var(--shadow-sm)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <AlertCircle size={22} style={{ color: "#f87171" }} />
            <div>
              <h4 style={{ fontSize: 15, margin: 0, color: "#fecaca" }}>Gmail API Disconnected</h4>
              <p style={{ fontSize: 13, margin: 0, color: "#cbd5e1" }}>
                Connect your Google account in Settings to enable automated email sending.
              </p>
            </div>
          </div>
          <button
            id="connect-gmail-banner-btn"
            className="btn-primary"
            onClick={onNavigateToSettings}
            style={{ fontSize: 13, padding: "8px 16px" }}
          >
            Connect Gmail
          </button>
        </div>
      )}

      {/* Hero Stats Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
        gap: 16
      }}>
        {/* Card 1: Today's Wishes */}
        <div className="glass-card" style={{ padding: "20px 24px", position: "relative", overflow: "hidden" }}>
          <div style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 100,
            height: 100,
            background: "radial-gradient(circle, rgba(236, 72, 153, 0.15) 0%, transparent 70%)",
            pointerEvents: "none"
          }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>Today's Wishes</span>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: "var(--radius-sm)",
              background: "rgba(236, 72, 153, 0.15)",
              color: "#f472b6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Gift size={20} />
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            {stats?.todays_count ?? 0}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            Celebrations happening today
          </div>
        </div>

        {/* Card 2: Pending Approvals */}
        <div
          className="glass-card"
          onClick={onNavigateToApprovals}
          style={{ padding: "20px 24px", position: "relative", cursor: "pointer", overflow: "hidden" }}
        >
          <div style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 100,
            height: 100,
            background: "radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, transparent 70%)",
            pointerEvents: "none"
          }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>Pending Approvals</span>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: "var(--radius-sm)",
              background: "rgba(245, 158, 11, 0.15)",
              color: "#fbbf24",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Clock size={20} />
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            {stats?.pending_count ?? 0}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <span>Review drafts</span>
            <ArrowRight size={12} />
          </div>
        </div>

        {/* Card 3: Upcoming Birthdays */}
        <div className="glass-card" style={{ padding: "20px 24px", position: "relative", overflow: "hidden" }}>
          <div style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 100,
            height: 100,
            background: "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)",
            pointerEvents: "none"
          }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>Upcoming Occasions</span>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: "var(--radius-sm)",
              background: "rgba(99, 102, 241, 0.15)",
              color: "#a5b4fc",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Calendar size={20} />
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            {stats?.upcoming_count ?? 0}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            In the next 30 days
          </div>
        </div>

        {/* Card 4: Emails Sent */}
        <div className="glass-card" style={{ padding: "20px 24px", position: "relative", overflow: "hidden" }}>
          <div style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 100,
            height: 100,
            background: "radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)",
            pointerEvents: "none"
          }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>Emails Delivered</span>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: "var(--radius-sm)",
              background: "rgba(16, 185, 129, 0.15)",
              color: "#34d399",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Send size={20} />
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            {stats?.sent_count ?? 0}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            Personalized wishes sent
          </div>
        </div>
      </div>

      {/* Two Column Layout: Today's Celebrations & Upcoming */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1.2fr 0.8fr",
        gap: 24
      }}>
        {/* Left Column: Today's Birthdays & Wishes */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 18, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
                <span>Today's Wishes</span>
                <span className="badge badge-primary">
                  {todayOccasions.length} Today
                </span>
              </h2>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0 0" }}>
                Friends celebrating their special day right now
              </p>
            </div>
          </div>

          {todayOccasions.length === 0 ? (
            <div style={{
              textAlign: "center",
              padding: "48px 24px",
              background: "rgba(255, 255, 255, 0.02)",
              borderRadius: "var(--radius-md)",
              border: "1px dashed var(--border-card)"
            }}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px auto",
                color: "var(--text-muted)"
              }}>
                <Gift size={24} />
              </div>
              <h4 style={{ fontSize: 16, marginBottom: 6 }}>No Occasions Today</h4>
              <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 360, margin: "0 auto 16px auto" }}>
                None of your registered friends celebrate an occasion today. Check upcoming dates or add a new friend!
              </p>
              <button className="btn-secondary" onClick={onNavigateToFriends} style={{ fontSize: 13 }}>
                <Users size={14} />
                <span>View All Friends</span>
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {todayOccasions.map((item) => (
                <div
                  key={item.friend_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 20px",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-sm)",
                    transition: "var(--transition-fast)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 16
                    }}>
                      {item.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>
                          {item.name}
                        </span>
                        <span className="badge badge-primary" style={{ fontSize: 11 }}>
                          {item.occasion_type}
                        </span>
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          • {item.relationship_type}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
                        {item.email}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {item.status === "PENDING_APPROVAL" && (
                      <span className="badge badge-warning">
                        <Clock size={12} />
                        Pending Approval
                      </span>
                    )}
                    {item.status === "SENT" && (
                      <span className="badge badge-success">
                        <CheckCircle size={12} />
                        Sent
                      </span>
                    )}
                    {item.status === "FAILED" && (
                      <span className="badge badge-danger">
                        <AlertTriangle size={12} />
                        Failed
                      </span>
                    )}
                    {item.status === "NOT_STARTED" && (
                      <span className="badge badge-info">
                        Ready to scan
                      </span>
                    )}

                    {item.status === "PENDING_APPROVAL" && (
                      <button
                        className="btn-primary"
                        onClick={onNavigateToApprovals}
                        style={{ fontSize: 12, padding: "6px 12px" }}
                      >
                        <span>Review & Approve</span>
                        <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Upcoming Occasions (Next 30 Days) */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 18, margin: 0 }}>Upcoming Occasions</h2>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0 0" }}>
                Next 30 days radar
              </p>
            </div>
            <button className="btn-icon" onClick={onNavigateToFriends} title="Manage Friends">
              <Users size={16} />
            </button>
          </div>

          {upcomingOccasions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "36px 16px", color: "var(--text-muted)" }}>
              <p style={{ fontSize: 13 }}>No upcoming occasions in the next 30 days.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {upcomingOccasions.map((item) => (
                <div
                  key={item.friend_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-sm)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      padding: "4px 8px",
                      background: "rgba(99, 102, 241, 0.15)",
                      border: "1px solid rgba(99, 102, 241, 0.3)",
                      borderRadius: "var(--radius-sm)",
                      textAlign: "center",
                      minWidth: 54
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#a5b4fc" }}>
                        {item.formatted_date}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {item.occasion_type} • {item.relationship_type}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="badge badge-info" style={{ fontSize: 11 }}>
                      In {item.days_until} {item.days_until === 1 ? "day" : "days"}
                    </span>
                    <button
                      className="btn-icon"
                      onClick={() => onPreviewWish(item.friend_id)}
                      title="Preview AI wish draft"
                    >
                      <Sparkles size={14} style={{ color: "#a5b4fc" }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
