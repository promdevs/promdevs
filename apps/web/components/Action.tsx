"use client";

import Link from "next/link";
import { ArrowUpRight, LoaderCircle } from "lucide-react";
import type {
  ButtonHTMLAttributes,
  FocusEvent,
  MouseEventHandler,
  PointerEvent,
} from "react";
import { Button } from "@/components/ui/button";

function setOrigin(event: PointerEvent<HTMLElement> | FocusEvent<HTMLElement>) {
  const element = event.currentTarget;
  const pointer =
    "pointerType" in event &&
    event.pointerType !== "touch" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const rect = pointer ? element.getBoundingClientRect() : null;
  element.style.setProperty(
    "--ink-x",
    rect && "clientX" in event ? `${event.clientX - rect.left}px` : "50%",
  );
  element.style.setProperty(
    "--ink-y",
    rect && "clientY" in event ? `${event.clientY - rect.top}px` : "50%",
  );
}

function ActionContent({
  label,
  loading = false,
  opensNewTab = false,
  showArrow = true,
}: {
  label: string;
  loading?: boolean;
  opensNewTab?: boolean;
  showArrow?: boolean;
}) {
  const face = (filled: boolean) => (
    <span
      className={
        filled ? "action-face action-filled" : "action-face action-base"
      }
      aria-hidden="true"
    >
      <span className="action-label-window">
        <span className="action-label-track">
          <span>{label}</span>
          <span>{label}</span>
        </span>
      </span>
      {showArrow && (
        <span className="action-arrow-window">
          {loading ? (
            <LoaderCircle className="animate-spin" size={18} />
          ) : (
            <>
              <ArrowUpRight className="action-arrow-first" size={18} />
              <ArrowUpRight className="action-arrow-next" size={18} />
            </>
          )}
        </span>
      )}
    </span>
  );
  return (
    <>
      <span className="sr-only">
        {label}
        {opensNewTab && " (opens in a new tab)"}
      </span>
      {face(false)}
      {face(true)}
    </>
  );
}

export function ActionLink({
  href,
  label,
  variant = "primary",
  className = "",
  onClick,
  newTab = false,
  showArrow = true,
  current = false,
  prefetch,
}: {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  newTab?: boolean;
  showArrow?: boolean;
  current?: boolean;
  prefetch?: boolean;
}) {
  return (
    <Link
      href={href}
      target={newTab ? "_blank" : undefined}
      rel={newTab ? "noopener noreferrer" : undefined}
      prefetch={newTab ? false : prefetch}
      aria-current={current ? "true" : undefined}
      className={`action action-${variant} ${className}`}
      onClick={onClick}
      onPointerEnter={setOrigin}
      onFocus={setOrigin}
    >
      <ActionContent label={label} opensNewTab={newTab} showArrow={showArrow} />
    </Link>
  );
}

export function ActionButton({
  label,
  loading = false,
  className = "",
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label: string;
  loading?: boolean;
}) {
  return (
    <Button
      {...props}
      variant="ghost"
      className={`action action-primary ${className}`}
      onPointerEnter={setOrigin}
      onFocus={setOrigin}
    >
      <ActionContent label={label} loading={loading} />
    </Button>
  );
}
