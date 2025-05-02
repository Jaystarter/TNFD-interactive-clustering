"use client"

// Removed unused React hooks import
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"

// Removed conflicting local type definition
// type ThemeProviderProps = {
//   children: React.ReactNode
// }

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
