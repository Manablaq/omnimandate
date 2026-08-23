"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import { readOmniMandateOverview, type OmniMandateOverview } from "@/lib/omnimandate-reads";

export type OmniMandateOverviewReadState = "idle" | "loading" | "success" | "error";

type UseOmniMandateOverviewOptions = {
  address: Address | null;
  enabled: boolean;
};

export function useOmniMandateOverview({ address, enabled }: UseOmniMandateOverviewOptions) {
  const [state, setState] = useState<OmniMandateOverviewReadState>("idle");
  const [data, setData] = useState<OmniMandateOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const canRead = enabled && address !== null;

  const refresh = useCallback(async () => {
    if (!canRead || !address) return;

    const currentRequest = ++requestId.current;
    setState("loading");
    setError(null);

    try {
      const nextData = await readOmniMandateOverview(address);
      if (requestId.current !== currentRequest) return;
      setData(nextData);
      setState("success");
    } catch {
      if (requestId.current !== currentRequest) return;
      setData(null);
      setError("OmniMandate data could not be loaded from Bradbury right now.");
      setState("error");
    }
  }, [address, canRead]);

  useEffect(() => {
    const currentRequest = ++requestId.current;
    const timer = window.setTimeout(() => {
      if (canRead) {
        void refresh();
        return;
      }

      if (requestId.current !== currentRequest) return;
      setData(null);
      setError(null);
      setState("idle");
    }, 0);

    return () => window.clearTimeout(timer);
  }, [canRead, refresh]);

  return { state, data, error, refresh };
}
