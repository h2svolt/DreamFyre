# DreamFyre Neon Grid design system

The platform uses the client-selected **Neon Grid** direction: a deep-navy casino interface with ultraviolet atmosphere, dark-green/orange primary actions, tactile controls and real provider artwork. Public pages are deliberately more open; signed-in dashboards become denser only where operational information requires it.

## Visual tokens

- Background: `#030812`
- Panel: `#08101c`
- Hero call-to-action: `#145536` (dark forest green)
- Interface accent: `#b8ff00`
- Ultraviolet accent: `#8b5cf6`
- Text: `#f2f6fb`
- Muted text: `#8290a2`
- Borders: `#1b2a3c`

Panels mix restrained clipped corners with rounded interactive controls. The hero's Explore Casinos action is permanently dark forest green. Lime is reserved for active navigation, operational actions, positive balances, and live status. Purple supports the casino atmosphere without competing with actions.

## Typography and motion

- Display type: **Oxanium Variable** for page titles, balances, game names and action labels.
- Body type: **Manrope Variable** for descriptions, forms and operational detail.
- Anime.js drives view reveals, carousel movement and the active game-mark transition.
- CSS handles the slide geometry, brand-colour lighting, button sheen and responsive states.
- Connected-game cards use Uiverse-inspired layered gradients, animated sheen, press feedback, glowing status indicators and focused modal transitions, adapted to the DreamFyre design system.
- Reduced-motion preferences disable nonessential movement and automatic slide advancement.

## Main dashboard regions

1. Public homepage and game catalogue before authentication.
2. Large authentication panel with email and Google, Apple and Microsoft entry points.
3. Compact signed-in navigation for player functions.
4. Search and account command bar.
5. Casino-only hero built from provider logos, chips and reel artwork; no shooter or esports imagery.
6. Swipeable game library backed by the complete 31-platform directory.
7. Wallet balance and shortcuts to deposit, receive, history and withdraw.
8. Rewards lounge with a redesigned roulette, promotions, referrals and favorites.
9. Connected-game cards for credentials, reset requests, credit actions and provider launching.
10. Signed-in Home lists only added or pending player games; the complete directory remains inside Games.

## Responsive behavior

The public, authentication, player and staff layouts all include dedicated phone breakpoints. Multi-column dashboards collapse into a single readable column. The game carousel becomes a single-card mobile slide with partial neighbouring previews, swipe navigation, arrow controls and progress dots. Forms/actions stack, tables become card-like rows, and navigation becomes an off-canvas or compact mobile menu.

## Game branding policy

Provider marks are stored as local production assets. Client-supplied artwork is used for Milky Way, Fire Kirin, Game Vault 999, Mr All In One, YOLO 777, Panda Master, Ultra Panda, Game Room, V Blink, River Sweep, Vegas Sweep, Cash Frenzy, Billion Balls, Hi-Rollin and Las Vegas. Juwa 2.0 shares the established Juwa mark with a visible `2.0` badge.

The active game card exposes real routes for deposits, credit withdrawal, password reset and Play. The Play action resolves the centrally configured URL for that provider. It is visibly disabled when the super admin has not yet supplied the authorized URL.

## Functional styling coverage

The same tokens and component treatment apply to games, deposits, wallet history, withdrawals, player transfers, referrals, support chat, and administration. Deposit actions use green, Play actions use red, and operational copy has an 11px minimum target rather than the earlier micro-text treatment. Styling changes do not replace the server-side Turso ledger, private payment-proof storage, provider-validation safeguards, or transactional API behavior documented in `ARCHITECTURE.md` and `INTEGRATIONS.md`.
