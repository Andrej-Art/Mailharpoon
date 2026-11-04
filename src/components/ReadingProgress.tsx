"use client";

import { useEffect, useState } from "react";

/** A thin bar under the header that fills as the article is read. */
export function ReadingProgress({ target }: { target: string }) {
  const [p, setP] = useState(0);
  useEffect(() => {
    const el = document.getElementById(target);
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      setP(total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [target]);
  return (
    <div className="fixed inset-x-0 top-[46px] z-40 h-1 bg-transparent" aria-hidden>
      <div className="neon-bar h-full origin-left" style={{ transform: `scaleX(${p})` }} />
    </div>
  );
}
