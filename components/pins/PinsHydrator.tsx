"use client";

import { useEffect } from "react";
import { usePinsStore } from "@/lib/pins-store";

export function PinsHydrator() {
  const hydrate = usePinsStore((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  return null;
}
