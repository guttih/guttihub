// src/components/ui/Card/Card.tsx

import { ReactNode } from "react";
import classNames from "classnames";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={classNames(
        "bg-gray-800 border border-gray-700 rounded-2xl shadow-sm p-4",
        className
      )}
    >
      {children}
    </div>
  );
}
