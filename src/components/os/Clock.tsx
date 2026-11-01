"use client";

import { useEffect, useState } from "react";

/** Live clock. Renders nothing on the server to avoid a hydration mismatch. */
export function Clock({ locale, variant = "menu" }: { locale: string; variant?: "menu" | "big" }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  if (!now) return <span className={variant === "big" ? "inline-block h-[1em] w-[5ch]" : "inline-block w-[9ch]"} />;

  if (variant === "big") {
    return (
      <span className="tabular-nums">
        {now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
      </span>
    );
  }
  return (
    <span className="tabular-nums">
      {now.toLocaleDateString(locale, { weekday: "short" })} {now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}
