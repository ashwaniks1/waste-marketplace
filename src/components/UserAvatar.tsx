type UserAvatarProps = {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClass: Record<NonNullable<UserAvatarProps["size"]>, string> = {
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-base",
};

function initialsFor(name: string) {
  const source = name.trim();
  if (!source) return "WM";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function UserAvatar({ name, avatarUrl, size = "md", className = "" }: UserAvatarProps) {
  const dimensions = sizeClass[size];

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`${name} avatar`}
        className={`${dimensions} rounded-full object-cover ring-2 ring-white ${className}`}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 font-semibold text-white shadow-sm ${dimensions} ${className}`}
      aria-hidden="true"
    >
      {initialsFor(name)}
    </span>
  );
}
