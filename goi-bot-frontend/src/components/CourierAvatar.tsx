import { useQuery } from "@tanstack/react-query";
import { nestSignedFileUrlResolved } from "@/lib/nest-files";

type Props = {
  path?: string | null;
  name?: string | null;
  size?: number; // px
  className?: string;
};

/**
 * Renders a courier's avatar from the private `courier-avatars` bucket
 * via a signed URL, with a colored initial fallback. Safe for use in
 * business-facing screens — only reads the avatar path stored on the
 * couriers row.
 */
export function CourierAvatar({ path, name, size = 64, className = "" }: Props) {
  const { data: url } = useQuery({
    queryKey: ["courier-avatar-signed", path],
    enabled: !!path,
    staleTime: 1000 * 60 * 60 * 6,
    queryFn: async () => {
      if (!path) return null;
      return nestSignedFileUrlResolved("courier-avatars", path, "7d");
    },
  });

  const initial = (name || "?").trim().charAt(0) || "?";
  const style = { width: size, height: size, fontSize: Math.round(size * 0.42) };

  if (url) {
    return (
      <img
        src={url}
        alt={name || "שליח"}
        style={style}
        className={`rounded-full object-cover shrink-0 ring-2 ring-white shadow-sm bg-slate-100 ${className}`}
      />
    );
  }

  return (
    <div
      style={style}
      className={`rounded-full bg-primary-deep text-primary-foreground flex items-center justify-center font-extrabold shrink-0 shadow-sm ring-2 ring-white ${className}`}
    >
      {initial}
    </div>
  );
}
