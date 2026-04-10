import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function RouteTracker() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window.gtag !== 'function') return;

    window.gtag('event', 'page_view', {
      page_location: window.location.href,
      page_path: location.pathname + location.search,
      page_title: document.title,
    });
  }, [location]);

  return null;
}
