import * as React from "react"
import { cn } from "../../lib/utils"

interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical"
  flexItem?: boolean
  variant?: "fullWidth" | "inset" | "middle"
}

const Divider = React.forwardRef<HTMLDivElement, DividerProps>(
  ({ 
    className, 
    orientation = "horizontal", 
    flexItem = false,
    variant = "fullWidth",
    ...props 
  }, ref) => {
    const variantClasses = {
      fullWidth: "",
      inset: "mx-4",
      middle: "mx-2",
    }
    
    return (
      <div
        ref={ref}
        className={cn(
          orientation === "horizontal" 
            ? "w-full border-t border-border" 
            : "h-full border-l border-border",
          flexItem && "flex-shrink-0",
          variantClasses[variant],
          className
        )}
        {...props}
      />
    )
  }
)

Divider.displayName = "Divider"

export { Divider }
