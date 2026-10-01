import React, { useState } from "react";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Sparkles,
  Calendar,
  CheckCircle,
  XCircle,
  Mail
} from "lucide-react";
import { Friend } from "../api";
import { FriendModal } from "./FriendModal";

interface FriendsViewProps {
  friends: Friend[];
  onAddFriend: (data: Partial<Friend>) => Promise<void>;
  onUpdateFriend: (id: number, data: Partial<Friend>) => Promise<void>;
  onDeleteFriend: (id: number) => Promise<void>;
  onPreviewWish: (friendId: number) => void;
}

export const FriendsView: React.FC<FriendsViewProps> = ({
  friends,
  onAddFriend,
  onUpdateFriend,
  onDeleteFriend,
  onPreviewWish
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOccasion, setSelectedOccasion] = useState("");
  const [selectedRelationship, setSelectedRelationship] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFriend, setEditingFriend] = useState<Friend | null>(null);

  // Filter friends based on inputs
  const filteredFriends = friends.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.personal_notes && f.personal_notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesOccasion = !selectedOccasion || f.occasion_type === selectedOccasion;
    const matchesRel = !selectedRelationship || f.relationship_type === selectedRelationship;

    return matchesSearch && matchesOccasion && matchesRel;
  });

  const handleOpenAdd = () => {
    setEditingFriend(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (friend: Friend) => {
    setEditingFriend(friend);
    setIsModalOpen(true);
  };

  const handleSave = async (data: Partial<Friend>) => {
    if (editingFriend) {
      await onUpdateFriend(editingFriend.id, data);
    } else {
      await onAddFriend(data);
    }
  };

  const getMonthName = (month: number) => {
    return new Date(2000, month - 1, 1).toLocaleString("default", { month: "short" });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Top Header & Add Button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 24, margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
            <span>Friends & Occasions</span>
            <span className="badge badge-primary">{friends.length} Registered</span>
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
            Manage the contacts and occasions monitored by the AI Wish Agent.
          </p>
        </div>
        <button id="add-friend-btn" className="btn-primary" onClick={handleOpenAdd}>
          <UserPlus size={16} />
          <span>Add Contact</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card" style={{
        padding: "16px 20px",
        display: "grid",
        gridTemplateColumns: "1.8fr 1fr 1fr",
        gap: 16,
        alignItems: "center"
      }}>
        {/* Search */}
        <div style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: 14, top: 13, color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search by name, email, or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: 40 }}
          />
        </div>

        {/* Occasion Filter */}
        <div>
          <select value={selectedOccasion} onChange={(e) => setSelectedOccasion(e.target.value)}>
            <option value="">All Occasions</option>
            <option value="Birthday">Birthday</option>
            <option value="Anniversary">Anniversary</option>
            <option value="Work Anniversary">Work Anniversary</option>
            <option value="Festival">Festival</option>
            <option value="Custom">Custom</option>
          </select>
        </div>

        {/* Relationship Filter */}
        <div>
          <select value={selectedRelationship} onChange={(e) => setSelectedRelationship(e.target.value)}>
            <option value="">All Relationships</option>
            <option value="Friend">Friend</option>
            <option value="Best Friend">Best Friend</option>
            <option value="Colleague">Colleague</option>
            <option value="Mentor">Mentor</option>
            <option value="Family">Family</option>
          </select>
        </div>
      </div>

      {/* Friends Cards / Grid */}
      {filteredFriends.length === 0 ? (
        <div className="glass-card" style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)" }}>
          <Users size={36} style={{ margin: "0 auto 12px auto", opacity: 0.5 }} />
          <p>No contacts found matching your search and filter criteria.</p>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
          gap: 20
        }}>
          {filteredFriends.map((friend) => (
            <div
              key={friend.id}
              className="glass-card"
              style={{
                padding: 22,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                opacity: friend.is_active ? 1 : 0.6
              }}
            >
              <div>
                {/* Header row: Initial + Name + Status */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 16
                    }}>
                      {friend.name.charAt(0)}
                    </div>
                    <div>
                      <h3 style={{ fontSize: 16, margin: 0 }}>{friend.name}</h3>
                      <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{friend.email}</div>
                    </div>
                  </div>

                  <span className={`badge ${friend.is_active ? "badge-success" : "badge-danger"}`} style={{ fontSize: 11 }}>
                    {friend.is_active ? "Active" : "Disabled"}
                  </span>
                </div>

                {/* Details pill row */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                  <span className="badge badge-primary">
                    <Calendar size={12} />
                    {getMonthName(friend.birth_month)} {friend.birth_day}
                    {friend.birth_year ? ` (${friend.birth_year})` : ""}
                  </span>
                  <span className="badge badge-info">{friend.occasion_type}</span>
                  <span className="badge badge-warning">{friend.relationship_type}</span>
                  <span className="badge badge-primary" style={{ background: "rgba(255,255,255,0.06)" }}>
                    Tone: {friend.preferred_tone}
                  </span>
                </div>

                {/* Personal Notes snippet */}
                {friend.personal_notes && (
                  <div style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    background: "rgba(255, 255, 255, 0.02)",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-sm)",
                    borderLeft: "3px solid var(--primary)",
                    marginBottom: 16
                  }}>
                    {friend.personal_notes}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: 14,
                borderTop: "1px solid var(--border-subtle)"
              }}>
                <button
                  className="btn-secondary"
                  onClick={() => onPreviewWish(friend.id)}
                  style={{ fontSize: 12, padding: "6px 12px" }}
                  title="Generate a preview wish right now"
                >
                  <Sparkles size={13} style={{ color: "#a5b4fc" }} />
                  <span>Preview AI Wish</span>
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button
                    className="btn-icon"
                    onClick={() => handleOpenEdit(friend)}
                    title="Edit Contact"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete ${friend.name}?`)) {
                        onDeleteFriend(friend.id);
                      }
                    }}
                    title="Delete Contact"
                    style={{ color: "#f87171" }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <FriendModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initialFriend={editingFriend}
      />
    </div>
  );
};
