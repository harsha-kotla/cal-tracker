export function errorCode(error: unknown) {
  if (typeof error === "object" && error && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  return "";
}

export function friendlyError(error: unknown) {
  const code = errorCode(error);
  if (code.includes("permission-denied")) {
    return "Firestore blocked that. Publish firestore.rules, then try again.";
  }
  if (code.includes("unavailable") || code.includes("network-request-failed")) {
    return "You appear to be offline.";
  }
  if (code.includes("failed-precondition")) {
    return "Firestore needs an index for that read. Check the browser console for the setup link.";
  }
  return "That did not save. Try again.";
}

export function friendlyAuthError(error: unknown) {
  const code = errorCode(error);
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
    return null;
  }
  if (code === "auth/unauthorized-domain") {
    const host = typeof window !== "undefined" ? window.location.hostname : "this site";
    return `Add ${host} in Firebase Authentication, then Settings, then Authorized domains.`;
  }
  if (code === "auth/popup-blocked") {
    return "The browser blocked the Google window. Allow popups and try again.";
  }
  if (code === "auth/invalid-api-key" || code.includes("api-key-not-valid")) {
    return "Firebase rejected the API key. Check .env.local and restart the dev server.";
  }
  if (code === "auth/network-request-failed") {
    return "Network error. Check your connection and try again.";
  }
  if (code === "auth/operation-not-supported-in-this-environment") {
    return "Open Cal in Safari to sign in with Google.";
  }
  if (code === "auth/web-storage-unsupported") {
    return "Cookies or storage are blocked. Allow them for this site and try again.";
  }
  return "Could not sign in with Google. Try again.";
}
