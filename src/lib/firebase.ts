import { getApp, getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getRedirectResult,
  GoogleAuthProvider,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  getAuth,
  type Auth,
} from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import { firebaseConfig, isFirebaseConfigured } from "@/lib/config";

let auth: Auth | undefined;
let db: Firestore | undefined;
let redirectStarted = false;

function assertBrowser() {
  if (typeof window === "undefined") {
    throw new Error("Firebase client is browser-only");
  }
}

export function getFirebaseAuth() {
  assertBrowser();
  if (!isFirebaseConfigured()) throw new Error("Firebase is not configured");
  if (auth) return auth;
  const app = getApps()[0] ?? initializeApp(firebaseConfig());
  auth = getAuth(app);
  return auth;
}

export function getDb() {
  assertBrowser();
  if (!isFirebaseConfigured()) throw new Error("Firebase is not configured");
  if (db) return db;
  const app = getApps()[0] ?? initializeApp(firebaseConfig());
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    db = getFirestore(getApp());
  }
  return db;
}

function prefersRedirect() {
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod/i.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

export function consumeRedirectResult() {
  if (redirectStarted) return Promise.resolve(null);
  redirectStarted = true;
  return getRedirectResult(getFirebaseAuth());
}

export async function signInWithGoogle() {
  const firebaseAuth = getFirebaseAuth();
  try {
    await setPersistence(firebaseAuth, browserLocalPersistence);
  } catch {
    // Private mode can reject persistence. Sign-in can still finish for this visit.
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  if (prefersRedirect()) {
    await signInWithRedirect(firebaseAuth, provider);
    return;
  }
  try {
    await signInWithPopup(firebaseAuth, provider);
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
      await signInWithRedirect(firebaseAuth, provider);
      return;
    }
    throw error;
  }
}
