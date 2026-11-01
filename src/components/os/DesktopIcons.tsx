"use client";

import { PixelIcon, type PixelIconName } from "./PixelIcon";

export interface DesktopItem {
  icon: PixelIconName;
  label: string;
  href: string;
  /** Switches the scanner window into this mode instead of only scrolling. */
  mode?: "url" | "message";
}

export const SCANNER_MODE_EVENT = "mh:mode";

export function DesktopIcons({ items, className }: { items: DesktopItem[]; className?: string }) {
  return (
    <nav className={className} aria-label="Desktop">
      {items.map((it) => (
        <a
          key={it.label}
          href={it.href}
          className="desk-icon"
          onClick={() => {
            if (it.mode) window.dispatchEvent(new CustomEvent(SCANNER_MODE_EVENT, { detail: it.mode }));
          }}
        >
          <PixelIcon name={it.icon} size={44} className="text-fg" />
          <span>{it.label}</span>
        </a>
      ))}
    </nav>
  );
}
