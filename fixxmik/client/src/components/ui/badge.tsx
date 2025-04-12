import React from "react";
import { cn } from "../../lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "success" | "danger" | "warning" | "info";
  size?: "sm" | "md" | "lg";
}

export function Badge({
  className,
  variant = "default",
  size = "md",
  ...props
}: BadgeProps) {
  // Map variants to Bootstrap classes
  const variantClass = {
    default: "bg-primary text-white",
    secondary: "bg-secondary text-white",
    success: "bg-success text-white",
    danger: "bg-danger text-white",
    warning: "bg-warning text-dark",
    info: "bg-info text-dark",
  }[variant];

  // Map sizes to Bootstrap classes
  const sizeClass = {
    sm: "badge-sm",
    md: "",
    lg: "badge-lg",
  }[size];

  return (
    <span
      className={cn(
        "badge d-inline-flex align-items-center",
        variantClass,
        sizeClass,
        className,
      )}
      {...props}
    />
  );
}
