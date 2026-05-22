"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Share2, ArrowLeft, Copy, User, MessageCircle, Send, Heart, Pencil, Trash2, X } from "lucide-react";
import Link from "next/link";
import ShareModal from "../../../components/ShareModal";
import { api, ListDetail, ListItemOut, CommentOut, LikeSummary } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-context";

const EMOJIS = [
  { key: "heart", icon: <Heart size={14} />, label: "Love" },
];

function renderStars(score: number) {
  const fullStars = Math.floor(score);
  const hasHalf = score % 1 !== 0;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
  return (
    <span className="stars-display">
      {"★".repeat(fullStars)}
      {hasHalf && <span className="half-star">★</span>}
      {"☆".repeat(emptyStars)}
    </span>
  );
}

export default function ListClient() {
  const { owner, id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [listData, setListData] = useState<ListDetail | null>(null);
  const [items, setItems] = useState<ListItemOut[]>([]);
  const [comments, setComments] = useState<CommentOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ListItemOut | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedList, setCopiedList] = useState(false);
  const [form, setForm] = useState({ name: "", score: 0, comment: "" });
  const [hoverScore, setHoverScore] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [replyingToItem, setReplyingToItem] = useState<number | null>(null);
  const [showItemComments, setShowItemComments] = useState<number | null>(null);
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [listLikes, setListLikes] = useState<LikeSummary[]>([]);
  const [itemLikes, setItemLikes] = useState<Record<string, LikeSummary[]>>({});

  const isOwner = user && listData ? user.username === listData.owner.username : false;

  useEffect(() => {
    api.getList(owner as string, id as string)
      .then((data) => {
        setListData(data);
        setItems(data.items.sort((a, b) => {
          if (a.score === 0 && b.score === 0) return 0;
          if (a.score === 0) return 1;
          if (b.score === 0) return -1;
          return b.score - a.score;
        }));
        api.getComments(data.id).then(setComments).catch(() => {});
        api.getListLikes(data.id).then(setListLikes).catch(() => {});
        api.getItemLikes(data.id).then(setItemLikes).catch(() => {});
      })
      .catch(() => setError("List not found"))
      .finally(() => setLoading(false));
  }, [owner, id]);

  if (loading) {
    return <div className="container"><div className="empty-state"><p>Loading...</p></div></div>;
  }

  if (error || !listData) {
    return (
      <div className="container">
        <button className="back-link" onClick={() => router.back()}><ArrowLeft size={14} /> Back</button>
        <div className="empty-state"><p>{error || "List not found"}</p></div>
      </div>
    );
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newItem = await api.addItem(listData.id, {
        name: form.name,
        score: form.score,
        comment: form.comment || undefined,
      });
      const updated = [...items, newItem].sort((a, b) => {
        if (a.score === 0 && b.score === 0) return 0;
        if (a.score === 0) return 1;
        if (b.score === 0) return -1;
        return b.score - a.score;
      });
      setItems(updated);
      setForm({ name: "", score: 0, comment: "" });
      setShowAddModal(false);
    } catch (err) {
      console.error("Failed to add item:", err);
    }
  };

  const handleEdit = (item: ListItemOut) => {
    if (!isOwner) return;
    setEditingItem(item);
    setForm({ name: item.name, score: item.score, comment: item.comment || "" });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      const updated = await api.updateItem(listData.id, editingItem.id, {
        name: form.name,
        score: form.score,
        comment: form.comment || undefined,
      });
      const newItems = items
        .map((item) => item.id === editingItem.id ? updated : item)
        .sort((a, b) => {
          if (a.score === 0 && b.score === 0) return 0;
          if (a.score === 0) return 1;
          if (b.score === 0) return -1;
          return b.score - a.score;
        });
      setItems(newItems);
      setEditingItem(null);
      setForm({ name: "", score: 0, comment: "" });
    } catch (err) {
      console.error("Failed to update item:", err);
    }
  };

  const handleDelete = async (itemId: number) => {
    try {
      await api.deleteItem(listData.id, itemId);
      setItems(items.filter((item) => item.id !== itemId));
      setEditingItem(null);
      setForm({ name: "", score: 0, comment: "" });
    } catch (err) {
      console.error("Failed to delete item:", err);
    }
  };

  const handleCopyList = async () => {
    try {
      await api.copyList(listData.id);
      setCopiedList(true);
      setTimeout(() => setCopiedList(false), 2500);
    } catch (err) {
      console.error("Failed to copy list:", err);
    }
  };

  const handlePostComment = async (e: React.FormEvent, itemId?: number) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;
    try {
      const comment = await api.addComment(listData.id, newComment.trim(), itemId);
      setComments([comment, ...comments]);
      setNewComment("");
      setReplyingToItem(null);
    } catch (err) {
      console.error("Failed to post comment:", err);
    }
  };

  const handleEditComment = async (commentId: number) => {
    if (!editCommentText.trim()) return;
    try {
      const updated = await api.updateComment(commentId, editCommentText.trim());
      setComments(comments.map((c) => c.id === commentId ? updated : c));
      setEditingComment(null);
      setEditCommentText("");
    } catch (err) {
      console.error("Failed to edit comment:", err);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await api.deleteComment(commentId);
      setComments(comments.filter((c) => c.id !== commentId));
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  };

  const handleToggleLike = async (emoji: string, itemId?: number) => {
    if (!user) return;
    try {
      await api.toggleLike({
        list_id: listData.id,
        item_id: itemId,
        emoji,
      });
      if (itemId) {
        const updated = await api.getItemLikes(listData.id);
        setItemLikes(updated);
      } else {
        const updated = await api.getListLikes(listData.id);
        setListLikes(updated);
      }
    } catch (err) {
      console.error("Failed to toggle like:", err);
    }
  };

  const handleStarClick = (n: number, e: React.MouseEvent<HTMLSpanElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isHalf = x < rect.width / 2;
    setForm({ ...form, score: isHalf ? n - 0.5 : n });
  };

  const handleStarHover = (n: number, e: React.MouseEvent<HTMLSpanElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isHalf = x < rect.width / 2;
    setHoverScore(isHalf ? n - 0.5 : n);
  };

  const displayScore = hoverScore || form.score;

  const renderComment = (c: CommentOut) => (
    <motion.div
      key={c.id}
      className="comment"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {editingComment === c.id ? (
        <div className="comment-edit-form">
          <input
            value={editCommentText}
            onChange={(e) => setEditCommentText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleEditComment(c.id); if (e.key === "Escape") setEditingComment(null); }}
            autoFocus
          />
          <button className="comment-send" onClick={() => handleEditComment(c.id)}><Send size={12} /></button>
          <button className="comment-cancel" onClick={() => setEditingComment(null)}><X size={12} /></button>
        </div>
      ) : (
        <>
          <Link href={c.author.username === user?.username ? "/profile" : `/profile/${c.author.username}`} className="comment-author">@{c.author.username}</Link>
          <span className="comment-text">{c.text}</span>
          <span className="comment-time">{new Date(c.created_at).toLocaleDateString()}</span>
          {user && c.author.username === user.username && (
            <span className="comment-actions">
              <button onClick={() => { setEditingComment(c.id); setEditCommentText(c.text); }}><Pencil size={11} /></button>
              <button onClick={() => handleDeleteComment(c.id)}><Trash2 size={11} /></button>
            </span>
          )}
        </>
      )}
    </motion.div>
  );

  const renderLikeButtons = (itemId?: number) => {
    const likes = itemId ? (itemLikes[String(itemId)] || []) : listLikes;
    return (
      <div className="like-buttons">
        {EMOJIS.map(({ key, icon }) => {
          const likeSummary = likes.find((l) => l.emoji === key);
          const count = likeSummary?.count || 0;
          const userLiked = likeSummary?.user_liked || false;
          return (
            <button
              key={key}
              className={`like-btn ${userLiked ? "liked" : ""}`}
              onClick={(e) => { e.stopPropagation(); handleToggleLike(key, itemId); }}
              disabled={!user}
            >
              {icon}
              {count > 0 && <span className="like-count">{count}</span>}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container">
      <div className="list-top-bar">
        <button className="back-link" onClick={() => router.back()}><ArrowLeft size={14} /> Back</button>
        {!isOwner && (
          <Link href={`/profile/${listData.owner.username}`} className="owner-banner clickable">
            <User size={14} />
            <span>@{listData.owner.username}&apos;s list</span>
          </Link>
        )}
      </div>

      <div className="list-header">
        <div className="list-header-top">
          <div>
            <h2>{listData.title}</h2>
            <p className="description">{listData.description}</p>
          </div>
          {renderLikeButtons()}
        </div>
      </div>

      {/* Comments section - visible to all logged in users */}
      {user && (
        <div className="comments-section">
          <h3><MessageCircle size={16} /> Comments <span className="comment-count">{comments.filter((c) => !c.item_id).length}</span></h3>
          {!isOwner && (
            <form className="comment-input" onSubmit={(e) => handlePostComment(e)}>
              <input
                value={replyingToItem === null ? newComment : ""}
                onFocus={() => setReplyingToItem(null)}
                onChange={(e) => { setReplyingToItem(null); setNewComment(e.target.value); }}
                placeholder="Add a comment..."
              />
              <button type="submit" className="comment-send"><Send size={14} /></button>
            </form>
          )}
          <div className="comments-list">
            {comments.filter((c) => !c.item_id).map(renderComment)}
            {comments.filter((c) => !c.item_id).length === 0 && (
              <p className="no-comments">No comments yet.{!isOwner ? " Be the first!" : ""}</p>
            )}
          </div>
        </div>
      )}

      <div className="list-actions">
        {isOwner && (
          <button className="btn" onClick={() => setShowAddModal(true)}>
            <Plus size={14} /> Add Item
          </button>
        )}
        {!isOwner && user && (
          <button className="btn" onClick={handleCopyList}>
            <Copy size={14} /> {copiedList ? "Copied to My Lists!" : "Copy List"}
          </button>
        )}
        <button className="btn-secondary btn-small" onClick={() => setShowShareModal(true)}>
          <Share2 size={13} /> Share
        </button>
      </div>

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        listTitle={listData.title}
        listDescription={listData.description || ""}
        owner={listData.owner.username}
        listId={listData.slug}
        topItems={items.filter((i) => i.score > 0).slice(0, 5).map((i) => ({ name: i.name, score: i.score }))}
      />

      {items.length === 0 ? (
        <div className="empty-state">
          <p>No items yet. {isOwner ? "Add something to rate!" : ""}</p>
        </div>
      ) : (
        <div className="items-list">
          {items.map((item, i) => {
            const itemComments = comments.filter((c) => c.item_id === item.id);
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
              >
                <div
                  className={`item-row ${isOwner ? "" : "readonly"}`}
                  onClick={() => isOwner ? handleEdit(item) : setShowItemComments(showItemComments === item.id ? null : item.id)}
                >
                  <span className="item-rank">{i + 1}</span>
                  <div className="item-info">
                    <h4>{item.name}</h4>
                    {item.comment && <p className="note">{item.comment}</p>}
                  </div>
                  <div className="item-rating">
                    {renderLikeButtons(item.id)}
                    <span className={`score ${item.score === 0 ? "unrated" : ""}`}>{item.score > 0 ? item.score : "—"}</span>
                    {itemComments.length > 0 && (
                      <span
                        className="item-comment-count"
                        onClick={(e) => { e.stopPropagation(); setShowItemComments(showItemComments === item.id ? null : item.id); }}
                      >
                        <MessageCircle size={12} /> {itemComments.length}
                      </span>
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {showItemComments === item.id && user && (
                    <motion.div
                      className="item-comments"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      {itemComments.map(renderComment)}
                      {itemComments.length === 0 && <p className="no-comments">No comments on this item.</p>}
                      {!isOwner && (
                        <form className="comment-input" onSubmit={(e) => handlePostComment(e, item.id)}>
                          <input
                            value={replyingToItem === item.id ? newComment : ""}
                            onFocus={() => setReplyingToItem(item.id)}
                            onChange={(e) => { setReplyingToItem(item.id); setNewComment(e.target.value); }}
                            placeholder={`Comment on "${item.name}"...`}
                          />
                          <button type="submit" className="comment-send"><Send size={14} /></button>
                        </form>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Edit modal - only for owner */}
      <AnimatePresence>
        {editingItem && isOwner && (
          <motion.div
            className="modal-overlay"
            onClick={() => { setEditingItem(null); setForm({ name: "", score: 0, comment: "" }); }}
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
              <h2>Edit Item</h2>
              <form onSubmit={handleEditSubmit}>
                <div className="form-group">
                  <label>Name</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Rating {displayScore > 0 && <span className="score-preview">{displayScore} / 5</span>}</label>
                  <div className="star-input">
                    {[1, 2, 3, 4, 5].map((n) => {
                      const filled = n <= Math.floor(displayScore);
                      const halfFilled = !filled && n - 0.5 === displayScore;
                      return (
                        <span
                          key={n}
                          className={`${filled ? "active" : ""} ${halfFilled ? "half" : ""}`}
                          onMouseMove={(e) => handleStarHover(n, e)}
                          onMouseLeave={() => setHoverScore(0)}
                          onClick={(e) => handleStarClick(n, e)}
                        >
                          ★
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="form-group">
                  <label>Comment</label>
                  <textarea
                    value={form.comment}
                    onChange={(e) => setForm({ ...form, comment: e.target.value })}
                    placeholder="Quick thoughts..."
                  />
                </div>
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => handleDelete(editingItem.id)}
                  >
                    Delete
                  </button>
                  <div style={{ flex: 1 }} />
                  <button type="button" className="btn-secondary" onClick={() => { setEditingItem(null); setForm({ name: "", score: 0, comment: "" }); }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn" disabled={form.score === 0}>
                    Save
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add modal - only for owner */}
      <AnimatePresence>
        {showAddModal && isOwner && (
          <motion.div
            className="modal-overlay"
            onClick={() => setShowAddModal(false)}
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
              <h2>Add Item</h2>
              <form onSubmit={handleAdd}>
                <div className="form-group">
                  <label>Name</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="What are you rating?"
                  />
                </div>
                <div className="form-group">
                  <label>Rating {displayScore > 0 && <span className="score-preview">{displayScore} / 5</span>}</label>
                  <div className="star-input">
                    {[1, 2, 3, 4, 5].map((n) => {
                      const filled = n <= Math.floor(displayScore);
                      const halfFilled = !filled && n - 0.5 === displayScore;
                      return (
                        <span
                          key={n}
                          className={`${filled ? "active" : ""} ${halfFilled ? "half" : ""}`}
                          onMouseMove={(e) => handleStarHover(n, e)}
                          onMouseLeave={() => setHoverScore(0)}
                          onClick={(e) => handleStarClick(n, e)}
                        >
                          ★
                        </span>
                      );
                    })}
                  </div>
                  <span className="form-hint">Optional — click left half for half star, right half for full</span>
                </div>
                <div className="form-group">
                  <label>Comment</label>
                  <textarea
                    value={form.comment}
                    onChange={(e) => setForm({ ...form, comment: e.target.value })}
                    placeholder="Quick thoughts..."
                  />
                </div>
                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn">
                    Add
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
