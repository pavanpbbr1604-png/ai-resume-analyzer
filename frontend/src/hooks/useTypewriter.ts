import { useState, useEffect } from 'react';

interface UseTypewriterOptions {
  text: string;
  speed?: number;
  startDelay?: number;
}

export function useTypewriter({ text, speed = 38, startDelay = 600 }: UseTypewriterOptions) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);

    let currentIndex = 0;
    let timer: number | undefined;

    const delayTimer = window.setTimeout(() => {
      timer = window.setInterval(() => {
        if (currentIndex < text.length) {
          currentIndex++;
          setDisplayed(text.slice(0, currentIndex));
        } else {
          setDone(true);
          window.clearInterval(timer);
        }
      }, speed);
    }, startDelay);

    return () => {
      window.clearTimeout(delayTimer);
      if (timer) window.clearInterval(timer);
    };
  }, [text, speed, startDelay]);

  return { displayed, done };
}
