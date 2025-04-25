import classNames from "classnames";
import { forwardRef, ButtonHTMLAttributes } from "react";

export interface BaseButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const BaseButton = forwardRef<HTMLButtonElement, BaseButtonProps>(
  ({ children, variant = "default", size = "md", className, ...props }, ref) => {
    const base = "rounded px-3 py-1 font-medium focus:outline-none transition";

    const sizeMap = {
      sm: "text-xs",
      md: "text-sm",
      lg: "text-base",
    };

    const variantMap = {
        default: "bg-blue-600 text-white hover:bg-blue-700",
        danger: "bg-red-600 text-white hover:bg-red-700",
        secondary: "bg-gray-700 text-white hover:bg-gray-600", // 👈 New!
      };

    return (
      <button
        {...props}
        ref={ref}
        className={classNames(base, sizeMap[size], variantMap[variant], className)}
      >
        {children}
      </button>
    );
  }
);

BaseButton.displayName = "BaseButton"; // Required for React DevTools with forwardRef
