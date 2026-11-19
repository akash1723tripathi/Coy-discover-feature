"use client";

import type { Match } from "@/lib/types";

function ago(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function MatchesList(props: { matches: Match[]; onDiscover: () => void }) {
  if (props.matches.length === 0) {
    return (
      <div className="state">
        <div className="state-emoji tone-2" aria-hidden="true">💌</div>
        <h2>No matches yet.</h2>
        <p>If it&apos;s mutual, they show up here. If not, nobody ever knows.</p>
        <button className="btn" onClick={props.onDiscover}>Start swiping</button>
      </div>
    );
  }
  return (
    <ul className="matches">
      {props.matches.map(({ profile, matchedAt }) => (
        <li key={profile.id} className="match-row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={profile.photo} alt="" className="match-photo" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
          <div className="match-text">
            <strong>{profile.name}, {profile.age}</strong>
            <span>{profile.location}</span>
          </div>
          <time className="match-time" dateTime={new Date(matchedAt).toISOString()}>{ago(matchedAt)}</time>
        </li>
      ))}
    </ul>
  );
}
