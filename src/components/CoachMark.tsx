"use client";

/**
 * First-visit hint: a hand slides left then right over the card, with
 * "Pass" / "Like" stickers. It ignores pointer events (so the user can just
 * start swiping through it) except for the "Got it" button.
 */
export function CoachMark({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="coach" role="note" aria-label="How to swipe">
      <div className="coach-label coach-pass" aria-hidden="true">
        <span className="coach-arrow">←</span> Pass
      </div>
      <div className="coach-label coach-like" aria-hidden="true">
        Like ♥ <span className="coach-arrow">→</span>
      </div>

      <div className="coach-hand" aria-hidden="true">👆</div>

      <p className="sticker coach-text">Swipe left to pass, right to like</p>
      <button type="button" className="btn btn-white btn-small" onClick={onDismiss}>Got it</button>
    </div>
  );
}
