import * as React from "react"

import { cn } from "@/utils/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  validator?: (value: string) => string | null; // returns error message or null
  showInlineError?: boolean; // whether to render inline error text (default true)
}

// Generic helper: check whether an input is required.
// Accepts either an HTMLInputElement (DOM) or InputProps (JS props).
export function isFieldRequired(arg?: HTMLInputElement | InputProps | null): boolean {
  if (!arg) return false

  // DOM element
  if (arg instanceof HTMLInputElement) {
    return arg.required === true || arg.getAttribute("aria-required") === "true" || arg.hasAttribute("data-required")
  }

  // Props object
  const props = arg as InputProps
  if (props.required === true) return true
  if (props["aria-required"] === "true") return true
  if (props["data-required"] === "true" || props["data-required"] === true) return true

  // also allow presence of a custom `required` string attribute (e.g. required="required")
  // when props might be stringly-typed
  const anyProps = props as any
  if (typeof anyProps.required === "string" && anyProps.required.length > 0) return true

  return false
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", validator, showInlineError = true, ...props }, ref) => {
    // Determine if this field should be treated as required (supports controlled / uncontrolled usage)
    const requiredFlag = isFieldRequired(props)

    // Internal error state (managed by Input when validator prop is provided)
    const [error, setError] = React.useState<string | null>(null)

    // run validator on blur (and optionally on change)
    const handleBlur: React.FocusEventHandler<HTMLInputElement> = (e) => {
      if (validator) {
        const msg = validator(e.target.value ?? "")
        setError(msg)
      }
      if (props.onBlur) props.onBlur(e)
    }

    const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
      if (validator) {
        // Clear error as user types for a better UX; you may choose to validate on each change instead
        setError(null)
      }
      if (props.onChange) props.onChange(e)
    }

    const hasError = Boolean(error) || Boolean((props as any)["data-error"])

    return (
      <div>
        <input
          // ensure native required/aria attributes consistent
          {...(requiredFlag ? { "aria-required": "true" } : {})}
          aria-invalid={hasError ? "true" : undefined}
          required={props.required ?? undefined}
          type={type}
          className={cn(
            // base styles
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            // stateful style when required to allow visual cue (override in your tailwind/theme if needed)
            requiredFlag ? "outline-none ring-2 ring-amber-200" : "",
            // error state
            hasError ? "border-red-500 focus-visible:ring-red-500" : "",
            className
          )}
          ref={ref}
          {...props}
          onBlur={handleBlur}
          onChange={handleChange}
        />
        {showInlineError && error && (
          <p className="mt-1 text-xs text-red-600" role="alert" aria-live="polite">{error}</p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }