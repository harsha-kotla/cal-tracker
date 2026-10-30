import { createVerify } from "node:crypto";
import { firebaseConfig } from "@/lib/config";

type CertMap = Record<string, string>;

let cachedCerts: { expires: number; certs: CertMap } | null = null;

async function googleCerts() {
  if (cachedCerts && cachedCerts.expires > Date.now()) return cachedCerts.certs;
  const response = await fetch(
    "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com",
    { cache: "no-store" },
  );
  if (!response.ok) throw new Error("Could not verify the sign-in.");
  const certs = (await response.json()) as CertMap;
  const cacheControl = response.headers.get("cache-control") ?? "";
  const maxAge = Number(cacheControl.match(/max-age=(\d+)/)?.[1] ?? 3600);
  cachedCerts = { certs, expires: Date.now() + Math.max(60, maxAge) * 1000 };
  return certs;
}

function decode(part: string) {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as Record<string, unknown>;
}

export async function verifyFirebaseIdToken(token: string) {
  const projectId = firebaseConfig().projectId;
  const parts = token.split(".");
  if (parts.length !== 3 || !projectId) throw new Error("Sign in again to scan a meal.");
  const [headerPart, payloadPart, signaturePart] = parts;
  const header = decode(headerPart);
  const payload = decode(payloadPart);
  if (header.alg !== "RS256" || typeof header.kid !== "string") {
    throw new Error("Sign in again to scan a meal.");
  }
  const cert = (await googleCerts())[header.kid];
  if (!cert) throw new Error("Sign in again to scan a meal.");
  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${headerPart}.${payloadPart}`);
  verifier.end();
  const valid = verifier.verify(cert, Buffer.from(signaturePart, "base64url"));
  const now = Math.floor(Date.now() / 1000);
  const exp = typeof payload.exp === "number" ? payload.exp : 0;
  const iat = typeof payload.iat === "number" ? payload.iat : 0;
  if (
    !valid ||
    payload.aud !== projectId ||
    payload.iss !== `https://securetoken.google.com/${projectId}` ||
    typeof payload.sub !== "string" ||
    !payload.sub ||
    exp < now ||
    iat > now + 300
  ) {
    throw new Error("Sign in again to scan a meal.");
  }
  return payload.sub;
}
