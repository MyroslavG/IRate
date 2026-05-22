"use client";

import { useCallback, useEffect } from "react";
import { X } from "lucide-react";
import { useAuth } from "../lib/auth-context";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

interface SignInModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SignInModal({ open, onClose, onSuccess }: SignInModalProps) {
  const { loginWithGoogle } = useAuth();

  const buttonRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node && window.google) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response: { credential: string }) => {
            try {
              await loginWithGoogle(response.credential);
              onClose();
              onSuccess?.();
            } catch (err) {
              console.error("Google login failed:", err);
            }
          },
        });
        window.google.accounts.id.renderButton(node, {
          theme: "filled_black",
          size: "large",
          shape: "pill",
          text: "signin_with",
          width: 280,
        });
      }
    },
    [loginWithGoogle, onClose, onSuccess]
  );

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="signin-modal-overlay" onClick={onClose}>
      <div className="signin-modal" onClick={(e) => e.stopPropagation()}>
        <button className="signin-modal-close" onClick={onClose}>
          <X size={18} />
        </button>
        <h3>Sign in to continue</h3>
        <p>Create lists, rate items, and share with friends.</p>
        <div ref={buttonRef} className="signin-modal-btn" />
      </div>
    </div>
  );
}
