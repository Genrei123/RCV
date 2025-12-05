interface ProfileCardProps {
  name: string;
  role: string;
  imageUrl?: string;
  backgroundColor?: string;
  variant?: "person" | "logo";
  className?: string;
}

export function ProfileCard({
  name,
  role,
  imageUrl,
  backgroundColor = "app-bg-primary",
  variant = "person",
  className = "",
}: ProfileCardProps) {
  return (
    <div
      className={`relative w-full aspect-[3/4] overflow-hidden rounded-xl shadow-lg ${className}`}
    >
      {/* Foreground person image when provided */}
      {variant === "person" && imageUrl && (
        <img
          src={imageUrl}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover object-top"
        />
      )}

      {/* Foreground gradient to highlight captions */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[var(--app-primary)]/90 via-[var(--app-primary)]/40 to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
        <h3 className="font-bold text-base sm:text-lg md:text-xl leading-tight">
          {name}
        </h3>
        <p className="text-[11px] sm:text-xs opacity-90">{role}</p>
      </div>
    </div>
  );  
}
