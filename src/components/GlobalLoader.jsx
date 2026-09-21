import { useEffect, useState } from 'react';
import { subscribe, isLoading } from '../utils/loaderStore';
import './GlobalLoader.css';

// Full-screen overlay spinner shown whenever any network request is in flight.
// State is driven by the global fetch interceptor via loaderStore.
export default function GlobalLoader() {
  const [loading, setLoading] = useState(isLoading());

  useEffect(() => subscribe(setLoading), []);

  if (!loading) return null;

  return (
    <div className="global-loader" role="status" aria-live="polite" aria-label="Loading">
      <div className="global-loader__spinner" />
    </div>
  );
}
