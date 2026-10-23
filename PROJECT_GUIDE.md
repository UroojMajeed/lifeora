# Lifeora: Project Guide

Everything you need to pick this project up on a new machine, in the cloud (claude.ai/code), or hand it to an AI agent. Read this first.

> **No secrets are in this file or in git.** Passwords, the database connection string and the JWT secret live only in local `.env` files (git-ignored), on Vercel, and in Expo. Ask the owner for them; never paste them into chat, commits or docs.

---

## 1. What it is

**Lifeora** is a mobile app built on Dan Martell's book *Buy Back Your Time*. It helps founders and freelancers:

1. **Know their worth.** They enter yearly pay, and the app works out an hourly worth and a **Buyback Rate** (hourly ÷ 4).
2. **Audit their routine.** They list each task with how long it takes a day, what it pays ($–$$$$$) and whether it drains or energizes them.
3. **See the DRIP Matrix.** Each task falls into Delegation, Replacement, Investment or Production.
4. **Hand off what drains them.** Each draining task is handed off step by step on a winding road.
5. **Reinvest the hours** they buy back into production and their own life, with a weekly check-in.

Progress is always shown in **hours bought back**, never money.

---

## 2. Where everything lives

| What | Where |
|---|---|
| Code | GitHub, private: `https://github.com/UroojMajeed/lifeora`. Branch `main`. The local folder on the original PC is named `reclaim`. |
| Backend (online) | Vercel: `https://lifeora-nine.vercel.app/api` (health: `/api/health`). Auto-deploys on every push to `main`. Vercel root dir is `backend`, entry `backend/api/index.js`. Deployment Protection is **off**. |
| Database (online) | MongoDB Atlas M0, project **Lifeora**, cluster `lifeora`, database **`lifeora`**, DB user `lifeora-api`. Testers' data is in the `users` collection. |
| Database (local) | MongoDB on the dev PC: `mongodb://127.0.0.1:27017/lifeora`. |
| App builds and updates | Expo / EAS, account `uroojmajeed`, project `@uroojmajeed/lifeora` (projectId `5f67c32c-54c0-44e1-9171-9031cf7f86db`). Android package `com.lifeora.app`. |
| Testers' APK | `https://expo.dev/artifacts/eas/fohG1fTb6_ZrKDXCH3k3bgJHnprgvs4ZMTslEk6shbM.apk` (preview channel). New JS reaches it through OTA updates. |
| Alternative host | `render.yaml` (Render Blueprint) exists but isn't used: Render asked for a card, so Vercel was chosen. |

### Environment variables (names only)

**`backend/.env`** (copy from `backend/.env.example`):

| Name | What |
|---|---|
| `PORT` | Local port. The dev PC uses **5001**, because another app has 5000. |
| `MONGODB_URI` | Local: `mongodb://127.0.0.1:27017/lifeora`. On Vercel it's the Atlas string, a locked "sensitive" variable. |
| `JWT_SECRET` | A long random string. Required: the server won't start without it. |
| `JWT_EXPIRES_IN` | `365d`. Guests keep their token for a year. |
| `CLIENT_ORIGIN` | `*` |
| `ANTHROPIC_API_KEY` | Optional. Only for the unused `/onboarding/schedule/extract` endpoint; the owner doesn't want paid AI for now. |
| `MONGODB_URI_ONLINE` | Optional. Only for `npm run reset-guests:online`; the owner adds it themselves. |

**`frontend/.env`**: one variable, `EXPO_PUBLIC_API_URL`.

| Where the app runs | Value |
|---|---|
| Phone on the same Wi-Fi | `http://<PC-LAN-IP>:5001/api` (the original PC uses `http://192.168.2.201:5001/api`) |
| Android emulator | `http://10.0.2.2:5001/api` |
| Web or iOS simulator | `http://localhost:5001/api` |

EAS builds and updates always use the online URL (set in `eas.json` and the `update:preview` script).

---

## 3. Tech stack

