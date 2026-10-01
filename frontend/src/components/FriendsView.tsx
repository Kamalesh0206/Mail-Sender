import React, { useState } from "react";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Download,
  Edit2,
  Trash2,
  Calendar,
  CheckCircle,
  XCircle,
  FolderPlus,
  X,
  Heart,
  Quote
} from "lucide-react";
import { Friend, FriendGroup, api } from "../api";

interface FriendsViewProps {
  friends: Friend[];
  groups: FriendGroup[];
  onAddFriend: (data: any) => Promise<void>;
  onUpdateFriend: (id: number, data: any) => Promise<void>;
  onDeleteFriend: (id: number) => Promise<void>;
  onCreateGroup: (data: { name: string; description?: string }) => Promise<void>;
  onDeleteGroup: (id: number) => Promise<void>;
}

export const FriendsView: React.FC<FriendsViewProps> = ({
  friends,
  groups,
  onAddFriend,
  onUpdateFriend,
  onDeleteFriend,
  onCreateGroup,
  onDeleteGroup
}) => {
  const [activeTab, setActiveTab] = useState<"friends" | "groups">("friends");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selectedRelationship, setSelectedRelationship] = useState<string>("");

  // Friend Modal State
  const [isFriendModalOpen, setIsFriendModalOpen] = useState(false);
  const [editingFriend, setEditingFriend] = useState<Friend | null>(null);
  const [fName, setFName] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fBirthday, setFBirthday] = useState("");
  const [fAnniversary, setFAnniversary] = useState("");
  const [fRelationship, setFRelationship] = useState("Close Friend");
  const [fNotes, setFNotes] = useState("");
  const [fActive, setFActive] = useState(true);
  const [fEnableWishes, setFEnableWishes] = useState(true);
  const [fEnableQuotes, setFEnableQuotes] = useState(true);
  const [fSelectedGroups, setFSelectedGroups] = useState<number[]>([]);

  // Group Modal State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");

  const filteredFriends = friends.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.personal_notes && f.personal_notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRel = !selectedRelationship || f.relationship === selectedRelationship;
    const matchesGrp = !selectedGroup || (f.groups && f.groups.includes(selectedGroup));

    return matchesSearch && matchesRel && matchesGrp;
  });

  const handleOpenAddFriend = () => {
    setEditingFriend(null);
    setFName("");
    setFEmail("");
    setFBirthday("");
    setFAnniversary("");
    setFRelationship("Close Friend");
    setFNotes("");
    setFActive(true);
    setFEnableWishes(true);
    setFEnableQuotes(true);
    setFSelectedGroups([]);
    setIsFriendModalOpen(true);
  };

  const handleOpenEditFriend = (friend: Friend) => {
    setEditingFriend(friend);
    setFName(friend.name);
    setFEmail(friend.email);
    setFBirthday(friend.birthday || "");
    setFAnniversary(friend.anniversary || "");
    setFRelationship(friend.relationship || "Close Friend");
    setFNotes(friend.personal_notes || "");
    setFActive(friend.is_active ?? true);
    setFEnableWishes(friend.enable_wishes ?? true);
    setFEnableQuotes(friend.enable_quotes ?? true);
    // Find matching group IDs
    const matchedGids = groups.filter(g => friend.groups?.includes(g.name)).map(g => g.id);
    setFSelectedGroups(matchedGids);
    setIsFriendModalOpen(true);
  };

  const handleSaveFriendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: fName.trim(),
      email: fEmail.trim().toLowerCase(),
      birthday: fBirthday.trim() || undefined,
      anniversary: fAnniversary.trim() || undefined,
      relationship: fRelationship,
      personal_notes: fNotes.trim() || undefined,
      is_active: fActive,
      enable_wishes: fEnableWishes,
      enable_quotes: fEnableQuotes,
      group_ids: fSelectedGroups
    };

    if (editingFriend) {
      await onUpdateFriend(editingFriend.id, data);
    } else {
      await onAddFriend(data);
    }
    setIsFriendModalOpen(false);
  };

  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    await onCreateGroup({ name: groupName.trim(), description: groupDesc.trim() || undefined });
    setIsGroupModalOpen(false);
    setGroupName("");
    setGroupDesc("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 22, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Users size={22} style={{ color: "var(--primary)" }} />
            <span>Friends & Groups</span>
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            Manage recipient contacts, custom groups, and channel preferences.
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <a
            href="http://localhost:8000/api/v1/friends/export"
            download="wishmail_friends.csv"
            className="btn-secondary"
            style={{ fontSize: 12, padding: "8px 12px" }}
          >
            <Download size={13} />
            <span>Export CSV</span>
          </a>

          {activeTab === "friends" ? (
            <button className="btn-primary" onClick={handleOpenAddFriend} style={{ fontSize: 12, padding: "8px 14px" }}>
              <UserPlus size={14} />
              <span>Add Friend</span>
            </button>
          ) : (
            <button className="btn-primary" onClick={() => setIsGroupModalOpen(true)} style={{ fontSize: 12, padding: "8px 14px" }}>
              <FolderPlus size={14} />
              <span>Create Group</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 10 }}>
        <button
          onClick={() => setActiveTab("friends")}
          style={{
            padding: "8px 14px",
            borderRadius: "var(--radius-sm)",
            fontSize: 13,
            fontWeight: 600,
            background: activeTab === "friends" ? "rgba(99, 102, 241, 0.15)" : "transparent",
            color: activeTab === "friends" ? "#ffffff" : "var(--text-secondary)",
            border: activeTab === "friends" ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid transparent"
          }}
        >
          Friends ({friends.length})
        </button>

        <button
          onClick={() => setActiveTab("groups")}
          style={{
            padding: "8px 14px",
            borderRadius: "var(--radius-sm)",
            fontSize: 13,
            fontWeight: 600,
            background: activeTab === "groups" ? "rgba(99, 102, 241, 0.15)" : "transparent",
            color: activeTab === "groups" ? "#ffffff" : "var(--text-secondary)",
            border: activeTab === "groups" ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid transparent"
          }}
        >
          Friend Groups ({groups.length})
        </button>
      </div>

      {/* Tab 1: Friends Table */}
      {activeTab === "friends" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Filters */}
          <div className="glass-card" style={{ padding: "12px 14px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <div style={{ position: "relative" }}>
              <Search size={15} style={{ position: "absolute", left: 12, top: 12, color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Search by name, email, or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: 36, fontSize: 13 }}
              />
            </div>

            <div>
              <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} style={{ fontSize: 13 }}>
                <option value="">All Groups</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.name}>{g.name}</option>
                ))}
              </select>
            </div>

            <div>
              <select value={selectedRelationship} onChange={(e) => setSelectedRelationship(e.target.value)} style={{ fontSize: 13 }}>
                <option value="">All Relationships</option>
                <option value="Close Friend">Close Friend</option>
                <option value="College Friends">College Friends</option>
                <option value="Office Friends">Office Friends</option>
                <option value="Family">Family</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="glass-card" style={{ overflow: "hidden" }}>
            <div className="table-responsive" style={{ margin: 0 }}>
              <table style={{ width: "100%", minWidth: 620, borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "rgba(255, 255, 255, 0.02)", borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", textTransform: "uppercase" }}>
                    <th style={{ padding: "12px 16px" }}>Friend</th>
                    <th style={{ padding: "12px 16px" }}>Birthday</th>
                    <th style={{ padding: "12px 16px" }}>Anniversary</th>
                    <th style={{ padding: "12px 16px" }}>Relationship</th>
                    <th style={{ padding: "12px 16px" }}>Groups</th>
                    <th style={{ padding: "12px 16px" }}>Channels</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFriends.map((f) => (
                    <tr key={f.id} style={{ borderBottom: "1px solid var(--border-subtle)", opacity: f.is_active ? 1 : 0.5 }}>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{f.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{f.email}</div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>{f.birthday || "—"}</td>
                      <td style={{ padding: "12px 16px" }}>{f.anniversary || "—"}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span className="badge badge-info">{f.relationship}</span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {f.groups && f.groups.length > 0 ? (
                            f.groups.map(g => (
                              <span key={g} className="badge badge-primary" style={{ fontSize: 10, padding: "1px 6px" }}>{g}</span>
                            ))
                          ) : (
                            <span style={{ color: "var(--text-muted)" }}>None</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <span className={`badge ${f.enable_wishes ? "badge-success" : "badge"}`} title="Wishes enabled">
                            <Heart size={10} /> Wishes
                          </span>
                          <span className={`badge ${f.enable_quotes ? "badge-success" : "badge"}`} title="Quotes enabled">
                            <Quote size={10} /> Quotes
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <button className="btn-icon" onClick={() => handleOpenEditFriend(f)} title="Edit Friend">
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="btn-icon"
                            onClick={() => {
                              if (confirm(`Delete friend ${f.name}?`)) onDeleteFriend(f.id);
                            }}
                            title="Delete Friend"
                            style={{ color: "#f87171" }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Groups Table */}
      {activeTab === "groups" && (
        <div className="glass-card" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "rgba(255, 255, 255, 0.02)", borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", textTransform: "uppercase" }}>
                <th style={{ padding: "14px 18px" }}>Group Name</th>
                <th style={{ padding: "14px 18px" }}>Description</th>
                <th style={{ padding: "14px 18px" }}>Active Members</th>
                <th style={{ padding: "14px 18px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((grp) => (
                <tr key={grp.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "14px 18px", fontWeight: 600 }}>{grp.name}</td>
                  <td style={{ padding: "14px 18px", color: "var(--text-secondary)" }}>{grp.description || "—"}</td>
                  <td style={{ padding: "14px 18px" }}>
                    <span className="badge badge-primary">{grp.member_count ?? 0} Friends</span>
                  </td>
                  <td style={{ padding: "14px 18px", textAlign: "right" }}>
                    <button
                      className="btn-icon"
                      onClick={() => {
                        if (confirm(`Delete group '${grp.name}'?`)) onDeleteGroup(grp.id);
                      }}
                      style={{ color: "#f87171" }}
                      title="Delete Group"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Friend Modal */}
      {isFriendModalOpen && (
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
          <div className="glass-card" style={{ maxWidth: 560, width: "100%", padding: 28, borderRadius: "var(--radius-lg)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, margin: 0 }}>{editingFriend ? "Edit Friend" : "Add Friend"}</h3>
              <button className="btn-icon" onClick={() => setIsFriendModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveFriendSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Full Name *</label>
                  <input type="text" value={fName} onChange={(e) => setFName(e.target.value)} required placeholder="Arun Kumar" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Email Address *</label>
                  <input type="email" value={fEmail} onChange={(e) => setFEmail(e.target.value)} required placeholder="arun@gmail.com" />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Birthday (e.g. 05 October)</label>
                  <input type="text" value={fBirthday} onChange={(e) => setFBirthday(e.target.value)} placeholder="05 October" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Anniversary (e.g. 12 December)</label>
                  <input type="text" value={fAnniversary} onChange={(e) => setFAnniversary(e.target.value)} placeholder="12 December" />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Relationship</label>
                  <select value={fRelationship} onChange={(e) => setFRelationship(e.target.value)}>
                    <option value="Close Friend">Close Friend</option>
                    <option value="College Friends">College Friends</option>
                    <option value="Office Friends">Office Friends</option>
                    <option value="Family">Family</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Assign Groups</label>
                  <select
                    multiple
                    value={fSelectedGroups.map(String)}
                    onChange={(e) => {
                      const vals = Array.from(e.target.selectedOptions, o => Number(o.value));
                      setFSelectedGroups(vals);
                    }}
                    style={{ height: 75 }}
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Personal Notes</label>
                <textarea
                  rows={2}
                  value={fNotes}
                  onChange={(e) => setFNotes(e.target.value)}
                  placeholder="Works as software engineer and likes technology."
                />
              </div>

              <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" checked={fEnableWishes} onChange={(e) => setFEnableWishes(e.target.checked)} style={{ width: "auto" }} />
                  <span>Enable Wishes</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" checked={fEnableQuotes} onChange={(e) => setFEnableQuotes(e.target.checked)} style={{ width: "auto" }} />
                  <span>Enable Quotes</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" checked={fActive} onChange={(e) => setFActive(e.target.checked)} style={{ width: "auto" }} />
                  <span>Active</span>
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                <button type="button" className="btn-secondary" onClick={() => setIsFriendModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Friend</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Group Modal */}
      {isGroupModalOpen && (
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
          <div className="glass-card" style={{ maxWidth: 440, width: "100%", padding: 28, borderRadius: "var(--radius-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, margin: 0 }}>Create Friend Group</h3>
              <button className="btn-icon" onClick={() => setIsGroupModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGroupSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Group Name *</label>
                <input
                  type="text"
                  placeholder="e.g. College Friends"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Description</label>
                <textarea
                  rows={2}
                  placeholder="Optional notes about this group."
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button type="button" className="btn-secondary" onClick={() => setIsGroupModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create Group</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
