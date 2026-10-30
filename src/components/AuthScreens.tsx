"use client";

import { GoogleIcon, Mark } from "@/components/icons";
import { useAuth } from "@/context/AuthProvider";

const STEPS = [
  "In Firebase, open Authentication and turn on Google.",
  "Create a Firestore database, then paste firestore.rules and publish them.",
  "Copy the web app config into .env.local in this project.",
  "Restart the dev server. Add your real domain under Authorized domains before you open Cal on an iPhone.",
];

const ENV_KEYS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
];

export function SetupScreen() {
  return (
    <div className="fade-in min-h-0 flex-1 overflow-y-auto pt-[max(1.75rem,env(safe-area-inset-top))] pr-[max(1.75rem,env(safe-area-inset-right))] pb-[max(1.75rem,env(safe-area-inset-bottom))] pl-[max(1.75rem,env(safe-area-inset-left))]">
      <Mark />
      <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Setup</p>
      <h1 className="mt-2 font-serif text-5xl leading-none tracking-tight">Almost ready</h1>
      <p className="mt-4 max-w-[18rem] text-base leading-6 text-soft">
        Cal keeps the log in your Firebase project. Add the keys, then sign in with Google.
      </p>
      <ol className="mt-6 space-y-3 text-sm leading-5 text-soft">
        {STEPS.map((step, index) => (
          <li key={step} className="flex gap-3">
            <span className="font-medium text-ink">{index + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <pre className="mt-6 overflow-x-auto rounded-[22px] bg-espresso p-4 text-[11px] leading-5 whitespace-pre text-cream">
        {ENV_KEYS.map((key) => `${key}=`).join("\n")}
      </pre>
    </div>
  );
}

export function SignInScreen() {
  const { signIn, signingIn, authError } = useAuth();
  return (
    <div className="fade-in flex min-h-0 flex-1 flex-col justify-between pt-[max(1.75rem,env(safe-area-inset-top))] pr-[max(1.75rem,env(safe-area-inset-right))] pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1.75rem,env(safe-area-inset-left))]">
      <div />
      <div>
        <Mark />
        <h1 className="mt-6 font-serif text-[5.25rem] leading-[0.85] tracking-tight">Cal</h1>
        <span className="mt-5 block h-1 w-10 rounded-full bg-ember" />
        <p className="mt-5 max-w-[16rem] font-serif text-[1.65rem] leading-tight text-soft">
          Snap a meal. Cal reads the plate and keeps the day.
        </p>
        <button
          type="button"
          onClick={() => void signIn()}
          disabled={signingIn}
          className="mt-8 flex h-[52px] w-full items-center justify-center gap-3 rounded-full bg-card text-[15px] font-medium ring-1 ring-line active:scale-[0.99] disabled:opacity-60"
        >
          <GoogleIcon />
          {signingIn ? "Connecting…" : "Continue with Google"}
        </button>
        {authError ? (
          <p role="alert" className="mt-3 text-sm leading-5 text-heat">
            {authError}
          </p>
        ) : null}
      </div>
      <p className="text-center text-xs leading-5 text-muted">
        Google is the only sign-in. Your meals stay in your Firebase project.
      </p>
    </div>
  );
}

export function Splash() {
  return (
    <div className="grid min-h-0 flex-1 place-items-center">
      <p className="font-serif text-5xl tracking-tight">Cal</p>
    </div>
  );
}
