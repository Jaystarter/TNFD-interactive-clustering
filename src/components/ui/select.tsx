import * as React from "react";
import { cn } from "../../lib/utils";

import { ReactNode } from "react";
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, children, ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium mb-1">{label}</label>
      )}
      <select
        ref={ref}
        className={cn(
          "w-full border px-3 py-2 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-tnfd-green dark:focus:ring-tnfd-green transition",
          error ? "border-red-500" : "",
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && (
        <span className="text-xs text-red-500 mt-1 block">{error}</span>
      )}
    </div>
  )
);
Select.displayName = "Select";
