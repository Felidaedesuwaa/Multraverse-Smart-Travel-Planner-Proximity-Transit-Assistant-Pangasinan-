import { useEffect, useState } from "react";
import { api } from "../lib/api";

// Load once when the web preview is first used, rather than on every hover.
export function useMapPlaces(enabled) {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let disposed = false;
    setLoading(true); setError(false);
    const timeout = setTimeout(() => controller.abort(), 12000);
    api.getPublicPlaces({ signal: controller.signal })
      .then(data => { if (!Array.isArray(data)) throw new Error("Invalid places response"); if (!disposed) setPlaces(data); })
      .catch(() => { if (!disposed) setError(true); })
      .finally(() => { clearTimeout(timeout); if (!disposed) setLoading(false); });
    return () => { disposed = true; clearTimeout(timeout); controller.abort(); };
  }, [enabled, attempt]);
  return { places, loading, error, retry: () => setAttempt(value => value + 1) };
}
