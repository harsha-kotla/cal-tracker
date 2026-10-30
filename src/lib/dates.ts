export function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayKey() {
  return dateKey(new Date());
}

export function parseDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function addDays(key: string, amount: number) {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + amount);
  return dateKey(date);
}

export function daysBetween(fromKey: string, toKey: string) {
  const from = parseDateKey(fromKey);
  const to = parseDateKey(toKey);
  const utcFrom = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const utcTo = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((utcTo - utcFrom) / 86_400_000);
}

export function rangeKeys(end: string, days: number) {
  const keys: string[] = [];
  for (let index = days - 1; index >= 0; index -= 1) {
    keys.push(addDays(end, -index));
  }
  return keys;
}

const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" });
const monthDay = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" });
const shortDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const narrowWeekday = new Intl.DateTimeFormat("en-US", { weekday: "narrow" });

export function formatWeekday(key: string) {
  return weekday.format(parseDateKey(key));
}

export function formatMonthDay(key: string) {
  return monthDay.format(parseDateKey(key));
}

export function formatShortDay(key: string) {
  return shortDay.format(parseDateKey(key));
}

export function formatNarrowWeekday(key: string) {
  return narrowWeekday.format(parseDateKey(key));
}

export function mealForNow() {
  const hour = new Date().getHours();
  if (hour < 11) return "breakfast" as const;
  if (hour < 15) return "lunch" as const;
  if (hour < 21) return "dinner" as const;
  return "snack" as const;
}
