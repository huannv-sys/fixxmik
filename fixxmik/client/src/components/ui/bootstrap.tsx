import React, { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark' | 'link' | 'outline-primary' | 'outline-secondary' | 'outline-success' | 'outline-danger' | 'outline-warning' | 'outline-info' | 'outline-light' | 'outline-dark';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  active?: boolean;
  type?: 'button' | 'submit' | 'reset';
  children: ReactNode;
  className?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size,
  disabled = false,
  active = false,
  type = 'button',
  children,
  className = '',
  ...props
}, ref) => {
  const baseClass = 'btn';
  const variantClass = `btn-${variant}`;
  const sizeClass = size ? `btn-${size}` : '';
  const activeClass = active ? 'active' : '';
  
  const classes = [
    baseClass,
    variantClass,
    sizeClass,
    activeClass,
    className
  ].filter(Boolean).join(' ');
  
  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> & {
  Header: React.FC<CardProps>;
  Body: React.FC<CardProps>;
  Footer: React.FC<CardProps>;
  Title: React.FC<CardProps>;
  Text: React.FC<CardProps>;
} = ({ children, className = '' }) => {
  return (
    <div className={`card ${className}`}>
      {children}
    </div>
  );
};

Card.Header = ({ children, className = '' }) => {
  return (
    <div className={`card-header ${className}`}>
      {children}
    </div>
  );
};

Card.Body = ({ children, className = '' }) => {
  return (
    <div className={`card-body ${className}`}>
      {children}
    </div>
  );
};

Card.Footer = ({ children, className = '' }) => {
  return (
    <div className={`card-footer ${className}`}>
      {children}
    </div>
  );
};

Card.Title = ({ children, className = '' }) => {
  return (
    <h5 className={`card-title ${className}`}>
      {children}
    </h5>
  );
};

Card.Text = ({ children, className = '' }) => {
  return (
    <p className={`card-text ${className}`}>
      {children}
    </p>
  );
};

interface AlertProps {
  variant: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';
  children: ReactNode;
  className?: string;
  dismissible?: boolean;
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({
  variant,
  children,
  className = '',
  dismissible = false,
  onClose
}) => {
  const baseClass = 'alert';
  const variantClass = `alert-${variant}`;
  const dismissibleClass = dismissible ? 'alert-dismissible fade show' : '';
  
  const classes = [
    baseClass,
    variantClass,
    dismissibleClass,
    className
  ].filter(Boolean).join(' ');
  
  return (
    <div className={classes} role="alert">
      {children}
      {dismissible && onClose && (
        <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
      )}
    </div>
  );
};

interface BadgeProps {
  variant: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';
  children: ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant,
  children,
  className = ''
}) => {
  const baseClass = 'badge';
  const variantClass = `bg-${variant}`;
  
  const classes = [
    baseClass,
    variantClass,
    className
  ].filter(Boolean).join(' ');
  
  return (
    <span className={classes}>
      {children}
    </span>
  );
};

interface SpinnerProps {
  animation: 'border' | 'grow';
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';
  size?: 'sm';
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  animation,
  variant = 'primary',
  size,
  className = ''
}) => {
  const baseClass = `spinner-${animation}`;
  const variantClass = `text-${variant}`;
  const sizeClass = size ? `spinner-${animation}-${size}` : '';
  
  const classes = [
    baseClass,
    variantClass,
    sizeClass,
    className
  ].filter(Boolean).join(' ');
  
  return (
    <div className={classes} role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
  );
};

interface BreadcrumbProps {
  children: ReactNode;
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> & {
  Item: React.FC<BreadcrumbItemProps>;
} = ({ children, className = '' }) => {
  return (
    <nav aria-label="breadcrumb">
      <ol className={`breadcrumb ${className}`}>
        {children}
      </ol>
    </nav>
  );
};

interface BreadcrumbItemProps {
  active?: boolean;
  children: ReactNode;
  className?: string;
  href?: string;
}

Breadcrumb.Item = ({ active = false, children, className = '', href }) => {
  const classes = `breadcrumb-item ${active ? 'active' : ''} ${className}`.trim();
  
  return (
    <li className={classes} aria-current={active ? 'page' : undefined}>
      {href && !active ? (
        <a href={href}>{children}</a>
      ) : (
        children
      )}
    </li>
  );
};

export default {
  Button,
  Card,
  Alert,
  Badge,
  Spinner,
  Breadcrumb
};