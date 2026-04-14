import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    // Disable standard browser scroll restoration to prevent "jumping"
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    // Force scroll to top instantly
    window.scrollTo(0, 0);
    
    // Fallback/Reinforcement for all browsers and mobile devices
    const scrollTargets = [document.documentElement, document.body];
    scrollTargets.forEach(target => {
      if (target) {
        target.scrollTo({
          top: 0,
          left: 0,
          behavior: 'instant' as ScrollBehavior
        });
      }
    });
  }, [location.key]); // Use location.key to trigger on every navigation event

  return null;
}
