import { useEffect, useState } from "react";
import { nestMe } from "@/lib/nest-auth";

export function useIsAdmin(userId: string | undefined | null) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!userId) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const me = await nestMe();
        if (cancelled) return;
        const roles = me.roles ?? [];
        setIsAdmin(roles.includes("admin") || roles.includes("manager"));
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return isAdmin;
}
