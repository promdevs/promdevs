import type { ButtonHTMLAttributes } from "react";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      prom<span style={{ color: "#2563eb" }}>devs</span>
    </span>
  );
}

export function Button({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`button ${className}`} {...props} />;
}
