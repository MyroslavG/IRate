"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Plus } from "lucide-react";
import { api, ListOut } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import SignInModal from "../components/SignInModal";

const CATEGORIES = [
  "Movies",
  "Games",
  "Beers",
  "Cars",
  "Animals",
  "Restaurants",
  "Books",
  "Music",
  "TV Shows",
  "Snacks",
];

export default function ExplorePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [lists, setLists] = useState<ListOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSignIn, setShowSignIn] = useState(false);

  const handleCreateList = () => {
    if (user) {
      router.push("/lists");
    } else {
      setShowSignIn(true);
    }
  };

  useEffect(() => {
    setLoading(true);
    api
      .getPublicLists({
        category: activeCategory || undefined,
        search: search || undefined,
      })
      .then(setLists)
      .catch(() => setLists([]))
      .finally(() => setLoading(false));
  }, [activeCategory, search]);

  return (
    <div className="container">
      <div className="page-header">
        <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {!user && (
            <button
              onClick={() => router.push("/")}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", padding: 0 }}
            >
              <ArrowLeft size={18} />
            </button>
          )}
          Explore
        </h2>
        <button className="btn" onClick={handleCreateList}>
          <Plus size={14} /> Create a List
        </button>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search public lists..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="category-pills">
        <button
          className={`pill ${!activeCategory ? "active" : ""}`}
          onClick={() => setActiveCategory(null)}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`pill ${activeCategory === cat ? "active" : ""}`}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty-state"><p>Loading...</p></div>
      ) : lists.length === 0 ? (
        <div className="empty-state">
          <p>No public lists found.</p>
        </div>
      ) : (
        <div className="lists-grid">
          {lists.map((list, i) => (
            <motion.div
              key={list.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.04 }}
            >
              <Link href={`/list/${list.owner.username}/${list.slug}`} className="list-card">
                <div className="list-card-info">
                  <h3>{list.title}</h3>
                  <span className="meta">
                    {list.category && <span className="category-tag">{list.category}</span>}
                    {list.description}
                  </span>
                  <span
                    className="list-author clickable"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/profile/${list.owner.username}`; }}
                  >
                    by @{list.owner.username}
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

      <SignInModal
        open={showSignIn}
        onClose={() => setShowSignIn(false)}
        onSuccess={() => router.push("/lists")}
      />
    </div>
  );
}
