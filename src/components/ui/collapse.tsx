import * as React from "react"
import { cn } from "../../lib/utils"

interface CollapseProps extends React.HTMLAttributes<HTMLDivElement> {
  in?: boolean
  timeout?: number
  unmountOnExit?: boolean
  children: React.ReactNode
}

const Collapse = React.forwardRef<HTMLDivElement, CollapseProps>(
  ({ className, in: open = false, timeout = 300, unmountOnExit = false, children, ...props }, ref) => {
    const [height, setHeight] = React.useState<number | undefined>(undefined)
    const [isExited, setIsExited] = React.useState(!open)
    const contentRef = React.useRef<HTMLDivElement>(null)
    
    React.useEffect(() => {
      if (contentRef.current) {
        setHeight(open ? contentRef.current.scrollHeight : 0)
      }
      
      if (open) {
        setIsExited(false)
      }
      
      const timer = setTimeout(() => {
        if (!open && unmountOnExit) {
          setIsExited(true)
        }
      }, timeout)
      
      return () => {
        clearTimeout(timer)
      }
    }, [open, timeout, unmountOnExit])
    
    if (unmountOnExit && isExited) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          "overflow-hidden transition-all",
          className
        )}
        style={{
          height: height !== undefined ? `${height}px` : undefined,
          transitionDuration: `${timeout}ms`,
        }}
        {...props}
      >
        <div
          ref={contentRef}
          className="overflow-hidden"
        >
          {children}
        </div>
      </div>
    )
  }
)

Collapse.displayName = "Collapse"

export { Collapse }
