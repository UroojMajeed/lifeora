# Lifeora — Buy back your time

A mobile app built on the ideas in *Buy Back Your Time* by Dan Martell. It helps founders find the work that drains them, hand it off, and spend their hours where they matter most.

```
reclaim/
├── backend/    Node.js + Express + MongoDB (Mongoose) REST API
└── frontend/   React Native (Expo) app
```

## Phase 1: onboarding

No sign-up wall and almost no typing. "Get started" creates a guest account in the background, and the phone keeps its token (valid for a year).

| # | Screen | How it works | Book concept | Saved to MongoDB |
|---|--------|--------------|--------------|------------------|
| – | Landing | Theme-aware gradient, logo | – | guest `users` document |
| 1 | What best describes you? | One tap: agency, coach, e-commerce, SaaS, freelancer, other | – | `role` |
| 2 | Buyback Rate | Currency dropdown inside the yearly-pay field | Pay ÷ 2,000 hrs ÷ 4 | `currency`, `annualIncome`, `effectiveHourlyRate`, `buybackRate` |
| 3 | Your day | A sheet pops up: tap a suggested activity (or type one) → pick how long it takes → back to pick the next. Tap an activity's hours later to change them | Time & Energy Audit | `schedule[]` |
| 4 | Swipe your day | One card per activity: right = energizes, left = drains. Each card asks "Could someone else do this for your Buyback Rate or less?" | Green/red energy, $ value | `schedule[].energy`, `schedule[].value` |
| 5 | Your DRIP Matrix | Animated reveal, daily buyback cost, first handoff | Delegation, Replacement, Investment, Production | `completed`, `completedAt` |
| – | Home | **Your why** photo, also softly blurred behind the top of Home (stored only on the phone), Buyback Rate, this week's move, DRIP Matrix, theme setting | Vision: what you buy back time for | – (on-device) |

Each activity's DRIP quadrant is computed by the server. Progress is saved after every step, so a user who closes the app resumes where they left off.

Every screen has a ☀️/🌙 button to switch light and dark mode; Home also offers "Auto" to follow the phone.

## Phase 2: buy back your time (Transfer)

After onboarding, Home shows **Hours bought back**: a progress ring of how many draining hours a day have been handed off. "Your handoffs" lists every draining task (Delegation first). Each task has a status (Still mine → Handing off → Handed off), **ideas to buy it back** written for that activity (hire, automate, give to team, or drop it; tap one to make it the plan), who's taking it, and notes. Marking a task handed off adds its hours to the total. Stored per account in `users.handoffs`; totals are computed by the server.

## Prerequisites

- Node.js 18+
- MongoDB: a local install (`mongodb://127.0.0.1:27017/lifeora`) or a free MongoDB Atlas cluster
- The Expo Go app on your phone, or an Android emulator / iOS simulator

## Run the backend

```bash
cd backend
cp .env.example .env        # Windows: copy .env.example .env
# edit .env: set MONGODB_URI and a long random JWT_SECRET
npm install
npm run dev                 # http://localhost:5000/api/health (or the PORT in .env)
```

### API

| Method | Path | Auth | Body |
|--------|------|------|------|
| GET | `/api/health` | – | – |
| POST | `/api/auth/guest` | – | – (creates a guest, returns a token) |
| POST | `/api/auth/register` | – | `{ name, email, password }` |
| POST | `/api/auth/login` | – | `{ email, password }` |
| GET | `/api/auth/me` | Bearer | – |
| GET | `/api/onboarding` | Bearer | – |
| PUT | `/api/onboarding` | Bearer | any of `{ currentStep, role, annualIncome, currency, schedule: [{ activity, hours, value, energy }] }` |
| POST | `/api/onboarding/schedule/extract` | Bearer | `{ text }` → `{ activities }` (optional, not used by the app; reads the day with Claude; 20 per user per hour) |
| POST | `/api/onboarding/complete` | Bearer | – |
| GET | `/api/handoffs` | Bearer | – → draining tasks (Delegation, then Replacement) with progress, plus totals (hours bought back, %, per week, value) |
| PUT | `/api/handoffs/:activity` | Bearer | any of `{ status: mine \| in_progress \| done, plan, method: hire \| automate \| team \| drop \| null, who, notes }` |

`effectiveHourlyRate`, `buybackRate` and each activity's `quadrant` are always computed by the server. Register and login exist for a later "save your progress" step but have no screen yet.

The backend also has an optional endpoint that reads a typed description of a day with the Claude API (`POST /api/onboarding/schedule/extract`, needs `ANTHROPIC_API_KEY`). The app doesn't use it right now.

## Run the app

```bash
cd frontend
cp .env.example .env        # set EXPO_PUBLIC_API_URL (see below)
npm install
npx expo start
```

Set `EXPO_PUBLIC_API_URL` for where the app runs:

- Android emulator: `http://10.0.2.2:5000/api`
- iOS simulator: `http://localhost:5000/api`
- Physical phone with Expo Go: `http://<your-computer's-LAN-IP>:5000/api` (phone and computer on the same Wi-Fi)

Restart `npx expo start` after changing `.env`.

## Branding

- **Name:** Lifeora, with the tagline "Buy back your time." The wordmark is lowercase Plus Jakarta Sans SemiBold with an apricot dot on the i.
- **Type:** the whole UI uses Plus Jakarta Sans (400, 500, 600, 700, 800), bundled with the app and loaded behind the splash screen. Styles keep using `fontWeight`; `src/theme/fonts.js` swaps in the matching font file automatically.
- **Logo:** an evergreen tile with an open white ring and a Warm Apricot arc, the spark of reclaimed time. On the landing page the arc glides into place on a loop. Brand files are in `frontend/assets/brand/`; the app icons are `frontend/assets/icon.png` and `adaptive-icon.png`. Components: `Logo.js`, `AnimatedLogo.js`, `Wordmark.js` (shapes in `src/constants/brandPaths.js`).
- **Colors ("The Opening"):** Deep Evergreen `#123C3A` (brand, headers), Life Teal `#1E7770` (primary actions), Fresh Mint `#BFE9D8` (positive states), Soft Aqua `#E8F7F3` (calm backgrounds), Off White `#F8FAF8` (surfaces), Ink `#172322` (text), and Warm Apricot `#F5B971`, used for shapes only, never as text on light. All light and dark tokens are in `frontend/src/theme/index.js`.
