"use client";

import { useState, useEffect, useRef } from "react";
import { api, NotificationOut } from "../lib/api";
import { Heart, MessageCircle, UserPlus, Copy } from "lucide-react";

const ICONS: Record<string, React.ReactNode> = {
  like: <Heart size={14} />,
  comment: <MessageCircle size={14} />,
  follow: <UserPlus size={14} />,
  copy: <Copy size={14} />,
};

const MESSAGES: Record<string, (n: NotificationOut) => string> = {
  like: (n) => `liked your list${n.list_title ? ` "${n.list_title}"` : ""}`,
  comment: (n) => `commented on${n.list_title ? ` "${n.list_title}"` : " your list"}`,
  follow: () => `started following you`,
  copy: (n) => `copied your list${n.list_title ? ` "${n.list_title}"` : ""}`,
};

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationsDropdown({
  onClose,
  onRead,
}: {
  onClose: () => void;
  onRead: () => void;
}) {
  const [notifications, setNotifications] = useState<NotificationOut[]>([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getNotifications().then((data) => {
      setNotifications(data);
      setLoading(false);
      if (data.some((n) => !n.read)) {
        api.markNotificationsRead().then(onRead).catch(() => {});
      }
    }).catch(() => setLoading(false));
  }, [onRead]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div className="notif-dropdown" ref={ref}>
      <div className="notif-header">Notifications</div>
      {loading ? (
        <div className="notif-empty">Loading...</div>
      ) : notifications.length === 0 ? (
        <div className="notif-empty">No notifications yet</div>
      ) : (
        <div className="notif-list">
          {notifications.map((n) => (
            <div key={n.id} className={`notif-item ${!n.read ? "unread" : ""}`}>
              <span className="notif-icon">{ICONS[n.type]}</span>
              <div className="notif-content">
                <span className="notif-actor">@{n.actor.username}</span>{" "}
                {MESSAGES[n.type]?.(n) || n.type}
                <div className="notif-time">{timeAgo(n.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
