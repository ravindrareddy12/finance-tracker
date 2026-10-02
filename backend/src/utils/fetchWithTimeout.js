// fetch() that aborts after `timeoutMs` (throws an AbortError on timeout).
async function fetchWithTimeout(url, { timeoutMs = 10000, ...options } = {}) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

module.exports = fetchWithTimeout;
