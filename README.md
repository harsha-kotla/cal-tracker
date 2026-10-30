# Cal

A phone-sized calorie tracker. Sign in with Google, photograph a meal or type it, then keep the day's nutrition in Firestore.

The photo is used to estimate the plate and is not stored. Each entry saves the meal name, portion, calories, and the rest of the nutrition facts for that day.

## Run it

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Setup

Fill `.env.local` from the Firebase console and your OpenAI account. `.env.local` is gitignored. `.env.example` stays empty on purpose.

1. Create a Firebase web app and copy the `NEXT_PUBLIC_FIREBASE_*` values.
2. Enable Authentication and turn on Google as the only sign-in provider. Add `localhost` to the authorized domains.
3. Create a Firestore database and publish [`firestore.rules`](firestore.rules).
4. Set `OPENAI_API_KEY`. Leave it server-only. Do not prefix it with `NEXT_PUBLIC_`.

Restart `npm run dev` after changing env values.

On a phone, Google sign-in needs a hostname that is listed in Firebase authorized domains. A raw IP address will not complete sign-in.

## Daily goal

Settings stores a calorie target from 500 to 10,000 kcal on the signed-in account. The ring on Today fills against that number.
