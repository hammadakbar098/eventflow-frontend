"use client";

import { Check, Circle } from "lucide-react";
import { useWatch, type Control } from "react-hook-form";
import {
  passwordRequirements,
  type SignupFormValues,
} from "@/features/auth/schemas/auth.schema";
import { cn } from "@/utils/cn";

export function PasswordRequirements({
  control,
}: {
  control: Control<SignupFormValues>;
}) {
  const password = useWatch({ control, name: "password", defaultValue: "" });
  const fulfilledCount = passwordRequirements.filter(({ test }) =>
    test(password),
  ).length;

  return (
    <div className="pt-1">
      <ul className="grid gap-x-3 gap-y-1.5 min-[400px]:grid-cols-2">
        {passwordRequirements.map(({ label, test }) => {
          const fulfilled = test(password);
          const Icon = fulfilled ? Check : Circle;

          return (
            <li
              key={label}
              className={cn(
                "flex items-center gap-2",
                fulfilled && "text-success",
              )}
            >
              <Icon size={12} className="shrink-0" aria-hidden="true" />
              <span className="sr-only">
                {fulfilled ? "Met: " : "Required: "}
              </span>
              {label}
            </li>
          );
        })}
      </ul>
      <span role="status" className="sr-only">
        {password.length > 0
          ? `${fulfilledCount} of ${passwordRequirements.length} password requirements met.`
          : ""}
      </span>
    </div>
  );
}
