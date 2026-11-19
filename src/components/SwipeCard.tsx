"use client";

import { useImperativeHandle, useRef, useState, type PointerEvent, type Ref } from "react";
import type { Direction, PublicProfile } from "@/lib/types";

export interface SwipeCardHandle {
  swipe: (dir: Direction) => void;
}

interface Props {
  profile: PublicProfile;
  /** Only the top card is draggable; the one behind it just waits, slightly smaller. */
  active: boolean;
  onSwiped: (dir: Direction) => void;
  ref?: Ref<SwipeCardHandle>;
}

const THRESHOLD = 110; // px dragged before a release counts as a swipe
const FLICK_SPEED = 0.5; // px/ms
const EXIT_MS = 260;

/** Stable pastel per profile (used for the photo fallback). */
const tone = (id: string) => [...id].reduce((a, c) => a + c.charCodeAt(0), 0) % 5;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function SwipeCard({ profile, active, onSwiped, ref }: Props) {
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [exit, setExit] = useState<Direction | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  const finished = useRef(false);
  const onSwipedRef = useRef(onSwiped);
  onSwipedRef.current = onSwiped;

  const fling = (dir: Direction) => {
    if (finished.current) return; // a card can only be swiped once
    finished.current = true;
    start.current = null;
    setDragging(false);
    setExit(dir);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => onSwipedRef.current(dir), reduce ? 0 : EXIT_MS);
  };

  useImperativeHandle(ref, () => ({ swipe: fling }));

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (!active || exit) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    setDragging(true);
  };

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (!start.current) return;
    setDrag({ x: e.clientX - start.current.x, y: (e.clientY - start.current.y) * 0.35 });
  };

  const onPointerUp = (e: PointerEvent<HTMLElement>) => {
    const s = start.current;
    if (!s) return;
    start.current = null;
    setDragging(false);
    const dx = e.clientX - s.x;
    const speed = dx / Math.max(1, performance.now() - s.t);
    if (Math.abs(dx) > THRESHOLD || (Math.abs(speed) > FLICK_SPEED && Math.abs(dx) > 40)) {
      fling(dx > 0 ? "like" : "pass");
    } else {
      setDrag({ x: 0, y: 0 }); // spring back
    }
  };

  const sign = exit === "like" ? 1 : -1;
  const transform = !active
    ? "translateY(14px) scale(0.94)"
    : exit
      ? `translate3d(${sign * 125}vw, ${drag.y}px, 0) rotate(${sign * 24}deg)`
      : `translate3d(${drag.x}px, ${drag.y}px, 0) rotate(${drag.x / 18}deg)`;

  const likeOpacity = exit ? (exit === "like" ? 1 : 0) : clamp(drag.x / 90, 0, 1);
  const passOpacity = exit ? (exit === "pass" ? 1 : 0) : clamp(-drag.x / 90, 0, 1);

  return (
    <article
      className={`card ${active ? "card-active" : ""}`}
      style={{
        transform,
        transition: dragging ? "none" : `transform ${EXIT_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1)`,
        zIndex: active ? 2 : 1,
        pointerEvents: active ? "auto" : "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      aria-label={`${profile.name}, ${profile.age}`}
    >
      <div className={`card-photo-wrap tone-${tone(profile.id)}`}>
        {imgFailed ? (
          <div className="card-photo-fallback" aria-hidden="true">
            {profile.name.charAt(0)}
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="card-photo"
            src={profile.photo}
            alt={`Photo of ${profile.name}`}
            draggable={false}
            onError={() => setImgFailed(true)}
          />
        )}
        <span className="stamp stamp-like" style={{ opacity: likeOpacity }}>LIKE ♥</span>
        <span className="stamp stamp-pass" style={{ opacity: passOpacity }}>NOPE ✕</span>
      </div>

      <div className="card-info">
        <h2>
          {profile.name} <span className="card-age">{profile.age}</span>
        </h2>
        <p className="card-where">{profile.location}</p>
        <p className="card-bio">{profile.bio}</p>
        <ul className="chips" aria-label="Interests">
          {profile.interests.map((i, n) => (
            <li key={i} className={`chip chip-${n % 5}`}>{i}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}
