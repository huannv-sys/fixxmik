import React, { forwardRef } from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "success"
    | "danger"
    | "warning"
    | "info"
    | "light"
    | "dark"
    | "link"
    | "outline-primary"
    | "outline-secondary"
    | "outline-success"
    | "outline-danger"
    | "outline-warning"
    | "outline-info"
    | "outline-light"
    | "outline-dark"
    | "ghost";
  size?: "sm" | "md" | "lg";
}

export const buttonVariants = ({
  variant = "primary",
  size = "md",
  className = "",
}: {
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
} = {}) => {
  // Map variants to Bootstrap classes
  let variantClass = "";
  
  if (variant === "ghost") {
    variantClass = "btn-link text-body";
  } else {
    variantClass = `btn-${variant}`;
  }

  // Map sizes to Bootstrap classes
  const sizeClass = {
    sm: "btn-sm",
    md: "",
    lg: "btn-lg",
  }[size || "md"];

  return cn("btn", variantClass, sizeClass, className);
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          buttonVariants({ variant, size }),
          disabled && "disabled",
          className
        )}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";