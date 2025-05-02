import * as React from "react"
import { cn } from "../../lib/utils"

type VariantType = 
  | "h1" 
  | "h2" 
  | "h3" 
  | "h4" 
  | "h5" 
  | "h6" 
  | "subtitle1" 
  | "subtitle2" 
  | "body1" 
  | "body2" 
  | "caption" 
  | "overline"
  | "inherit"

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  variant?: VariantType
  component?: React.ElementType
  color?: "primary" | "secondary" | "error" | "warning" | "info" | "success" | "inherit" | "textPrimary" | "textSecondary"
  align?: "inherit" | "left" | "center" | "right" | "justify"
  noWrap?: boolean
  gutterBottom?: boolean
}

const variantMapping: Record<VariantType, React.ElementType> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  h6: "h6",
  subtitle1: "h6",
  subtitle2: "h6",
  body1: "p",
  body2: "p",
  caption: "span",
  overline: "span",
  inherit: "span",
}

const variantStyles: Record<VariantType, string> = {
  h1: "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
  h2: "scroll-m-20 text-3xl font-semibold tracking-tight",
  h3: "scroll-m-20 text-2xl font-semibold tracking-tight",
  h4: "scroll-m-20 text-xl font-semibold tracking-tight",
  h5: "scroll-m-20 text-lg font-semibold tracking-tight",
  h6: "scroll-m-20 text-base font-semibold tracking-tight",
  subtitle1: "text-lg font-medium",
  subtitle2: "text-base font-medium",
  body1: "text-base leading-7",
  body2: "text-sm leading-6",
  caption: "text-xs leading-5",
  overline: "text-xs font-medium uppercase tracking-wider",
  inherit: "",
}

const colorStyles: Record<Required<TypographyProps>["color"], string> = {
  primary: "text-primary",
  secondary: "text-secondary",
  error: "text-destructive",
  warning: "text-amber-500",
  info: "text-blue-500",
  success: "text-green-500",
  inherit: "",
  textPrimary: "text-foreground",
  textSecondary: "text-muted-foreground",
}

const alignStyles: Record<Required<TypographyProps>["align"], string> = {
  inherit: "",
  left: "text-left",
  center: "text-center",
  right: "text-right",
  justify: "text-justify",
}

const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ 
    className,
    variant = "body1",
    component,
    color = "inherit",
    align = "inherit",
    noWrap = false,
    gutterBottom = false,
    children,
    ...props 
  }, ref) => {
    const Component = component || variantMapping[variant]

    return (
      <Component
        ref={ref}
        className={cn(
          variantStyles[variant],
          colorStyles[color],
          alignStyles[align],
          noWrap && "whitespace-nowrap overflow-hidden text-ellipsis",
          gutterBottom && "mb-2",
          className
        )}
        {...props}
      >
        {children}
      </Component>
    )
  }
)

Typography.displayName = "Typography"

export { Typography }
