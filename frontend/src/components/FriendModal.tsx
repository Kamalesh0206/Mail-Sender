import React, { useState, useEffect } from "react";
import { X, UserPlus, Save, AlertCircle } from "lucide-react";
import { Friend } from "../api";

interface FriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Friend>) => Promise<void>;
  initialFriend?: Friend | null;
}

export const FriendModal: React.FC<FriendModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialFriend
}) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthMonth, setBirthMonth] = useState(1);
  const [birthDay, setBirthDay] = useState(1);
  const [birthYear, setBirthYear] = useState<number | undefined>(undefined);
  const [occasionType, setOccasionType] = useState("Birthday");
  const [relationshipType, setRelationshipType] = useState("Friend");
  const [personalNotes, setPersonalNotes] = useState("");
  const [preferredTone, setPreferredTone] = useState("Friendly");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialFriend) {
      setName(initialFriend.name);
      setEmail(initialFriend.email);
      setBirthMonth(initialFriend.birth_month);
      setBirthDay(initialFriend.birth_day);
      setBirthYear(initialFriend.birth_year || undefined);
      setOccasionType(initialFriend.occasion_type || "Birthday");
      setRelationshipType(initialFriend.relationship_type || "Friend");
      setPersonalNotes(initialFriend.personal_notes || "");
      setPreferredTone(initialFriend.preferred_tone || "Friendly");
      setIsActive(initialFriend.is_active ?? true);

      if (initialFriend.birth_year) {
        setBirthDate(
          `${initialFriend.birth_year}-${String(initialFriend.birth_month).padStart(2, "0")}-${String(initialFriend.birth_day).padStart(2, "0")}`
        );
      } else {
        setBirthDate("");
      }
    } else {
      // Defaults for new friend
      setName("");
      setEmail("");
      setBirthDate("");
      const now = new Date();
      setBirthMonth(now.getMonth() + 1);
      setBirthDay(now.getDate());
      setBirthYear(undefined);
      setOccasionType("Birthday");
      setRelationshipType("Friend");
      setPersonalNotes("");
      setPreferredTone("Friendly");
      setIsActive(true);
    }
    setError(null);
  }, [initialFriend, isOpen]);

  const handleDateChange = (val: string) => {
    setBirthDate(val);
    if (val) {
      const parts = val.split("-");
      if (parts.length === 3) {
        setBirthYear(parseInt(parts[0], 10));
        setBirthMonth(parseInt(parts[1], 10));
        setBirthDay(parseInt(parts[2], 10));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Friend name is required");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("A valid email address is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        birth_month: birthMonth,
        birth_day: birthDay,
        birth_year: birthYear || undefined,
        birth_date: birthDate || undefined,
        occasion_type: occasionType,
        relationship_type: relationshipType,
        personal_notes: personalNotes.trim() || undefined,
        preferred_tone: preferredTone,
        is_active: isActive
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save friend");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

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
        maxWidth: 580,
        width: "100%",
        padding: 32,
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-lg)",
        maxHeight: "90vh",
        overflowY: "auto"
      }}>
        {/* Modal Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <UserPlus size={20} style={{ color: "var(--primary)" }} />
            <span>{initialFriend ? "Edit Friend & Occasion" : "Add New Friend"}</span>
          </h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

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
            marginBottom: 20
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Name & Email */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Full Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Arun Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Email Address *
              </label>
              <input
                type="email"
                placeholder="e.g. arun@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Occasion & Relationship */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Occasion Type
              </label>
              <select value={occasionType} onChange={(e) => setOccasionType(e.target.value)}>
                <option value="Birthday">Birthday</option>
                <option value="Anniversary">Anniversary</option>
                <option value="Work Anniversary">Work Anniversary</option>
                <option value="Festival">Festival</option>
                <option value="Custom">Custom Occasion</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Relationship
              </label>
              <select value={relationshipType} onChange={(e) => setRelationshipType(e.target.value)}>
                <option value="Friend">Friend</option>
                <option value="Best Friend">Best Friend</option>
                <option value="Colleague">Colleague</option>
                <option value="Mentor">Mentor</option>
                <option value="Family">Family</option>
                <option value="Manager">Manager</option>
              </select>
            </div>
          </div>

          {/* Date Selector */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Occasion Date (Year is optional)
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 10 }}>
              <div>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  title="Pick full date or specify Month/Day manually"
                />
              </div>
              <div>
                <select
                  value={birthMonth}
                  onChange={(e) => setBirthMonth(parseInt(e.target.value, 10))}
                  title="Month"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2000, m - 1, 1).toLocaleString("default", { month: "long" })}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  value={birthDay}
                  onChange={(e) => setBirthDay(parseInt(e.target.value, 10))}
                  title="Day"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      Day {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Preferred Tone */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Preferred AI Tone
            </label>
            <select value={preferredTone} onChange={(e) => setPreferredTone(e.target.value)}>
              <option value="Friendly">Friendly (Warm & cheerful)</option>
              <option value="Professional">Professional (Respectful & polished)</option>
              <option value="Funny">Funny (Playful with witty banter)</option>
              <option value="Emotional">Emotional (Heartfelt & deep gratitude)</option>
              <option value="Casual">Casual (Upbeat & conversational)</option>
            </select>
          </div>

          {/* Personal Notes */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Personal Notes & Context (Fed to Gemini for ultra-personalization)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Loves espresso, recently ran a marathon, avid sci-fi reader."
              value={personalNotes}
              onChange={(e) => setPersonalNotes(e.target.value)}
            />
          </div>

          {/* Active Toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
            <input
              type="checkbox"
              id="is_active_toggle"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              style={{ width: "auto", cursor: "pointer" }}
            />
            <label htmlFor="is_active_toggle" style={{ fontSize: 14, cursor: "pointer" }}>
              Enable automated wishes for this contact
            </label>
          </div>

          {/* Footer Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 12 }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button id="save-friend-btn" type="submit" className="btn-primary" disabled={isSubmitting}>
              <Save size={15} />
              <span>{isSubmitting ? "Saving..." : "Save Contact"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
