import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Heart,
  Quote,
  Clock,
  Play,
  X,
  Send,
  AlertCircle
} from "lucide-react";
import { CalendarEventItem, api } from "../api";

interface CalendarViewProps {
  onRefresh: () => Promise<void>;
  onSendQuoteNow: (scheduleId: number) => Promise<void>;
  onCancelQuote: (scheduleId: number) => Promise<void>;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  onRefresh,
  onSendQuoteNow,
  onCancelQuote
}) => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 9, 1)); // October 2026 default
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventItem[]>([]);
  const [activeDateModal, setActiveDateModal] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12

  useEffect(() => {
    loadEvents();
  }, [year, month]);

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const data = await api.getCalendarEvents(year, month);
      setEvents(data);
    } catch (err) {
      console.error("Failed loading calendar events:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1));
  };

  // Calendar math
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayIndex = new Date(year, month - 1, 1).getDay(); // 0=Sunday
  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter(e => e.date === dateStr);
  };

  const handleDayClick = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayEvents = getEventsForDay(day);
    if (dayEvents.length > 0) {
      setSelectedEvent(dayEvents);
      setActiveDateModal(dateStr);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Calendar Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 22, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <CalendarIcon size={22} style={{ color: "var(--primary)" }} />
            <span>Broadcast Calendar</span>
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            Visual schedule of upcoming quotes and occasion wishes.
          </p>
        </div>

        {/* Month Navigator */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button className="btn-secondary" onClick={handlePrevMonth} style={{ padding: "6px 12px", minHeight: 36 }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 16, fontWeight: 700, minWidth: 140, textAlign: "center" }}>
            {monthName} {year}
          </span>
          <button className="btn-secondary" onClick={handleNextMonth} style={{ padding: "6px 12px", minHeight: 36 }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="glass-card" style={{ padding: "14px 12px" }}>
        {/* Days of Week Header */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, textAlign: "center", marginBottom: 8 }}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", padding: "4px 0" }}>
              <span className="desktop-only">{d}</span>
              <span className="mobile-only">{d.slice(0, 1)}</span>
            </div>
          ))}
        </div>

        {/* Calendar Day Cells */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {/* Empty cells before month start */}
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} style={{ minHeight: "clamp(50px, 8vw, 90px)", background: "rgba(255, 255, 255, 0.01)", borderRadius: "var(--radius-sm)" }} />
          ))}

          {/* Actual day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dayEvents = getEventsForDay(dayNum);
            const hasEvents = dayEvents.length > 0;

            return (
              <div
                key={`day-${dayNum}`}
                onClick={() => handleDayClick(dayNum)}
                style={{
                  minHeight: "clamp(50px, 8vw, 90px)",
                  padding: "4px 6px",
                  borderRadius: "var(--radius-sm)",
                  background: hasEvents ? "rgba(99, 102, 241, 0.12)" : "rgba(255, 255, 255, 0.01)",
                  border: hasEvents ? "1px solid rgba(99, 102, 241, 0.4)" : "1px solid var(--border-subtle)",
                  cursor: hasEvents ? "pointer" : "default",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "var(--transition-fast)",
                  overflow: "hidden"
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: hasEvents ? "var(--text-primary)" : "var(--text-muted)" }}>
                  {dayNum}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                  {dayEvents.slice(0, 2).map((ev) => (
                    <div
                      key={ev.id}
                      style={{
                        fontSize: 10,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: ev.event_type === "WISH" ? "rgba(236, 72, 153, 0.2)" : "rgba(99, 102, 241, 0.2)",
                        color: ev.event_type === "WISH" ? "#f472b6" : "#a5b4fc",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {ev.event_type === "WISH" ? "💌 " : "💬 "}
                      {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div style={{ fontSize: 9, color: "var(--text-muted)" }}>
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Date Details Modal */}
      {activeDateModal && (
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
          <div className="glass-card" style={{ maxWidth: 540, width: "100%", padding: 28, borderRadius: "var(--radius-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 18, margin: 0 }}>Scheduled Events</h3>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                  Date: {activeDateModal}
                </div>
              </div>
              <button className="btn-icon" onClick={() => setActiveDateModal(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {selectedEvent.map((ev) => (
                <div
                  key={ev.id}
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-sm)",
                    padding: 16
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <span className={`badge ${ev.event_type === "WISH" ? "badge-primary" : "badge-info"}`}>
                        {ev.event_type === "WISH" ? "Occasion Wish" : "Quote Broadcast"}
                      </span>
                      <h4 style={{ fontSize: 15, margin: "6px 0 0 0" }}>{ev.title}</h4>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                        Recipient: {ev.recipient} • Time: {ev.time}
                      </div>
                    </div>

                    <span className="badge badge-success">{ev.status}</span>
                  </div>

                  {ev.quote_text && (
                    <div style={{
                      fontStyle: "italic",
                      fontSize: 13,
                      background: "rgba(255, 255, 255, 0.02)",
                      padding: "8px 12px",
                      borderRadius: 4,
                      marginBottom: 10
                    }}>
                      "{ev.quote_text}"
                    </div>
                  )}

                  {ev.event_type === "QUOTE" && ev.status === "SCHEDULED" && (
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                      <button
                        className="btn-success"
                        onClick={async () => {
                          await onSendQuoteNow(ev.entity_id);
                          await loadEvents();
                          setActiveDateModal(null);
                        }}
                        style={{ padding: "4px 10px", fontSize: 12 }}
                      >
                        <Play size={12} />
                        <span>Send Now</span>
                      </button>
                      <button
                        className="btn-danger"
                        onClick={async () => {
                          await onCancelQuote(ev.entity_id);
                          await loadEvents();
                          setActiveDateModal(null);
                        }}
                        style={{ padding: "4px 10px", fontSize: 12 }}
                      >
                        <span>Cancel Schedule</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
