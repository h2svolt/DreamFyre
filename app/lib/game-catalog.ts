export type GameCatalogItem = {
  id: string;
  name: string;
  shortName: string;
  accent: string;
  image?: string;
  category: string;
  description: string;
};

export const GAME_CATALOG: GameCatalogItem[] = [
  { id: "milky-way", name: "Milky Way", shortName: "MW", accent: "#8b5cf6", image: "/assets/game-logos/milky-way-card.webp", category: "Fish + Slots", description: "A cosmic casino lobby with fish tables, reels and bonus rounds." },
  { id: "fire-kirin", name: "Fire Kirin", shortName: "FK", accent: "#f97316", image: "/assets/game-logos/fire-kirin-card.webp", category: "Casino Arcade", description: "Fast fish-table casino play with vivid worlds and competitive rounds." },
  { id: "juwa", name: "Juwa", shortName: "JW", accent: "#b8ff00", image: "/assets/game-logos/juwa.png", category: "Slots + Fish", description: "An all-in-one lobby for slots, fish games and keno." },
  { id: "juwa-2", name: "Juwa 2.0", shortName: "J2", accent: "#06b6d4", image: "/assets/game-logos/juwa-2.jpeg", category: "Next-gen Arcade", description: "The upgraded Juwa experience with a refreshed game library." },
  { id: "game-vault-999", name: "Game Vault 999", shortName: "GV", accent: "#eab308", image: "/assets/game-logos/game-vault-999-card.webp", category: "Vault Collection", description: "A broad game vault with slots, casino tables and bonus play." },
  { id: "mr-all-in-one", name: "Mr All In One", shortName: "MA", accent: "#f43f5e", image: "/assets/game-logos/mr-all-in-one-card.webp", category: "All-in-one", description: "One account for a wide collection of casino and slot experiences." },
  { id: "yolo-777", name: "YOLO 777", shortName: "YO", accent: "#a855f7", image: "/assets/game-logos/yolo-777-card.webp", category: "777 Slots", description: "High-energy reel play with bright 777 styling and quick rounds." },
  { id: "orion-stars", name: "Orion Stars", shortName: "OS", accent: "#22d3ee", image: "/assets/game-logos/orion-stars.webp", category: "Star Arcade", description: "A polished arcade universe with slots, fish tables and rewards." },
  { id: "panda-master", name: "Panda Master", shortName: "PM", accent: "#84cc16", image: "/assets/game-logos/panda-master-card.webp", category: "Casino Collection", description: "Colourful fish games and slot titles in one playful lobby." },
  { id: "ultra-panda", name: "Ultra Panda", shortName: "UP", accent: "#14b8a6", image: "/assets/game-logos/ultra-panda-card.webp", category: "Premium Casino", description: "A premium panda-themed lobby with reels, fish games and bonuses." },
  { id: "game-room", name: "Game Room", shortName: "GR", accent: "#6366f1", image: "/assets/game-logos/game-room-card.webp", category: "Online Game Room", description: "A classic online casino-room experience built for easy access." },
  { id: "v-blink", name: "V Blink", shortName: "VB", accent: "#ec4899", image: "/assets/game-logos/v-blink-card.webp", category: "Instant Casino", description: "A lively sweepstakes-style casino with fast sessions and variety." },
  { id: "river-sweep", name: "River Sweep", shortName: "RS", accent: "#0ea5e9", image: "/assets/game-logos/river-sweep-card.webp", category: "River Casino", description: "Fish tables, reels and tournaments flowing through one account." },
  { id: "vegas-sweep", name: "Vegas Sweep", shortName: "VS", accent: "#f59e0b", image: "/assets/game-logos/vegas-sweep-card.webp", category: "Vegas Casino", description: "Vegas-inspired sweepstakes play with colourful casino energy." },
  { id: "cash-frenzy", name: "Cash Frenzy", shortName: "CF", accent: "#22c55e", image: "/assets/game-logos/cash-frenzy-card.webp", category: "Casino Slots", description: "A bright slot collection built around jackpots and bonus rounds." },
  { id: "billion-balls", name: "Billion Balls", shortName: "BB", accent: "#e879f9", image: "/assets/game-logos/billion-balls-card.webp", category: "Ball-drop Casino", description: "A bold purple casino experience with fast, reward-led play." },
  { id: "hi-rollin", name: "Hi-Rollin", shortName: "HR", accent: "#fb7185", image: "/assets/game-logos/hi-rollin-card.webp", category: "Premium Gaming", description: "A premium agent-powered platform with slots and casino titles." },
  { id: "las-vegas", name: "Las Vegas", shortName: "LV", accent: "#facc15", image: "/assets/game-logos/las-vegas-card.webp", category: "Vegas Collection", description: "A classic Las Vegas-inspired collection of reels and tables." },
  { id: "mega-spin", name: "Mega Spin", shortName: "MS", accent: "#2dd4bf", image: "/assets/game-logos/mega-spin.webp", category: "Spin + Fish", description: "A high-colour platform spanning giant fish games and slot rounds." },
];

export const GAME_BY_ID = Object.fromEntries(GAME_CATALOG.map((game) => [game.id, game])) as Record<string, GameCatalogItem>;
