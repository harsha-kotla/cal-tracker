"use client";

import { BarsIcon, GearIcon, RingIcon } from "@/components/icons";

export type Tab = "today" | "history" | "settings";

const TABS: { id: Tab; label: string; icon: typeof RingIcon }[] = [
  { id: "today", label: "Today", icon: RingIcon },
  { id: "history", label: "History", icon: BarsIcon },
  { id: "settings", label: "Settings", icon: GearIcon },
];

export function BottomNav({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav className="grid grid-cols-3 border-t border-line bg-paper pb-1" aria-label="Primary">
      {TABS.map((item) => {
        const active = item.id === tab;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => onChange(item.id)}
            className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${active ? "text-ink" : "text-muted"}`}
          >
            <Icon className={`h-6 w-6 ${active ? "text-ember" : "text-muted"}`} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
