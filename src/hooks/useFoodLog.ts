"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { addDays } from "@/lib/dates";
import { toEntry } from "@/lib/data";
import { friendlyError } from "@/lib/errors";
import { getDb } from "@/lib/firebase";
import type { Entry } from "@/lib/types";

export function useFoodLog(uid: string | undefined, today: string) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(Boolean(uid));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    const log = query(
      collection(getDb(), "users", uid, "entries"),
      where("date", ">=", addDays(today, -120)),
      where("date", "<=", today),
    );
    return onSnapshot(
      log,
      (snapshot) => {
        setEntries(snapshot.docs.map(toEntry));
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(friendlyError(err));
        setLoading(false);
      },
    );
  }, [today, uid]);

  if (!uid) return { entries: [], loading: false, error: null };
  return { entries, loading, error };
}
