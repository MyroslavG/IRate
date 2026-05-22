"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus } from "lucide-react";
import { api, ListOut } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import SignInModal from "../components/SignInModal";

const DEFAULT_CATEGORIES = [
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
  const [showModal, setShowModal] = useState(false);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [form, setForm] = useState({ title: "", description: "", category: "", customCategory: "" });

  useEffect(() => {
    api.getCategories().then((stored) => {
      const merged = Array.from(new Set([...DEFAULT_CATEGORIES, ...stored]));
      setCategories(merged);
    }).catch(() => {});
  }, []);

  const handleCreateList = () => {
    if (user) {
      setShowModal(true);
    } else {
      setShowSignIn(true);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const category = form.category === "__custom" ? form.customCategory : form.category || undefined;

    if (form.category === "__custom" && form.customCategory && !categories.includes(form.customCategory)) {
      setCategories([...categories, form.customCategory]);
    }

    try {
      await api.createList({
        title: form.title,
        description: form.description || undefined,
        category,
      });
      setForm({ title: "", description: "", category: "", customCategory: "" });
      setShowModal(false);
      router.push("/lists");
    } catch (err) {
      console.error("Failed to create list:", err);
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
        {categories.map((cat) => (
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

      <AnimatePresence>
        {showModal && (
          <motion.div
            className="modal-overlay"
            onClick={() => setShowModal(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="modal"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <h2>Create a New List</h2>
              <form onSubmit={handleCreate}>
                <div className="form-group">
                  <label>Title</label>
                  <input
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Best Pizza in Brooklyn"
                  />
                </div>
                <div className="form-group">
                  <label>Category <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span></label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    <option value="">No category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="__custom">+ Add new category</option>
                  </select>
                </div>
                {form.category === "__custom" && (
                  <div className="form-group">
                    <label>New Category Name</label>
                    <input
                      required
                      value={form.customCategory}
                      onChange={(e) => setForm({ ...form, customCategory: e.target.value })}
                      placeholder="e.g. Nap Spots, Fonts, Sunsets"
                    />
                  </div>
                )}
                <div className="form-group">
                  <label>Description</label>
                  <input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="What are you rating?"
                  />
                </div>
                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn">Create</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SignInModal
        open={showSignIn}
        onClose={() => setShowSignIn(false)}
        onSuccess={() => router.push("/lists")}
      />
    </div>
  );
}
