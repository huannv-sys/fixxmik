import React from "react";
import { Link } from "wouter";
import { cn } from "../../lib/utils";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbProps {
  className?: string;
  children: React.ReactNode;
}

interface BreadcrumbItemProps {
  className?: string;
  href?: string;
  isActive?: boolean;
  children: React.ReactNode;
}

interface PageTitleProps {
  className?: string;
  children: React.ReactNode;
}

export function Breadcrumb({ className, children }: BreadcrumbProps) {
  return (
    <nav aria-label="breadcrumb">
      <ol className={cn("breadcrumb", className)}>{children}</ol>
    </nav>
  );
}

export function BreadcrumbItem({
  className,
  href,
  isActive = false,
  children,
}: BreadcrumbItemProps) {
  const classes = cn("breadcrumb-item", isActive && "active", className);

  return (
    <li className={classes} aria-current={isActive ? "page" : undefined}>
      {href && !isActive ? <Link href={href}>{children}</Link> : children}
    </li>
  );
}

export function BreadcrumbSeparator() {
  return <ChevronRight className="mx-1" size={16} />;
}

export function PageTitle({ className, children }: PageTitleProps) {
  return <h1 className={cn("h4 mb-0", className)}>{children}</h1>;
}

// Default breadcrumb with home link
export function DefaultBreadcrumb({ currentPage }: { currentPage: string }) {
  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbItem href="/">
        <Home size={16} className="me-1" /> Home
      </BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem isActive>{currentPage}</BreadcrumbItem>
    </Breadcrumb>
  );
}
