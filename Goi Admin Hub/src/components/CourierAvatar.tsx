import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
      const { data } = await supabase.storage
        .from("courier-avatars")
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      return data?.signedUrl ?? null;
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
      className={`rounded-full bg-gradient-to-br from-[#35AD29] to-emerald-600 text-white flex items-center justify-center font-extrabold shrink-0 shadow-sm ring-2 ring-white ${className}`}
    >
      {initial}
    </div>
  );
}
