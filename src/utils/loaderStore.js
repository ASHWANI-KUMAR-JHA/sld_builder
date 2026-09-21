// Tiny global store that tracks the number of in-flight network requests.
// A global fetch interceptor bumps this counter up/down automatically, so any
// API call (Supabase, direct fetch, image loads via fetch) toggles the loader
// without touching individual call sites.

let activeRequests = 0;
const listeners = new Set();

function notify() {
  const loading = activeRequests > 0;
  listeners.forEach((fn) => fn(loading));
}

export function startRequest() {
  activeRequests += 1;
  notify();
}

export function endRequest() {
  activeRequests = Math.max(0, activeRequests - 1);
  notify();
}

export function isLoading() {
  return activeRequests > 0;
}

// Subscribe to loading-state changes. Returns an unsubscribe function.
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// The unpatched fetch, captured once so callers (e.g. the Supabase client)
// can route through the loader without being double-counted by the global
// window.fetch interceptor.
const nativeFetch =
  typeof window !== 'undefined' && window.fetch
    ? window.fetch.bind(window)
    : undefined;

// A fetch wrapper that toggles the loader using the native fetch. Use this for
// clients that take a custom fetch (avoids double counting with the global patch).
export function loaderFetch(...args) {
  if (!nativeFetch) return fetch(...args);
  startRequest();
  return nativeFetch(...args).finally(endRequest);
}

// Patches window.fetch once so every request flows through the counter.
let installed = false;
export function installFetchInterceptor() {
  if (installed || typeof window === 'undefined' || !window.fetch) return;
  installed = true;

  window.fetch = (...args) => {
    startRequest();
    return nativeFetch(...args).finally(endRequest);
  };
}
