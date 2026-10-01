import { useEffect, useState } from 'react';
import { fetchClimatology } from '../utils/nasaPower.js';

// Simple in-memory cache so switching between sites and back doesn't
// re-fetch. Keyed by site id. Cleared on full page reload — that's fine
// for a demo; a backend cache layer can replace this later.
const cache = new Map();

export function useClimatology(site) {
  const [state, setState] = useState({ status: 'idle', data: null, error: null });

  useEffect(() => {
    if (!site) {
      setState({ status: 'idle', data: null, error: null });
      return;
    }

    if (cache.has(site.id)) {
      setState({ status: 'success', data: cache.get(site.id), error: null });
      return;
    }

    let cancelled = false;
    setState({ status: 'loading', data: null, error: null });

    fetchClimatology(site.lat, site.lng)
      .then((data) => {
        if (cancelled) return;
        cache.set(site.id, data);
        setState({ status: 'success', data, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ status: 'error', data: null, error: err.message });
      });

    return () => { cancelled = true; };
  }, [site?.id]);

  return state;
}
