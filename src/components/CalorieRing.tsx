"use client";

import { useEffect, useState } from "react";
import { formatNumber } from "@/lib/stats";

const RADIUS = 78;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CalorieRing({
  eaten,
  goal,
  onEditGoal,
}: {
  eaten: number;
  goal: number;
  onEditGoal?: () => void;
}) {
  const safeGoal = Math.max(goal, 1);
  const over = eaten > safeGoal;
  const progress = Math.min(eaten / safeGoal, 1);
  const [shown, setShown] = useState(0);
  const hero = over ? eaten - safeGoal : Math.max(safeGoal - eaten, 0);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setShown(progress));
    return () => window.cancelAnimationFrame(frame);
  }, [progress]);

  return (
    <div>
      <div className="relative mx-auto h-[188px] w-[188px]">
        <svg viewBox="0 0 200 200" className="h-full w-full">
          <circle cx="100" cy="100" r={RADIUS} fill="none" stroke="rgba(246,241,231,0.14)" strokeWidth="12" />
          <circle
            cx="100"
            cy="100"
            r={RADIUS}
            fill="none"
            stroke={over ? "#ffb4a8" : "#ff5c39"}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - shown)}
            transform="rotate(-90 100 100)"
            className="ring-progress"
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
          <p className="font-serif text-[3.15rem] leading-none tracking-tight tabular-nums">{formatNumber(hero)}</p>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-cream/65">
            {over ? "over" : "kcal left"}
          </p>
        </div>
      </div>
      {onEditGoal ? (
        <button
          type="button"
          onClick={onEditGoal}
          className="mx-auto mt-1 block text-sm tabular-nums text-cream/65 underline decoration-cream/25 underline-offset-4"
        >
          {formatNumber(eaten)} eaten · {formatNumber(safeGoal)} goal
        </button>
      ) : (
        <p className="mt-1 text-center text-sm tabular-nums text-cream/65">
          {formatNumber(eaten)} eaten · {formatNumber(safeGoal)} goal
        </p>
      )}
    </div>
  );
}
