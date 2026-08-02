import { useQuery } from "@tanstack/react-query";
import { nestSignedFileUrlResolved } from "@/lib/nest-files";

type Props = {
  path?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
};

/**
 * Business logo from private `business-logos` bucket via signed URL,
 * with initial fallback. Used on courier-facing offer cards.
 */
export function BusinessLogo({ path, name, size = 48, className = "" }: Props) {
  const { data: url } = useQuery({
    queryKey: ["business-logo-signed", path],
    enabled: !!path,
    staleTime: 1000 * 60 * 60 * 6,
    queryFn: async () => {
      if (!path) return null;
      return nestSignedFileUrlResolved("business-logos", path, "24h");
    },
  });

  const initial = (name || "?").trim().charAt(0) || "?";
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) };

  if (url) {
    return (
      <img
        src={url}
        alt={name || "עסק"}
        style={style}
        className={`rounded-full object-cover shrink-0 ring-1 ring-slate-200 border-2 border-white shadow-md bg-white ${className}`}
      />
    );
  }

  return (
    <div
      style={style}
      className={`rounded-full bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-white shadow-md ring-1 ring-slate-200 flex items-center justify-center font-extrabold text-[#35AD29] shrink-0 ${className}`}
    >
      {initial}
    </div>
  );
}
