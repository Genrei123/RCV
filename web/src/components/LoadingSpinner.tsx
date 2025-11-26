type SpinnerSize = "sm" | "md" | "lg";

export interface LoadingSpinnerProps {
  size?: SpinnerSize;
  showText?: boolean;
  text?: string;
  className?: string;
}

// Optional revert: set VITE_SPINNER_VARIANT=line in .env to use old style
const spinnerVariant = (
  import.meta.env.VITE_SPINNER_VARIANT || "ring"
).toLowerCase();

const sizeClass: Record<
  SpinnerSize,
  { box: string; ring: string; line: string }
> = {
  sm: { box: "h-4 w-4", ring: "border-2", line: "border-b-2" },
  md: { box: "h-10 w-10", ring: "border-4", line: "border-b-2" },
  lg: { box: "h-12 w-12", ring: "border-4", line: "border-b-2" },
};

export function LoadingSpinner({
  size = "md",
  showText = true,
  text = "Loading...",
  className = "",
}: LoadingSpinnerProps) {
  const sc = sizeClass[size];

  const spinner =
    spinnerVariant === "line" ? (
      <div
        className={`animate-spin ${sc.box} ${sc.line} border-[color:var(--app-primary)] ${className}`}
      />
    ) : (
      <div
        className={`animate-spin ${sc.box} ${sc.ring} rounded-full border-[color:var(--app-border)] border-t-[color:var(--app-primary)] ${className}`}
      />
    );

  return (
    <div className="flex flex-col items-center justify-center">
      {spinner}
      {showText && <p className="app-text-subtle mt-3">{text}</p>}
    </div>
  );
}

export default LoadingSpinner;
