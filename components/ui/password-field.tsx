"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { FormField, type FormFieldProps } from "./form-field";

export function PasswordField(
  props: Omit<FormFieldProps, "type" | "trailing">,
) {
  const [visible, setVisible] = useState(false);
  return (
    <FormField
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          disabled={props.disabled}
          onClick={() => setVisible(!visible)}
          aria-label={`${visible ? "Hide" : "Show"} ${props.label.toLowerCase()}`}
          aria-pressed={visible}
          className="absolute inset-y-0 right-1 flex w-11 items-center justify-center rounded-lg text-muted hover:text-ink"
        >
          {visible ? (
            <EyeOff size={18} aria-hidden="true" />
          ) : (
            <Eye size={18} aria-hidden="true" />
          )}
        </button>
      }
    />
  );
}
