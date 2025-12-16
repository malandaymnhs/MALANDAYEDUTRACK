import { useEffect, useState } from 'react';
// Generic Idle Timer hook
// Usage: const { isIdle, reset } = useIdleTimer({ timeout: 120000, onIdle, onActivity });
// - timeout: ms before considering user idle (default 2 minutes)
// - onIdle: callback invoked once when idle is reached
// - onActivity: callback invoked on any tracked user activity (useful to dismiss warning modals)
const useIdleTimer = ({ timeout = 120000, onIdle, onActivity } = {}) => {
  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
    let idleTimer = null;
    let disposed = false;

    const startTimer = () => {
      clearTimeout(idleTimer);
      setIsIdle(false);
      idleTimer = setTimeout(() => {
        if (disposed) return;
        setIsIdle(true);
        onIdle && onIdle();
      }, timeout);
    };

    const handleActivity = () => {
      onActivity && onActivity();
      startTimer();
    };

    const events = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'wheel',
      'visibilitychange'
    ];

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Initialize timer
    startTimer();

    return () => {
      disposed = true;
      clearTimeout(idleTimer);
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [timeout, onIdle, onActivity]);

  // Expose a manual reset in case consumer wants explicit control
  const reset = () => {
    // Trigger a synthetic activity
    onActivity && onActivity();
  };

  return { isIdle, reset };
};

export default useIdleTimer;
