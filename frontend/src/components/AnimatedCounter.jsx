import React, { useEffect, useRef, useState } from "react";

export default function AnimatedCounter({ value, duration = 1000, suffix = "", prefix = "" }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(null);
  const rafRef = useRef(null);
  const targetRef = useRef(0);

  useEffect(() => {
    const target = parseFloat(value) || 0;
    targetRef.current = target;
    const startVal = display;
    startRef.current = null;

    const step = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (target - startVal) * eased;
      setDisplay(Number.isInteger(target) ? Math.round(current) : parseFloat(current.toFixed(1)));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return (
    <span>
      {prefix}{display}{suffix}
    </span>
  );
}
