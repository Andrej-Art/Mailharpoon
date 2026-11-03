"use client";

import clsx from "clsx";
import { useEffect, useRef, useState, type ReactNode } from "react";

const FADE = "2.5rem";

/** A list of fixed height that scrolls on its own; it fades out at an edge with more items behind it. */
export function ScrollList({ children, label, className }: { children: ReactNode; label: string; className?: string }) {
  const ref = useRef<HTMLOListElement>(null);
  const [edges, setEdges] = useState({ top: false, bottom: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setEdges({ top: el.scrollTop > 1, bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 1 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  const mask = `linear-gradient(to bottom, ${edges.top ? "transparent" : "#000"}, #000 ${FADE}, #000 calc(100% - ${FADE}), ${edges.bottom ? "transparent" : "#000"})`;
  return (
    <ol
      ref={ref}
      // Focusable, so the list can be scrolled with the keyboard as well.
      tabIndex={0}
      aria-label={label}
      className={clsx("overflow-y-auto overscroll-contain outline-none [scrollbar-color:var(--color-line-strong)_transparent] [scrollbar-width:thin] focus-visible:ring-1 focus-visible:ring-harpoon", className)}
      style={{ maskImage: mask, WebkitMaskImage: mask }}
    >
      {children}
    </ol>
  );
}
