"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Compass } from "lucide-react";
import { useAuth } from "./lib/auth-context";
import SignInModal from "./components/SignInModal";

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [showSignIn, setShowSignIn] = useState(false);

  // Redirect logged-in users to their lists
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/lists");
    }
  }, [authLoading, user, router]);

  const handleCtaClick = () => {
    if (user) {
      router.push("/lists");
    } else {
      setShowSignIn(true);
    }
  };

  if (authLoading || user) {
    return null;
  }

  return (
    <div className="container">
      <div className="landing-hero landing-hero-full">
        <motion.h1
          className="landing-title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          Rate literally anything.
        </motion.h1>
        <motion.p
          className="landing-subtitle"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          Movies, tacos, nap spots, fonts — create lists, rank them, share with friends.
        </motion.p>
        <motion.div
          className="landing-cta"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <button className="btn btn-large" onClick={handleCtaClick}>
            <Plus size={16} /> Create a List
          </button>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          <Link href="/explore" className="landing-explore-link">
            <Compass size={15} /> Explore what others are rating
          </Link>
        </motion.div>
      </div>

      <SignInModal
        open={showSignIn}
        onClose={() => setShowSignIn(false)}
        onSuccess={() => router.push("/lists")}
      />
    </div>
  );
}
