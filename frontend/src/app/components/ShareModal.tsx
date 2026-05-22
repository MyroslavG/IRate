"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Link2, Check } from "lucide-react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  listTitle: string;
  listDescription: string;
  owner: string;
  listId: string;
  topItems?: { name: string; score: number }[];
}

function generateShareText(title: string, topItems?: { name: string; score: number }[]) {
  let text = `Check out "${title}" on iRate\n\n`;
  if (topItems && topItems.length > 0) {
    const preview = topItems.slice(0, 3);
    preview.forEach((item, i) => {
      const stars = "★".repeat(Math.floor(item.score)) + (item.score % 1 !== 0 ? "½" : "");
      text += `${i + 1}. ${item.name} ${stars}\n`;
    });
    if (topItems.length > 3) {
      text += `   ...and ${topItems.length - 3} more\n`;
    }
    text += "\n";
  }
  return text;
}

function TwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function RedditIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 0-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function SMSIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12zM7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function ThreadsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.287 3.263-.809.993-1.958 1.573-3.418 1.725-1.124.117-2.187-.058-3.076-.507-1.022-.516-1.733-1.357-2-2.369-.39-1.473.077-2.899 1.283-3.91.935-.784 2.195-1.237 3.612-1.313.999-.054 1.927.032 2.775.233-.143-.762-.44-1.336-.9-1.73-.588-.505-1.466-.76-2.607-.76h-.045c-.884.008-1.61.208-2.159.596l-1.1-1.69c.868-.613 1.944-.934 3.225-.952h.063c1.614 0 2.88.46 3.763 1.368.768.79 1.245 1.86 1.42 3.166.636.194 1.21.446 1.724.764 1.138.704 1.991 1.68 2.465 2.82.737 1.77.782 4.463-1.305 6.506-1.803 1.768-4.003 2.553-7.126 2.575zm-1.006-7.565c-.235 0-.474.014-.716.043-.937.097-1.655.393-2.134.88-.478.485-.6 1.058-.46 1.588.16.601.577 1.032 1.206 1.349.588.297 1.3.419 2.06.341 1.075-.112 1.852-.502 2.37-1.138.478-.588.78-1.413.893-2.452-.69-.237-1.459-.38-2.292-.42-.312-.017-.62-.026-.922-.026l-.005-.165z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export default function ShareModal({
  isOpen,
  onClose,
  listTitle,
  listDescription,
  owner,
  listId,
  topItems,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `https://i-rate-pearl.vercel.app/list/${owner}/${listId}`;
  const shareText = generateShareText(listTitle, topItems);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const platforms = [
    {
      name: "X",
      icon: <TwitterIcon />,
      color: "#000000",
      onClick: () => {
        const text = encodeURIComponent(`${shareText}${shareUrl}`);
        window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
      },
    },
    {
      name: "Reddit",
      icon: <RedditIcon />,
      color: "#FF4500",
      onClick: () => {
        const title = encodeURIComponent(`${listTitle} - Rated on iRate`);
        window.open(
          `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${title}`,
          "_blank"
        );
      },
    },
    {
      name: "Facebook",
      icon: <FacebookIcon />,
      color: "#1877F2",
      onClick: () => {
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
          "_blank"
        );
      },
    },
    {
      name: "WhatsApp",
      icon: <WhatsAppIcon />,
      color: "#25D366",
      onClick: () => {
        const text = encodeURIComponent(`${shareText}${shareUrl}`);
        window.open(`https://wa.me/?text=${text}`, "_blank");
      },
    },
    {
      name: "Telegram",
      icon: <TelegramIcon />,
      color: "#26A5E4",
      onClick: () => {
        const text = encodeURIComponent(shareText);
        window.open(
          `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${text}`,
          "_blank"
        );
      },
    },
    {
      name: "iMessage",
      icon: <SMSIcon />,
      color: "#34D399",
      onClick: () => {
        const body = encodeURIComponent(`${shareText}${shareUrl}`);
        window.open(`sms:?&body=${body}`, "_self");
      },
    },
    {
      name: "Instagram",
      icon: <InstagramIcon />,
      color: "#E4405F",
      onClick: () => {
        // Instagram doesn't have a direct share URL - copy text for stories/DMs
        navigator.clipboard.writeText(`${shareText}${shareUrl}`);
        window.open("https://instagram.com", "_blank");
      },
    },
    {
      name: "Threads",
      icon: <ThreadsIcon />,
      color: "#000000",
      onClick: () => {
        const text = encodeURIComponent(`${shareText}${shareUrl}`);
        window.open(`https://www.threads.net/intent/post?text=${text}`, "_blank");
      },
    },
    {
      name: "TikTok",
      icon: <TikTokIcon />,
      color: "#000000",
      onClick: () => {
        // TikTok doesn't have a direct share URL - copy text for bio/comments
        navigator.clipboard.writeText(`${shareText}${shareUrl}`);
        window.open("https://tiktok.com", "_blank");
      },
    },
    {
      name: "LinkedIn",
      icon: <LinkedInIcon />,
      color: "#0A66C2",
      onClick: () => {
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
          "_blank"
        );
      },
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="share-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="share-modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="share-modal-header">
              <h3>Share this list</h3>
              <button className="share-modal-close" onClick={onClose}>
                <X size={18} />
              </button>
            </div>

            <div className="share-modal-preview">
              <span className="share-modal-preview-title">{listTitle}</span>
              <span className="share-modal-preview-desc">{listDescription}</span>
              {topItems && topItems.length > 0 && (
                <div className="share-modal-preview-items">
                  {topItems.slice(0, 3).map((item, i) => (
                    <span key={i} className="share-modal-preview-item">
                      {i + 1}. {item.name}{" "}
                      <span className="share-modal-preview-score">
                        {"★".repeat(Math.floor(item.score))}
                        {item.score % 1 !== 0 && "½"}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="share-modal-platforms">
              {platforms.map((platform) => (
                <button
                  key={platform.name}
                  className="share-platform-btn"
                  onClick={platform.onClick}
                  style={{ "--platform-color": platform.color } as React.CSSProperties}
                >
                  <span className="share-platform-icon">{platform.icon}</span>
                  <span className="share-platform-name">{platform.name}</span>
                </button>
              ))}
            </div>

            <div className="share-modal-link">
              <input readOnly value={shareUrl} />
              <button
                className={`share-copy-btn ${copied ? "copied" : ""}`}
                onClick={handleCopyLink}
              >
                {copied ? <Check size={14} /> : <Link2 size={14} />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
