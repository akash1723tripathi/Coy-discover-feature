export type Direction = "like" | "pass";

/**
 * The ONLY shape of a profile that ever leaves the server.
 * Note what is deliberately absent: anything about whether this person
 * has liked the current user. That information must never be sent to a
 * client before a mutual match.
 */
export interface PublicProfile {
  id: string;
  name: string;
  age: number;
  photo: string;
  bio: string;
  location: string;
  interests: string[];
}

export interface Match {
  profile: PublicProfile;
  matchedAt: number;
}

export interface SwipeResult {
  matched: boolean;
  match: Match | null;
  /** true when this exact swipe had already been recorded (swipes are final). */
  alreadySwiped: boolean;
}
