"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { isFirebaseConfigured } from "@/lib/config";
import { ensureProfile, updateCalorieGoal } from "@/lib/data";
import { friendlyAuthError, friendlyError } from "@/lib/errors";
import { consumeRedirectResult, getDb, getFirebaseAuth, signInWithGoogle } from "@/lib/firebase";
import { clampGoal } from "@/lib/stats";
import type { Profile } from "@/lib/types";

type AuthContextValue = {
  configured: boolean;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signingIn: boolean;
  authError: string | null;
  notice: string | null;
  clearNotice: () => void;
  signIn: () => Promise<void>;
  signOutUser: () => Promise<void>;
  setCalorieGoal: (goal: number) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STARTUP_ERROR = "Firebase did not start. Check .env.local and restart the dev server.";

function firebaseStartupError(configured: boolean) {
  if (!configured) return null;
  try {
    getFirebaseAuth();
    return null;
  } catch {
    return STARTUP_ERROR;
  }
}

function fallbackProfile(user: User): Profile {
  return {
    displayName: user.displayName?.trim() || "Your log",
    email: user.email ?? "",
    photoURL: user.photoURL ?? "",
    calorieGoal: 2000,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isFirebaseConfigured();
  const startupError = firebaseStartupError(configured);
  const [user, setUser] = useState<User | null>(null);
  const [profileState, setProfileState] = useState<{ uid: string; profile: Profile } | null>(null);
  const [loading, setLoading] = useState(configured && !startupError);
  const profile = user && profileState?.uid === user.uid ? profileState.profile : null;
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(startupError);
  const [notice, setNotice] = useState<string | null>(null);
  const creatingProfile = useRef(false);

  useEffect(() => {
    if (!configured || startupError) return;

    let unsubscribe = () => {};
    let cancelled = false;
    let settled = false;
    const finish = () => {
      if (cancelled || settled) return;
      settled = true;
      setLoading(false);
    };
    const auth = getFirebaseAuth();
    unsubscribe = onAuthStateChanged(auth, (next) => {
      if (cancelled) return;
      setUser(next);
      if (next) {
        setSigningIn(false);
        finish();
      }
    });
    void consumeRedirectResult()
      .catch((error) => {
        if (cancelled) return;
        const message = friendlyAuthError(error);
        if (message) setAuthError(message);
        setSigningIn(false);
      })
      .finally(finish);

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [configured, startupError]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const unsubscribe = onSnapshot(
      doc(getDb(), "users", user.uid),
      (snapshot) => {
        if (!snapshot.exists()) {
          if (creatingProfile.current) return;
          creatingProfile.current = true;
          void ensureProfile(user)
            .catch((error) => {
              if (cancelled) return;
              setNotice(friendlyError(error));
              setProfileState({ uid: user.uid, profile: fallbackProfile(user) });
            })
            .finally(() => {
              creatingProfile.current = false;
            });
          return;
        }
        const data = snapshot.data();
        setProfileState({
          uid: user.uid,
          profile: {
            displayName:
              (typeof data.displayName === "string" && data.displayName.trim()) ||
              user.displayName?.trim() ||
              "Your log",
            email: typeof data.email === "string" ? data.email : (user.email ?? ""),
            photoURL: typeof data.photoURL === "string" ? data.photoURL : (user.photoURL ?? ""),
            calorieGoal: clampGoal(Number(data.calorieGoal)),
          },
        });
      },
      () => {
        if (cancelled) return;
        setProfileState({ uid: user.uid, profile: fallbackProfile(user) });
        setNotice("Could not load your profile from Firestore.");
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user]);

  const signIn = useCallback(async () => {
    setAuthError(null);
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      const message = friendlyAuthError(error);
      if (message) setAuthError(message);
      setSigningIn(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(getFirebaseAuth());
  }, []);

  const setCalorieGoal = useCallback(
    async (goal: number) => {
      if (!user) return;
      await updateCalorieGoal(user.uid, clampGoal(goal));
    },
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        configured,
        user,
        profile,
        loading,
        signingIn,
        authError,
        notice,
        clearNotice: () => setNotice(null),
        signIn,
        signOutUser,
        setCalorieGoal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
