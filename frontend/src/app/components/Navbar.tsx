"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "../lib/auth-context";

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

  const googleButtonRef = useCallback((node: HTMLDivElement | null) => {
    if (node && window.google && !user && !loading) {
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
      window.google.accounts.id.renderButton(node, {
        theme: "filled_black",
        size: "medium",
        shape: "pill",
        text: "signin_with",
      });
    }
  }, [user, loading, loginWithGoogle]);

  return (
    <nav className="navbar">
      <Link href="/" className="navbar-brand">
        I<span>Rate</span>
      </Link>
      <button
        className="navbar-toggle"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
      >
        <span className={`hamburger ${menuOpen ? "open" : ""}`} />
      </button>
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
        {!loading && !user && (
          <div ref={googleButtonRef} className="google-btn-wrapper" />
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
