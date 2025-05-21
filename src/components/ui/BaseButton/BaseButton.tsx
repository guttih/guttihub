import classNames from "classnames";
import { forwardRef, ButtonHTMLAttributes } from "react";

export interface BaseButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "danger"| "warning" | "important" | "success" | "secondary" | "darker";
    size?: "sm" | "md" | "lg";
    className?: string;
  }
  

export const BaseButton = forwardRef<HTMLButtonElement, BaseButtonProps>(
  ({ children, variant = "default", size = "md", className, ...props }, ref) => {
    const base = "rounded px-3 py-1 font-medium focus:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed";


    const sizeMap = {
      sm: "text-xs",
      md: "text-sm",
      lg: "text-base",
    };

    const variantMap = {
        default: "bg-gray-700 text-white hover:bg-gray-600", 
        important: "bg-blue-600 text-white hover:bg-blue-700",
        danger: "bg-red-600 text-white hover:bg-red-700",
        success: "bg-green-600 text-white hover:bg-green-700",
        secondary: "bg-gray-500 text-white hover:bg-gray-400",
        warning: "bg-yellow-600 text-white hover:bg-yellow-700",
        darker: "bg-gray-800 text-white border border-gray-600 hover:bg-gray-700",
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
