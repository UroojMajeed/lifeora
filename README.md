# Reclaim — Buy back your time

A mobile app built on the ideas in *Buy Back Your Time* by Dan Martell. It helps founders find the work that drains them, hand it off, and spend their hours where they matter most.

```
reclaim/
├── backend/    Node.js + Express + MongoDB (Mongoose) REST API
└── frontend/   React Native (Expo) app
```

## Phase 1: onboarding

| # | Screen | Book concept | Saved to MongoDB |
|---|--------|--------------|------------------|
| – | Landing (animated logo) | – | – |
| – | Welcome (3 slides) | Buyback Principle, Buyback Loop, DRIP Matrix | – |
| – | Sign up / Log in | – | `users` |
| 1 | Buyback Rate | Pay ÷ 2,000 hrs ÷ 4 | `annualIncome`, `effectiveHourlyRate`, `buybackRate` |
| 2 | Energy drains | Audit your Delegation Quadrant | `drainingTasks` |
| 3 | How does your business feel? | Replacement Ladder (Stuck → Flow) | `feeling`, `ladderRung` |
| 4 | Time Assassins | Staller, Speed Demon, Supervisor, Saver, Self-Medicator | `timeAssassins` |
| 5 | Vision | "What would I fill my time with?" | `visionStatement` |
| 6 | Summary | Your Buyback Plan | `completed`, `completedAt` |

Progress is saved after every step, so a user who closes the app resumes on the step they left.

## Prerequisites

- Node.js 18+
- MongoDB: a local install (`mongodb://127.0.0.1:27017`) or a free MongoDB Atlas cluster
- The Expo Go app on your phone, or an Android emulator / iOS simulator

## Run the backend

```bash
cd backend
cp .env.example .env        # Windows: copy .env.example .env
# edit .env: set MONGODB_URI and a long random JWT_SECRET
npm install
npm run dev                 # http://localhost:5000/api/health
```

### API

| Method | Path | Auth | Body |
|--------|------|------|------|
| GET | `/api/health` | – | – |
| POST | `/api/auth/register` | – | `{ name, email, password }` |
| POST | `/api/auth/login` | – | `{ email, password }` |
| GET | `/api/auth/me` | Bearer | – |
| GET | `/api/onboarding` | Bearer | – |
| PUT | `/api/onboarding` | Bearer | any of `{ currentStep, annualIncome, drainingTasks, feeling, timeAssassins, visionStatement }` |
| POST | `/api/onboarding/complete` | Bearer | – |

`effectiveHourlyRate`, `buybackRate` and `ladderRung` are always computed by the server.

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

- **Name:** Reclaim, with the tagline "Buy back your time."
- **Logo:** a clock circled by an orange arrow that loops back around it, standing for the Buyback Loop. The React component is `frontend/src/components/Logo.js` and the standalone file is `frontend/assets/logo.svg`.
- **Colors:** sky blue `#00A9E0`, orange `#F26522`, navy `#0B2545`.
