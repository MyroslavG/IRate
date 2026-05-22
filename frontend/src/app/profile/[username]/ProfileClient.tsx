"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { api, User, ListOut } from "../../lib/api";

export default function ProfileClient() {
  const { username } = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<User | null>(null);
  const [lists, setLists] = useState<ListOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getUserProfile(username as string),
      api.getUserLists(username as string),
    ])
      .then(([user, userLists]) => {
        setProfile(user);
        setLists(userLists);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return <div className="container"><div className="empty-state"><p>Loading...</p></div></div>;
  }

  if (error || !profile) {
    return (
      <div className="container">
        <button className="back-link" onClick={() => router.back()}><ArrowLeft size={14} /> Back</button>
        <div className="empty-state"><p>User not found</p></div>
      </div>
    );
  }

  const totalItems = lists.reduce((sum, l) => sum + l.item_count, 0);

  return (
    <div className="container">
      <button className="back-link" onClick={() => router.back()}><ArrowLeft size={14} /> Back</button>

      <div className="profile-header">
        <div className="profile-avatar">
          <span>{(profile.display_name || profile.username)[0].toUpperCase()}</span>
        </div>
        <div className="profile-info">
          <h2>{profile.display_name || profile.username}</h2>
          <span className="profile-username">@{profile.username}</span>
          <span className="profile-joined">Joined {new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
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
      </div>

      <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Public Lists</h3>

      {lists.length === 0 ? (
        <div className="empty-state"><p>No public lists yet.</p></div>
      ) : (
        <div className="lists-grid">
          {lists.map((list, i) => (
            <motion.div
              key={list.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.04 }}
            >
              <Link href={`/list/${username}/${list.slug}`} className="list-card">
                <div className="list-card-info">
                  <h3>{list.title}</h3>
                  <span className="meta">
                    {list.category && <span className="category-tag">{list.category}</span>}
                    {list.description}
                  </span>
                </div>
                <div className="list-card-stats">
                  <div className="count">{list.item_count}</div>
                  items
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