- **App:** React Native 0.86 with **Expo SDK 57**, React 19.
  - Navigation: react-navigation (native-stack plus bottom-tabs with a custom floating tab bar).
  - Visuals and feedback: reanimated 4, react-native-svg, expo-linear-gradient, expo-haptics.
  - Storage, fonts, updates: AsyncStorage, the Plus Jakarta Sans font, expo-updates (OTA), expo-dev-client.
- **Backend:** Node 18+, Express 4, Mongoose 8 (a single `User` model holds everything), JWT auth, helmet, express-rate-limit, zod.
- **Hosting:** Vercel (serverless; `backend/api/index.js` connects to the database, then hands the request to Express) and MongoDB Atlas.

---

## 4. Repo map

```
reclaim/
├── PROJECT_GUIDE.md        this file
├── README.md               older overview + API table
├── render.yaml             unused Render blueprint
├── backend/
│   ├── api/index.js        Vercel entry
│   ├── vercel.json         routes everything to /api
│   ├── scripts/reset-guests.js   delete guest users (local; --online for Atlas)
│   └── src/
│       ├── server.js, app.js, config/db.js
│       ├── models/User.js          user + onboarding + handoffs (with steps) + fills + rounds + checkIns
│       ├── controllers/            auth, onboarding, handoffs (+ fills, rounds), checkIns
│       ├── routes/                 /auth /onboarding /handoffs /fills /rounds /checkins
│       └── utils/buyback.js        Buyback Rate maths, DRIP quadrant, enums (methods, step kinds…)
└── frontend/
    ├── App.js              checks for an EAS update behind the splash and restarts into it (gives up after 8 s)
    ├── app.json, eas.json
    ├── scripts/start-online.js     Cloudflare quick tunnel for testing from any network
    └── src/
        ├── config.js               API base URL
        ├── api/client.js           all API calls
        ├── context/                OnboardingContext, HandoffsContext
        ├── navigation/             AppNavigator (stack), MainTabs (tabs)
        ├── theme/                  index.js (colours, light + dark), fonts.js (type scale), ThemeContext (DARK_MODE flag)
        ├── constants/              content.js (texts, options, suggestions), journey.js (handoff steps), checkin.js, milestones.js, home.js …
        ├── storage/                on-phone data (milestones, motivation photo, progress)
        ├── components/             cards, sheets, WindingRoad, PlanEditor, CardHeader …
        └── screens/                Home, HandoffJourney, CheckIn(s), Me, MyDay (Routine), onboarding/*
```

---

## 5. Set it up on a new machine

1. **Install** Node 18+ (20 LTS is fine), Git and MongoDB Community (or point `MONGODB_URI` at Atlas). Install the EAS CLI as needed with `npx eas-cli@latest …`.
2. **Clone:**
   ```bash
   git clone https://github.com/UroojMajeed/lifeora.git
   cd lifeora
   ```
3. **Backend:**
   ```bash
   cd backend
   cp .env.example .env      # then fill in: PORT=5001, MONGODB_URI, JWT_SECRET
   npm install
   npm run dev               # check http://localhost:5001/api/health
   ```
