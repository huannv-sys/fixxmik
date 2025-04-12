import React from "react";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  color?:
    | "primary"
    | "secondary"
    | "success"
    | "danger"
    | "warning"
    | "info"
    | "light"
    | "dark";
  className?: string;
}

export function Spinner({
  size = "md",
  color = "primary",
  className = "",
}: SpinnerProps) {
  // Determine spinner size
  const sizeClass =
    size === "sm"
      ? "spinner-border-sm"
      : size === "lg"
        ? "spinner-border-lg"
        : "";

  // Combine classes
  const classes =
    `spinner-border text-${color} ${sizeClass} ${className}`.trim();

  return (
    <div className={classes} role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
  );
}
