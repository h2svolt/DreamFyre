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
  { id: "juwa", name: "Juwa", shortName: "JW", accent: "#b8ff00", image: "/assets/game-logos/juwa.webp", category: "Slots + Fish", description: "An all-in-one lobby for slots, fish games and keno." },
  { id: "juwa-2", name: "Juwa 2.0", shortName: "J2", accent: "#06b6d4", image: "/assets/game-logos/juwa.webp", category: "Next-gen Arcade", description: "The upgraded Juwa experience with a refreshed game library." },
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
  { id: "egame-xgame", name: "Egame / Xgame", shortName: "EX", accent: "#38bdf8", category: "Casino Arcade", description: "A connected casino lobby with arcade, fish-table and slot experiences." },
  { id: "blue-dragon", name: "Blue Dragon", shortName: "BD", accent: "#2563eb", category: "Dragon Casino", description: "A blue-themed casino platform with fast arcade and reel play." },
  { id: "mafia", name: "Mafia", shortName: "MF", accent: "#e11d48", category: "Casino Collection", description: "A bold casino collection designed around quick access and varied play." },
  { id: "moolah", name: "Moolah", shortName: "ML", accent: "#22c55e", category: "Slots + Fish", description: "A colourful sweepstakes-style platform with slots and fish games." },
  { id: "high-stakes", name: "High Stakes", shortName: "HS", accent: "#f97316", category: "Premium Gaming", description: "A premium casino platform for slots, arcade titles and high-energy rounds." },
  { id: "noble", name: "Noble", shortName: "NB", accent: "#facc15", category: "Royal Casino", description: "A royal-styled casino platform with a broad player game directory." },
  { id: "cash-machine", name: "Cash Machine", shortName: "CM", accent: "#d946ef", image: "/assets/game-logos/cash-machine.webp", category: "Casino Slots", description: "A bright casino lobby built around reels, bonuses and fast sessions." },
  { id: "para-casino", name: "Para Casino", shortName: "PC", accent: "#14b8a6", category: "Casino Arcade", description: "A modern casino portal with downloadable player access." },
  { id: "king-of-pop", name: "King of Pop", shortName: "KP", accent: "#a855f7", category: "Slots Collection", description: "A vibrant slot and arcade collection with a music-led visual style." },
  { id: "casino-royale", name: "Casino Royal", shortName: "CR", accent: "#ef4444", category: "Royal Casino", description: "A classic mobile casino lobby with reels and arcade titles." },
  { id: "big-w-play", name: "Big W Play", shortName: "BW", accent: "#06b6d4", category: "Online Casino", description: "An online player portal with casino, arcade and slot access." },
  { id: "vegas-luck", name: "Vegas Luck", shortName: "VL", accent: "#f59e0b", category: "Vegas Casino", description: "A Vegas-inspired player lobby with colourful reels and casino play." },
];

export const GAME_BY_ID = Object.fromEntries(GAME_CATALOG.map((game) => [game.id, game])) as Record<string, GameCatalogItem>;
