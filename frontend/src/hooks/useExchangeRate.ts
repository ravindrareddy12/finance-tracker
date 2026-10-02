import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const FALLBACK_RATE = 84.0;

export function useUSDINR() {
  const [rate, setRate]       = useState<number>(FALLBACK_RATE);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    axios.get('/api/fx/usd-inr')
      .then(r => {
        const fetched = r.data?.rate;
        if (fetched && fetched > 50) setRate(fetched);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { rate, loading, refresh };
}
