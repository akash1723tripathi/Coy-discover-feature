"use client";

import { useState } from "react";
import { Discover } from "./Discover";

type Tab = "home" | "discover";

/** Bottom tab bar: a deliberately blank Home tab plus the Discover tab. */
export function AppShell() {
  const [tab, setTab] = useState<Tab>("discover");

  return (
    <div className="shell">
      <main className="shell-main">
        {/* Home is intentionally blank, per the assignment. */}
        <section hidden={tab !== "home"} aria-label="Home" />
        {/* Kept mounted so switching tabs doesn't refetch or lose state. */}
        <section hidden={tab !== "discover"} aria-label="Discover" className="discover-section">
          <Discover />
        </section>
      </main>

      <nav className="tabbar" aria-label="Main">
        <TabButton label="Home" active={tab === "home"} onClick={() => setTab("home")} icon="home" />
        <TabButton
          label="Discover"
          active={tab === "discover"}
          onClick={() => setTab("discover")}
          icon="discover"
        />
      </nav>
    </div>
  );
}

function TabButton(props: { label: string; active: boolean; onClick: () => void; icon: "home" | "discover" }) {
  return (
    <button
      type="button"
      className={`tab ${props.active ? "tab-active" : ""}`}
      aria-current={props.active ? "page" : undefined}
      onClick={props.onClick}
    >
      <span className="tab-icon">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {props.icon === "home" ? (
          <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
        ) : (
          <path d="M12 21s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.4-7 10-7 10z" />
        )}
      </svg>
      </span>
      <span>{props.label}</span>
    </button>
  );
}
