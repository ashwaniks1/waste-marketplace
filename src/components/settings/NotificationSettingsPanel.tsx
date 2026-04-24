"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE = "wm_notify_prefs" as const;

type Prefs = {
  emailListings: boolean;
  emailMessages: boolean;
  browserPush: boolean;
};

const defaultPrefs: Prefs = {
  emailListings: true,
  emailMessages: true,
  browserPush: false,
};

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return defaultPrefs;
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return defaultPrefs;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return { ...defaultPrefs, ...parsed };
  } catch {
    return defaultPrefs;
  }
}

export function NotificationSettingsPanel() {
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPrefs(loadPrefs());
    setReady(true);
  }, []);

  const save = useCallback((next: Prefs) => {
    setPrefs(next);
    try {
      localStorage.setItem(STORAGE, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  if (!ready) {
    return <p className="text-sm text-slate-500">Loading preferences…</p>;
  }

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
        <p className="mt-1 text-sm text-slate-600">
          Choose what we highlight in-app. Email delivery for some events may still come from your account provider —
          you can adjust those in your email client.
        </p>
      </div>

      <ul className="space-y-3">
        {(
          [
            { key: "emailMessages" as const, label: "Messages & offers", sub: "New threads, offers, and pickup updates" },
            { key: "emailListings" as const, label: "Listing activity", sub: "Status changes, deadlines, and reminders" },
            { key: "browserPush" as const, label: "In-app reminders", sub: "Gentle nudges while the app is open (browser only)" },
          ] as const
        ).map((row) => (
          <li
            key={row.key}
            className="flex items-start justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-slate-900">{row.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{row.sub}</p>
            </div>
            <label className="inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500/60"
                checked={prefs[row.key]}
                onChange={(e) => save({ ...prefs, [row.key]: e.target.checked })}
              />
            </label>
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-500">Preferences are stored on this device. Account email cannot be changed here.</p>
    </div>
  );
}
