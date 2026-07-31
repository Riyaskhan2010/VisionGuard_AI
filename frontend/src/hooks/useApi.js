import { useState, useCallback } from "react";

/**
 * Generic hook that wraps an async API call with loading / error / data state.
 * Usage:
 *   const { data, loading, error, execute } = useApi(adminAPI.dashboard);
 *   useEffect(() => { execute(); }, []);
 */
export function useApi(apiFunc) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFunc(...args);
        setData(res.data.data ?? res.data);
        return res.data.data ?? res.data;
      } catch (err) {
        const msg =
          err.response?.data?.message ||
          err.message ||
          "An unexpected error occurred.";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiFunc]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset };
}

export default useApi;
