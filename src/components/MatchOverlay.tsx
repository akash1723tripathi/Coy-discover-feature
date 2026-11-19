"use client";

import { useEffect, useRef } from "react";
import type { Match } from "@/lib/types";

export function MatchOverlay(props: { match: Match; onClose: () => void; onViewMatches: () => void }) {
  const { profile } = props.match;
  const closeBtn = useRef<HTMLButtonElement>(null);
  const onClose = useRef(props.onClose);
  onClose.current = props.onClose;

  useEffect(() => {
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="match-title">
      <div className="hearts" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className={`heart-${i % 3}`} style={{ left: `${(i * 37) % 96}%`, animationDelay: `${(i % 6) * 0.2}s` }}>♥</span>
        ))}
      </div>

      <div className="match-card">
        <div className="match-pair">
          <div className="match-avatar match-avatar-you">You</div>
          <span className="match-heart" aria-hidden="true">♥</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="match-avatar match-avatar-them" src={profile.photo} alt={profile.name} onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
        </div>
        <h2 id="match-title" className="match-title">It&apos;s a match!</h2>
        <p className="match-text">You and {profile.name} both liked each other.</p>
        <button ref={closeBtn} className="btn btn-dark" onClick={props.onClose}>Keep swiping</button>
        <button className="btn btn-white" onClick={props.onViewMatches}>View matches</button>
      </div>
    </div>
  );
}
