"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Bell } from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { api } from "../lib/api";
import NotificationsDropdown from "./NotificationsDropdown";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: object) => void;
          renderButton: (element: HTMLElement, config: object) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, loading, loginWithGoogle, logout } = useAuth();
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.getUnreadCount().then((d) => setUnreadCount(d.count)).catch(() => {});
    const interval = setInterval(() => {
      api.getUnreadCount().then((d) => setUnreadCount(d.count)).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (user || loading || renderedRef.current) return;

    const renderButton = () => {
      if (!googleBtnRef.current || !window.google || renderedRef.current) return;
      renderedRef.current = true;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: { credential: string }) => {
          try {
            await loginWithGoogle(response.credential);
          } catch (err) {
            console.error("Google login failed:", err);
          }
        },
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "filled_black",
        size: "medium",
        shape: "pill",
        text: "signin_with",
      });
    };

    if (window.google) {
      renderButton();
    } else {
      const script = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      if (script) {
        script.addEventListener("load", renderButton);
        return () => script.removeEventListener("load", renderButton);
      }
    }
  }, [user, loading, loginWithGoogle]);

  return (
    <nav className="navbar">
      <Link href="/explore" className="navbar-brand">
        I<span>Rate</span>
      </Link>
      <div className="navbar-right-mobile">
        {user && (
          <div className="notif-wrapper">
            <button
              className={`notif-bell ${unreadCount > 0 ? "has-unread" : ""}`}
              onClick={() => setShowNotifs(!showNotifs)}
            >
              <Bell size={16} />
              {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
            </button>
            {showNotifs && (
              <NotificationsDropdown
                onClose={() => setShowNotifs(false)}
                onRead={() => setUnreadCount(0)}
              />
            )}
          </div>
        )}
        <button
          className="navbar-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span className={`hamburger ${menuOpen ? "open" : ""}`} />
        </button>
      </div>
      {menuOpen && <div className="navbar-overlay" onClick={() => setMenuOpen(false)} />}
      <div className={`navbar-links ${menuOpen ? "show" : ""}`}>
        {user && (
          <Link href="/explore" className={`navbar-link ${pathname === "/explore" ? "active" : ""}`} onClick={() => setMenuOpen(false)}>
            Explore
          </Link>
        )}
        {user && (
          <Link href="/lists" className={`navbar-link ${pathname === "/lists" ? "active" : ""}`} onClick={() => setMenuOpen(false)}>
            My Lists
          </Link>
        )}
        {user && (
          <Link href="/profile" className={`navbar-link ${pathname === "/profile" ? "active" : ""}`} onClick={() => setMenuOpen(false)}>
            Profile
          </Link>
        )}
        {user && (
          <div className="notif-wrapper notif-desktop">
            <button
              className={`notif-bell ${unreadCount > 0 ? "has-unread" : ""}`}
              onClick={() => setShowNotifs(!showNotifs)}
            >
              <Bell size={16} />
              {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
            </button>
            {showNotifs && (
              <NotificationsDropdown
                onClose={() => setShowNotifs(false)}
                onRead={() => setUnreadCount(0)}
              />
            )}
          </div>
        )}
        {!loading && !user && (
          <div ref={googleBtnRef} className="google-btn-wrapper" />
        )}
        {user && (
          <button className="navbar-link navbar-logout" onClick={() => { logout(); setMenuOpen(false); }}>
            <LogOut size={14} /> Sign out
          </button>
        )}
      </div>
    </nav>
  );
}
