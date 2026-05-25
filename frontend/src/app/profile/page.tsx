"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Globe, Lock, X } from "lucide-react";
import { api, User, ListOut, FollowStats } from "../lib/api";
import { useAuth } from "../lib/auth-context";

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [lists, setLists] = useState<ListOut[]>([]);
  const [followStats, setFollowStats] = useState<FollowStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [followModal, setFollowModal] = useState<"followers" | "following" | null>(null);
  const [followList, setFollowList] = useState<User[]>([]);
  const [followListLoading, setFollowListLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/"); return; }
    Promise.all([
      api.getMyLists(),
      api.getFollowStats(user.username),
    ]).then(([myLists, stats]) => {
      setLists(myLists);
      setFollowStats(stats);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user, authLoading, router]);

  const toggleVisibility = async (list: ListOut) => {
    try {
      const updated = await api.updateList(list.id, { is_public: !list.is_public });
      setLists(lists.map((l) => l.id === list.id ? { ...l, is_public: updated.is_public } : l));
    } catch (err) {
      console.error("Failed to toggle visibility:", err);
    }
  };

  const openFollowModal = async (type: "followers" | "following") => {
    if (!user) return;
    setFollowModal(type);
    setFollowListLoading(true);
    try {
      const data = type === "followers"
        ? await api.getFollowers(user.username)
        : await api.getFollowing(user.username);
      setFollowList(data);
    } catch {
      setFollowList([]);
    }
    setFollowListLoading(false);
  };

  if (authLoading || loading) {
    return <div className="container"><div className="empty-state"><p>Loading...</p></div></div>;
  }

  if (!user) return null;

  const totalItems = lists.reduce((sum, l) => sum + l.item_count, 0);
  const topCategory = lists.length > 0
    ? Object.entries(lists.reduce((acc, l) => { if (l.category) acc[l.category] = (acc[l.category] || 0) + 1; return acc; }, {} as Record<string, number>))
        .sort((a, b) => b[1] - a[1])[0]?.[0] || "—"
    : "—";

  return (
    <div className="container">
      <div className="profile-header">
        <div className="profile-avatar">
          <span>{(user.display_name || user.username)[0].toUpperCase()}</span>
        </div>
        <div className="profile-info">
          <h2>{user.display_name || user.username}</h2>
          <span className="profile-username">@{user.username}</span>
          <span className="profile-joined">Joined {new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
        </div>
      </div>

      <div className="profile-stats">
        <div className="profile-stat">
          <div className="value">{lists.length}</div>
          <div className="label">Lists</div>
        </div>
        <div className="profile-stat">
          <div className="value">{totalItems}</div>
          <div className="label">Ratings</div>
        </div>
        {followStats && (
          <>
            <div className="profile-stat clickable" onClick={() => openFollowModal("followers")}>
              <div className="value">{followStats.followers_count}</div>
              <div className="label">Followers</div>
            </div>
            <div className="profile-stat clickable" onClick={() => openFollowModal("following")}>
              <div className="value">{followStats.following_count}</div>
              <div className="label">Following</div>
            </div>
          </>
        )}
      </div>

      <div className="lists-grid">
        {lists.map((list, i) => (
          <motion.div
            key={list.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.04 }}
            className="list-card-wrapper"
          >
            <Link href={`/list/${user.username}/${list.slug}`} className="list-card">
              <div className="list-card-info">
                <h3>{list.title}</h3>
                <span className="meta">
                  {list.category && <span className="category-tag">{list.category}</span>}
                  {list.item_count} items
                </span>
              </div>
              <div className="list-card-stats">
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  {new Date(list.updated_at).toLocaleDateString()}
                </span>
              </div>
            </Link>
            <button
              className={`visibility-toggle ${list.is_public ? "public" : "private"}`}
              onClick={() => toggleVisibility(list)}
              title={list.is_public ? "Public — click to make private" : "Private — click to make public"}
            >
              {list.is_public ? <Globe size={13} /> : <Lock size={13} />}
              {list.is_public ? "Public" : "Private"}
            </button>
          </motion.div>
        ))}
      </div>

      {lists.length === 0 && (
        <div className="empty-state">
          <p>No lists yet. <Link href="/lists">Create your first one!</Link></p>
        </div>
      )}

      {followModal && (
        <div className="follow-modal-overlay" onClick={() => setFollowModal(null)}>
          <div className="follow-modal" onClick={(e) => e.stopPropagation()}>
            <div className="follow-modal-header">
              <h3>{followModal === "followers" ? "Followers" : "Following"}</h3>
              <button className="follow-modal-close" onClick={() => setFollowModal(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="follow-modal-list">
              {followListLoading ? (
                <div className="follow-modal-empty">Loading...</div>
              ) : followList.length === 0 ? (
                <div className="follow-modal-empty">
                  {followModal === "followers" ? "No followers yet" : "Not following anyone"}
                </div>
              ) : (
                followList.map((u) => (
                  <Link
                    key={u.id}
                    href={`/profile/${u.username}`}
                    className="follow-modal-user"
                    onClick={() => setFollowModal(null)}
                  >
                    <div className="follow-modal-avatar">
                      {(u.display_name || u.username)[0].toUpperCase()}
                    </div>
                    <div className="follow-modal-info">
                      <span className="follow-modal-name">{u.display_name || u.username}</span>
                      <span className="follow-modal-username">@{u.username}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
