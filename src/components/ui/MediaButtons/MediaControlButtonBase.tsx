import { ButtonHTMLAttributes } from "react";
import classNames from "classnames";

interface MediaControlButtonBaseProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  bgColor?: string;
  ringColor?: string;
  className?: string;
}

export function MediaControlButtonBase({
  children,
  bgColor = "bg-white/10",
  ringColor = "ring-white/20",
  className,
  ...props
}: MediaControlButtonBaseProps) {
  return (
    <button
      {...props}
      className={classNames(
        "w-10 h-10 flex items-center justify-center rounded-full text-white shadow-md transition-all duration-300",
        bgColor,
        `ring-2 ${ringColor}`,
        props.disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  );
}