4. **App:**
   ```bash
   cd frontend
   npm install
   # create .env with EXPO_PUBLIC_API_URL (see section 2)
   ```
   Then pick how to run it:

   | Command | What it does |
   |---|---|
   | `npx expo start` | The usual way, for the **development build** (expo-dev-client). Needs a dev APK on the phone; see below. |
   | `npm run start:wifi` | Expo Go on the same Wi-Fi, using the online backend. |
   | `npm run start:online` | Expo Go from any network, through a Cloudflare tunnel, using the online backend. (Expo's own `--tunnel` is broken.) |
   | `npm run web` | Runs the app in a web browser. Good for quick checks; native-only things (haptics, share sheet) do nothing there. |
5. **Development APK (only when native code changes).** JavaScript changes load live from Metro, so you only rebuild when native dependencies or `app.json` change. Recipe for Windows:
   - Copy `frontend` (without `android/`) to a short path with no spaces, e.g. `C:\lf\frontend`. Paths containing spaces or longer than 260 characters break the native build.
   - Make the Android SDK reachable at `C:\Android\Sdk` (a junction works).
   - In `android/local.properties`, set `sdk.dir=C\:/Android/Sdk`.
   - Run `npx expo prebuild --platform android --no-install`.
   - Run `gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a` with JDK 17.
   - The result is an arm64-only APK. It won't run on an x86_64 emulator.
6. **In the cloud (claude.ai/code).** Clone the repo there. The agent can edit, commit, push and bundle-check (`npx expo export --platform android`). It can't run the phone app or your local MongoDB. Pushing to `main` still deploys the backend to Vercel.

---

## 6. Shipping

| What | How |
|---|---|
| **Backend** | Push to `main`. Vercel deploys automatically. Check `https://lifeora-nine.vercel.app/api/health`. Make schema changes backward compatible (new fields optional with defaults), because testers' phones may still run older JS. |
| **App update to testers (OTA)** | `cd frontend && npm run update:preview -- --message "what changed"`. It publishes to the `preview` channel with the online API. Testers fully close and reopen the app (twice if needed). **Only publish when the owner says so.** |
| **New tester APK** | `npm run build:preview` (EAS cloud, about 30–60 min in the free queue). Needed only when native deps or `app.json` change. Share the new artifact link. |

---

## 7. Data and API (short)

One `users` document per person. Guests are created on first open (`POST /api/auth/guest`) and can later save an account (`POST /api/auth/save`).

| Field | Holds |
|---|---|
| `onboarding` | role, currency, annualIncome, effectiveHourlyRate, buybackRate, and `schedule[]` (activity, hours, per, money 1–5, value, energy, quadrant computed on the server) |
| `handoffs[]` | one per draining task: `activity`, `status` (mine / in_progress / done / later), `method` (hire / automate / team / drop), `plan`, `who`, `doneLooksLike`, `checkHow` (10-80-10 brief), `startDate`, `notes`, and **`steps[]`** (id, kind, title, done, doneAt). Step kinds are how, brief, who, handover, drop and custom; the plan always ends with exactly one handover or drop. Also `planConfirmed` (saved but not used right now) and `doneAt`. |
| `fills[]` | freed hours reinvested: activity, hours, quadrant production or investment, when |
| `rounds[]` | finished rounds of the Buyback Loop (`POST /api/rounds/next` starts the next one) |
| `checkIns[]` | weekly check-ins (`POST /api/checkins`) |

**Routes** (all under `/api`, Bearer token unless noted):
- `/auth`: `/guest`, `/register`, `/login`, `/save`, and `/me` (GET and DELETE).
- `/onboarding`: GET, PUT, and POST `/complete`.
- `/handoffs`: GET, and PUT `/handoffs/:activity`.
- `/fills`: PUT.
- `/rounds/next`: POST.
- `/checkins`: POST.
- `/health`: no token needed.

---

## 8. How the app works (screens)

1. **Onboarding** (the "Step x of 4" header is intentional; steps 3 and 4 happen on Home):
   - Landing, then **Journey** (a road of 4 steps to the sun).
   - **Know your worth** (Profile and Buyback Rate).
   - **Time and energy audit** (AuditScreen): the "calm and stacked" add-a-task form, then the routine list.
   - **DRIP Matrix** (SwipeScreen).
   - Then Home.
2. **Tabs:** Handoffs · Check-ins · **Home** (in the middle) · Routine (the audit list, editable) · Me. The tab bar is a white floating pill with an apricot active pill.
3. **Home:**
   - **First visit:** the routine graph, then **Your First Move** (the biggest drain highlighted, "Free up X h a week", step dots, Start handing it off), then a waiting card.
   - **After a handoff:** the hours-bought-back card (gold, weekly columns), the weekly check-in when it's due (Friday to Sunday), the routine graph with freed hours, Your Next Move, the Reinvest card (bar plus two boxes, which open a sheet), and Production before vs now.
4. **Handoff journey** (HandoffJourneyScreen):
   - A winding road through a sunrise: grey ahead, teal where you've been, apricot ticks, and the sun at the end.
   - At the top: the task's hours, **Edit steps** (PlanEditor: add at the top, drag ≡ to reorder, rename, delete; the finishing step stays last) and the rule **"Hand it off under $X/hr"** (the Buyback Rate).
   - Each step opens a sheet with one button: Save, Hand it over, Drop it, or Mark done. Picking **Drop it** shortens the plan to How → Stop doing it.
   - Finishing the last step marks the task `done`, so its hours count as bought back.
5. **Milestones** at 10, 25, 50, 100 and 250 hours are saved, with badges on Me. The slide-up is hidden.

### Flags

| Flag | Where | Now |
|---|---|---|
| `DARK_MODE` | `theme/ThemeContext.js` | `false`: always light, theme button hidden |
| `SHOW_MILESTONE_SHEET` | `screens/HomeScreen.js` | `false` |
| `__DEV__` previews | Me screen "Preview" row | dev builds only |

---

## 9. Design rules (the owner's)

- **Brand palette:** evergreen `#123C3A`, teal `#1E7770` (primary), mint `#BFE9D8`, aqua `#E8F7F3`, apricot `#F5B971` (the spark, used for shapes, never as text on light), off-white `#F8FAF8`, ink `#172322`.
  - Always use theme tokens (`colors.*`), and keep theme keys unique: a duplicate key once broke a button.
- **One type scale:** 28 screen title / 20 / 18 card title / 16 / 15 / 14 / 13 / 12.
  - Card titles are 18 in Title Case, and nothing inside a card is bigger than its title.
  - Home cards use `CardHeader` / `homeCard`.
- **Calm and clean.** Little text, minimal animation (one quiet fade, no bounces or count-ups), and tap rather than type.
- **Hours, not money,** for progress and milestones. The Buyback Rate is shown where it helps a decision, like the handoff screen.
- **Ambiguous UI request?** Make a small mockup first and build after the owner confirms.
- **Rejected before; don't bring back:**
  - the four-block Home;
  - the "everyone/homemaker" version;
  - calendar import;
  - paid AI;
  - a plan-confirm screen and "I did it / Not yet" in the handoff steps.

---

## 10. Working rules (for any agent)

1. **Commit and push every change** to `main`, with a clear message. Pushing deploys the backend.
2. **After each change, reset the local guests** so the phone restarts onboarding: `cd backend && node scripts/reset-guests.js` (local DB only).
3. **Check before committing:**
   - Bundle check: `cd frontend && npx expo export --platform android --output-dir <tmp>`, and look for "Exported".
   - An undefined-names check, if you have one.
   - Don't run browser tests unless the owner asks.
4. **Don't publish** to testers (`update:preview`) unless the owner says so.
5. **Security:**
   - Never paste or commit passwords or connection strings.
   - Only ever delete `isGuest: true` users.
   - **Never delete anything in Atlas without asking.** It's testers' real data, and `reset-guests:online` wipes their guests.
   - The Vercel `MONGODB_URI` is locked, so don't ask the owner to paste it.
6. **Match the code style:** single quotes, long lines, short comments explaining *why*. Don't run Prettier over files; it reformats them to a different style.
7. **Windows quirks on the original PC:**
   - The folder path has a space (`Meta Logix`), so the native build happens in a copy (section 5).
   - Stopped background `nodemon` tasks leave node holding port 5001; kill them before starting another.
   - In Bash, heredocs mangle template literals, so write edit scripts to a file and run them with node.
8. **Cleanup is deferred.** Unused components (`DripRow`, `ProgressRing`, `RolePicker`, `StepSlider`) stay until Home and onboarding are finished.

---

## 11. Backlog / ideas

- Cleanup of unused components.
- A new APK with image sharing (view-shot + expo-sharing) and weekly check-in notifications.
- Rounds as a time-based "fresh look" (on hold).
- Replacement Ladder badges; Perfect Week.
- Real AI drafts for the brief (needs the owner's go-ahead and an API key).
