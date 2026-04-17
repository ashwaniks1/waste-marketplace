"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type GeoPoint = { lat: number; lng: number };

type LocationState = {
  point: GeoPoint | null;
  permission: "prompt" | "granted" | "denied" | "unsupported";
  accuracyMeters: number | null;
};

const Ctx = createContext<LocationState>({
  point: null,
  permission: "prompt",
  accuracyMeters: null,
});

export function useLiveLocation() {
  return useContext(Ctx);
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LocationState>({
    point: null,
    permission: "prompt",
    accuracyMeters: null,
  });

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setState((s) => ({ ...s, permission: "unsupported" }));
      return;
    }

    let watchId: number | null = null;

    function startWatch() {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setState({
            point: { lat: pos.coords.latitude, lng: pos.coords.longitude },
            permission: "granted",
            accuracyMeters: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
          });
        },
        (err) => {
          setState((s) => ({
            ...s,
            permission: err.code === err.PERMISSION_DENIED ? "denied" : s.permission,
          }));
        },
        { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
      );
    }

    // Ask once on app load.
    navigator.geolocation.getCurrentPosition(
      () => startWatch(),
      () => startWatch(),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
    );

    return () => {
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const value = useMemo(() => state, [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

