import * as React from "react"
import { cn } from "../../lib/utils"

interface BoxProps extends React.HTMLAttributes<HTMLDivElement> {
  sx?: React.CSSProperties
}

const Box = React.forwardRef<HTMLDivElement, BoxProps>(
  ({ className, sx, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(className)}
        style={sx}
        {...props}
      />
    )
  }
)

Box.displayName = "Box"

export { Box }
