"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchFeed, fetchMatches, postSwipe, resetDemo } from "@/lib/client";
import type { Direction, Match, PublicProfile } from "@/lib/types";
import { SwipeCard, type SwipeCardHandle } from "./SwipeCard";
import { MatchOverlay } from "./MatchOverlay";
import { MatchesList } from "./MatchesList";
import { CoachMark } from "./CoachMark";

const COACH_KEY = "coy.discover.coachSeen";

type View = "swipe" | "matches";

export function Discover() {
  const [queue, setQueue] = useState<PublicProfile[] | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [view, setView] = useState<View>("swipe");
  const [overlay, setOverlay] = useState<Match | null>(null);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCoach, setShowCoach] = useState(false);

  const topCard = useRef<SwipeCardHandle>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const showToast = useCallback((text: string) => {
    window.clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), text });
    toastTimer.current = window.setTimeout(() => setToast(null), 1400);
  }, []);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [feed, m] = await Promise.all([fetchFeed(), fetchMatches()]);
      setQueue(feed);
      setMatches(m);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Something went wrong");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Show the swipe hint once per browser. Storage can throw (private mode), so guard it.
  useEffect(() => {
    try {
      if (!localStorage.getItem(COACH_KEY)) setShowCoach(true);
    } catch {
      setShowCoach(true);
    }
  }, []);

  const dismissCoach = useCallback(() => {
    setShowCoach(false);
    try {
      localStorage.setItem(COACH_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const handleSwiped = useCallback(
    async (profile: PublicProfile, dir: Direction) => {
      dismissCoach();
      // Optimistic: the card is gone from the queue immediately, so it can never be shown twice.
      setQueue((q) => (q ? q.filter((p) => p.id !== profile.id) : q));
      // Same feedback for every like, whether or not it turns into a match; the toast
      // must not hint at the other person's swipe.
      showToast(dir === "like" ? `You liked ${profile.name}` : `Passed on ${profile.name}`);
      try {
        const result = await postSwipe(profile.id, dir);
        if (result.matched && result.match) {
          const match = result.match;
          setMatches((prev) =>
            prev.some((m) => m.profile.id === match.profile.id) ? prev : [match, ...prev],
          );
          setOverlay(match);
        }
      } catch {
        // Save failed: put the card back at the front so nothing is silently lost.
        setQueue((q) => (q ? [profile, ...q] : [profile]));
        showToast("Couldn't save that swipe. Try again.");
      }
    },
    [showToast, dismissCoach],
  );

  // Keyboard support on desktop.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (view !== "swipe" || overlay) return;
      if (e.key === "ArrowRight") topCard.current?.swipe("like");
      if (e.key === "ArrowLeft") topCard.current?.swipe("pass");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, overlay]);

  const visible = queue?.slice(0, 2) ?? [];
  const top = visible[0];

  return (
    <div className="discover">
      <header className="discover-header">
        <h1>discover<span className="dot">.</span></h1>
        <div className="segmented" role="tablist" aria-label="Discover views">
          <button
            role="tab"
            aria-selected={view === "swipe"}
            className={view === "swipe" ? "seg-active" : ""}
            onClick={() => setView("swipe")}
          >
            Swipe
          </button>
          <button
            role="tab"
            aria-selected={view === "matches"}
            className={view === "matches" ? "seg-active" : ""}
            onClick={() => setView("matches")}
          >
            Matches
            {matches.length > 0 && <span className="badge">{matches.length}</span>}
          </button>
        </div>
      </header>

      {view === "swipe" && queue && queue.length > 0 && !loadError && (
        <p className="sticker sticker-anon">🔒 Likes stay secret until it&apos;s mutual</p>
      )}

      {view === "matches" ? (
        <MatchesList matches={matches} onDiscover={() => setView("swipe")} />
      ) : loadError ? (
        <div className="state">
          <div className="state-emoji tone-3" aria-hidden="true">⚠️</div>
          <h2>Couldn&apos;t load profiles</h2>
          <p>{loadError}</p>
          <button className="btn" onClick={() => void load()}>Try again</button>
        </div>
      ) : queue === null ? (
        <div className="state" aria-busy="true">
          <div className="spinner" />
        </div>
      ) : !top ? (
        <EmptyState
          hasMatches={matches.length > 0}
          onMatches={() => setView("matches")}
          onReset={async () => {
            try {
              await resetDemo();
              setQueue(null);
              await load();
            } catch {
              showToast("Reset is unavailable");
            }
          }}
        />
      ) : (
        <>
          <div className="deck">
            {/* Rendered back-to-front; keys keep each card's DOM node (and its transition) stable. */}
            {[...visible].reverse().map((p) => (
              <SwipeCard
                key={p.id}
                profile={p}
                active={p.id === top.id}
                ref={p.id === top.id ? topCard : undefined}
                onSwiped={(dir) => void handleSwiped(p, dir)}
              />
            ))}
            {showCoach && <CoachMark onDismiss={dismissCoach} />}
          </div>

          <div className="actions">
            <button className="round round-pass" aria-label="Pass" onClick={() => topCard.current?.swipe("pass")}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
            <button className="round round-like" aria-label="Like" onClick={() => topCard.current?.swipe("like")}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 21s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.4-7 10-7 10z" />
              </svg>
            </button>
          </div>
          <p className="hint">Drag the card, tap a button, or press ← / →</p>
        </>
      )}

      <div className="toast-region" aria-live="polite">
        {toast && <div key={toast.id} className="toast">{toast.text}</div>}
      </div>

      {overlay && (
        <MatchOverlay
          match={overlay}
          onClose={() => setOverlay(null)}
          onViewMatches={() => {
            setOverlay(null);
            setView("matches");
          }}
        />
      )}
    </div>
  );
}

function EmptyState(props: { hasMatches: boolean; onMatches: () => void; onReset: () => void }) {
  return (
    <div className="state">
      <div className="state-emoji tone-0" aria-hidden="true">🌙</div>
      <h2>That&apos;s everyone for now.</h2>
      <p>No more profiles left. Anyone you liked stays a secret unless they liked you back.</p>
      {props.hasMatches && (
        <button className="btn" onClick={props.onMatches}>See your matches</button>
      )}
      <button className="btn btn-ghost" onClick={props.onReset}>Reset demo data</button>
    </div>
  );
}
