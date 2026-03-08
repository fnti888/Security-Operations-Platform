import { useEffect, useState, useRef } from 'react';

interface AnimatedCounterProps {
  value: number;
  className?: string;
  suffix?: string;
}

export function AnimatedCounter({ value, className = '', suffix = '' }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (value !== prevValueRef.current) {
      setIsAnimating(true);

      const start = prevValueRef.current;
      const end = value;
      const duration = 400;
      const startTime = Date.now();

      const animate = () => {
        const now = Date.now();
        const progress = Math.min((now - startTime) / duration, 1);

        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + (end - start) * easeOut);

        setDisplayValue(current);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
          prevValueRef.current = value;
        }
      };

      requestAnimationFrame(animate);
    }
  }, [value]);

  return (
    <span
      className={`${className} ${isAnimating ? 'scale-110' : ''} transition-all duration-200 inline-block tabular-nums`}
      style={{
        textShadow: isAnimating
          ? '0 0 10px currentColor, 0 0 20px currentColor'
          : '0 0 5px currentColor',
        filter: isAnimating ? 'brightness(1.3)' : 'brightness(1)',
      }}
    >
      {displayValue.toLocaleString()}{suffix}
    </span>
  );
}
