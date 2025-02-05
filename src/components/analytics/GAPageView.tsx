import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { pageview } from '@/lib/analytics';

export function GAPageView() {
  const location = useLocation();
  const lastPathRef = useRef(location.pathname);

  useEffect(() => {
    // Only track page views if the path has changed
    if (lastPathRef.current !== location.pathname) {
      lastPathRef.current = location.pathname;
      pageview(location.pathname);
    }
  }, [location]);

  return null;
}