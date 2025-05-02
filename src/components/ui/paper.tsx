import * as React from "react"
import { cn } from "../../lib/utils"

interface PaperProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: number
  square?: boolean
  variant?: "elevation" | "outlined"
}

const Paper = React.forwardRef<HTMLDivElement, PaperProps>(
  ({ 
    className, 
    elevation = 1, 
    square = false,
    variant = "elevation",
    ...props 
  }, ref) => {
    const elevationClasses = {
      0: "shadow-none",
      1: "shadow-sm",
      2: "shadow",
      3: "shadow-md",
      4: "shadow-lg",
      5: "shadow-xl",
      6: "shadow-2xl"
    }
    
    // Limit elevation to 0-6 range
    const safeElevation = Math.max(0, Math.min(6, elevation)) as 0 | 1 | 2 | 3 | 4 | 5 | 6
    
    return (
      <div
        ref={ref}
        className={cn(
          "bg-card text-card-foreground",
          variant === "outlined" ? "border border-border" : elevationClasses[safeElevation],
          !square && "rounded-md",
          className
        )}
        {...props}
      />
    )
  }
)

Paper.displayName = "Paper"

export { Paper }
