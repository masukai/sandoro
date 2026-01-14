import { useState, useEffect } from 'react';

/**
 * Hook to get the current time, updating every second
 * @returns Current time formatted as HH:MM
 */
export function useClock(): string {
  const [time, setTime] = useState(() => {
    const now = new Date();
    return formatTime(now);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTime(formatTime(now));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return time;
}

function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}
