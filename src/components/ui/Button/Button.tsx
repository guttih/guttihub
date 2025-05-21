// src/components/ui/Button/Button.tsx
import { forwardRef } from "react";
import { BaseButton, BaseButtonProps } from "../BaseButton/BaseButton";

export const Button = forwardRef<HTMLButtonElement, BaseButtonProps>((props, ref) => {
  return <BaseButton ref={ref} {...props} />;
});

Button.displayName = "Button";
