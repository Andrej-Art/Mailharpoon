import clsx from "clsx";
import type { ReactNode } from "react";

/** Classic desktop window: striped title bar with close and zoom boxes. */
export function Window({
  title,
  children,
  className,
  bodyClassName,
  id,
  as: Tag = "section",
  labelledBy,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
  as?: "section" | "div" | "article" | "aside";
  labelledBy?: string;
}) {
  return (
    <Tag id={id} className={clsx("win scroll-mt-14", className)} aria-labelledby={labelledBy}>
      <div className="win-bar" aria-hidden>
        <span className="win-box left-2" />
        <span className="win-title">{title}</span>
        <span className="win-box right-2">
          <span className="absolute inset-[2px] border border-chrome" />
        </span>
      </div>
      <div className={clsx("p-4 sm:p-8", bodyClassName)}>{children}</div>
    </Tag>
  );
}
