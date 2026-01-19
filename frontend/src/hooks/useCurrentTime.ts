import { useState, useEffect } from "react";

export function useCurrentTime(interval: number = 1000) {
  const [currentTime, setCurrentTime] = useState(() => BigInt(Math.floor(Date.now() / 1000)));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(BigInt(Math.floor(Date.now() / 1000)));
    }, interval);

    return () => clearInterval(timer);
  }, [interval]);

  return currentTime;
}
