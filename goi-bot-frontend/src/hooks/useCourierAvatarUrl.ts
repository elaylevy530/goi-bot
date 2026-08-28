import { useQuery } from "@tanstack/react-query";
import { nestSignedFileUrlResolved } from "@/lib/nest-files";

export function useCourierAvatarUrl(courierId?: string, avatarPath?: string | null) {
  return useQuery({
    queryKey: ["courier-avatar-signed", courierId, avatarPath],
    enabled: !!courierId && !!avatarPath,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      if (!avatarPath) return null;
      if (avatarPath.startsWith("http")) return avatarPath;
      return nestSignedFileUrlResolved("courier-avatars", avatarPath, 60 * 60 * 24 * 7);
    },
  });
}
