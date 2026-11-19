export const CURRENT_USER_ID = "me";

export interface SeedProfile {
  id: string;
  name: string;
  age: number;
  bio: string;
  location: string;
  interests: string[];
  /** Seeded profile has ALREADY liked the logged-in user (demo only, never exposed). */
  likesMe: boolean;
}

export const ME = {
  id: CURRENT_USER_ID,
  name: "You",
  age: 22,
  bio: "The logged-in demo user.",
  location: "Noida",
  interests: ["coding", "chai"],
};

const raw: Omit<SeedProfile, "id" | "likesMe">[] = [
  // p01-p18: men (public/photos/p01.jpg ... p18.jpg)
  { name: "Kabir", age: 23, location: "IIT Delhi", bio: "Builds robots by day, loses at chess to his grandmother by night.", interests: ["robotics", "chess", "cycling"] },
  { name: "Rohan", age: 24, location: "Bengaluru", bio: "Product designer. Will rate your Spotify playlist honestly.", interests: ["design", "indie music", "coffee", "football"] },
  { name: "Vihaan", age: 25, location: "Mumbai", bio: "Weekend trekker, weekday spreadsheet wrangler.", interests: ["trekking", "finance", "photography"] },
  { name: "Arjun", age: 22, location: "NIT Trichy", bio: "Competitive coder who mostly competes with his own bugs.", interests: ["competitive programming", "badminton", "anime"] },
  { name: "Reyansh", age: 24, location: "Chandigarh", bio: "Stand-up open-mic regular. My mom is my toughest crowd.", interests: ["comedy", "writing", "football"] },
  { name: "Advait", age: 26, location: "Gurugram", bio: "Startup ops. Will absolutely reorganise your calendar.", interests: ["startups", "running", "board games"] },
  { name: "Ayaan", age: 21, location: "BITS Pilani", bio: "Guitar in one hand, lab report in the other.", interests: ["guitar", "physics", "gaming"] },
  { name: "Shaurya", age: 25, location: "Lucknow", bio: "Kebab connoisseur and amateur historian.", interests: ["history", "food walks", "cricket"] },
  { name: "Dev", age: 24, location: "Ahmedabad", bio: "Brand strategist who sketches logos on napkins.", interests: ["branding", "sketching", "garba"] },
  { name: "Krish", age: 23, location: "Kanpur", bio: "Mechanical engineer, part-time bike mechanic.", interests: ["motorcycles", "cars", "road trips"] },
  { name: "Samar", age: 26, location: "Bhopal", bio: "Data analyst. I make charts for fun and feelings for free.", interests: ["data viz", "chess", "poetry"] },
  { name: "Vivaan", age: 21, location: "VIT Vellore", bio: "Esports captain. Touch grass is on my roadmap.", interests: ["esports", "streaming", "gym"] },
  { name: "Aditya", age: 23, location: "IIM Indore", bio: "MBA kid, closet poet. Both are going great.", interests: ["strategy", "poetry", "tennis"] },
  { name: "Ishaan", age: 25, location: "Delhi", bio: "Sound engineer. I hear when your playlist is off-beat.", interests: ["music production", "jazz", "cycling"] },
  { name: "Yash", age: 24, location: "Indore", bio: "Poha evangelist and weekend badminton champion.", interests: ["badminton", "food", "podcasts"] },
  { name: "Rudra", age: 21, location: "Dehradun", bio: "Mountain kid. Weekends belong to the Himalayas.", interests: ["trekking", "camping", "photography"] },
  { name: "Neil", age: 26, location: "Kochi", bio: "Chef in training. Will cook for compliments.", interests: ["cooking", "kayaking", "film"] },
  { name: "Om", age: 25, location: "Varanasi", bio: "Sitar student and sunrise-on-the-ghats devotee.", interests: ["sitar", "philosophy", "chai"] },
  // p19-p30: women (public/photos/p19.jpg ... p30.jpg)
  { name: "Aarohi", age: 21, location: "Delhi University", bio: "Lit major who collects secondhand books and strong opinions about chai.", interests: ["books", "chai", "poetry", "thrifting"] },
  { name: "Meera", age: 22, location: "Pune", bio: "Classical dancer, amateur baker, professional overthinker.", interests: ["bharatanatyam", "baking", "journaling"] },
  { name: "Ishita", age: 20, location: "Christ University", bio: "Psychology student. Yes, I can tell you're nervous.", interests: ["psychology", "podcasts", "sketching"] },
  { name: "Anaya", age: 21, location: "Jaipur", bio: "Block-print enthusiast. Ask me about my fabric stash.", interests: ["textiles", "travel", "street food"] },
  { name: "Diya", age: 23, location: "Hyderabad", bio: "Doctor-in-training. Fluent in sarcasm and caffeine.", interests: ["medicine", "k-dramas", "coffee"] },
  { name: "Saanvi", age: 20, location: "Lady Shri Ram College", bio: "Debater, dreamer, dessert-first person.", interests: ["debate", "baking", "theatre"] },
  { name: "Kiara", age: 22, location: "Kolkata", bio: "Photographer chasing golden hour across the city.", interests: ["photography", "film", "rabindra sangeet"] },
  { name: "Navya", age: 23, location: "Chennai", bio: "Marine biology nerd. I will befriend your dog.", interests: ["marine life", "dogs", "swimming"] },
  { name: "Tara", age: 21, location: "Symbiosis Pune", bio: "Film student. My watchlist is longer than my to-do list.", interests: ["cinema", "screenwriting", "vinyl"] },
  { name: "Zoya", age: 22, location: "Jamia Millia Islamia", bio: "Journalism student with a soft spot for long-form.", interests: ["journalism", "biryani", "qawwali"] },
  { name: "Riya", age: 24, location: "Goa", bio: "Yoga teacher by the sea. Ask me about sunrise swims.", interests: ["yoga", "surfing", "vegan cooking"] },
  { name: "Nisha", age: 23, location: "Bengaluru", bio: "ML engineer who talks to plants more than people.", interests: ["machine learning", "gardening", "reading"] },
];

/** Every 4th profile (offset 1) already likes the logged-in user -> 8 demo matches. */
export const SEED_PROFILES: SeedProfile[] = raw.map((p, i) => ({
  ...p,
  id: `p${String(i + 1).padStart(2, "0")}`,
  likesMe: i % 4 === 1,
}));

/**
 * Profile photos live in public/photos/<profileId>.jpg:
 * p01-p18 are the men, p19-p30 are the women. See resolvePhoto() in db.ts.
 */
export const PHOTO_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
