import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { getPartnerBySlugFn } from "@/lib/partners.functions";

export const Route = createFileRoute("/p/$slug")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "פאנל הזמנות הובלה" },
      {
        name: "description",
        content: "שדרו הזמנת הובלה למאגר המובילים תוך פחות מדקה.",
      },
      { property: "og:title", content: "פאנל הזמנות הובלה" },
      {
        property: "og:description",
        content: "שדרו הזמנת הובלה למאגר המובילים תוך פחות מדקה.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PartnerPanel,
});

function PartnerPanel() {
  const { slug } = Route.useParams();
  const getPartner = useServerFn(getPartnerBySlugFn);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["partner-public", slug],
    queryFn: () => getPartner({ data: { slug } }),
  });

  if (isLoading) {
    return (
      <div dir="rtl" className="min-h-dvh grid place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div dir="rtl" className="min-h-dvh grid place-items-center p-6 text-center">
        <div className="space-y-2">
          <p className="font-bold text-lg">הפאנל לא נמצא</p>
          <p className="text-sm text-muted-foreground">
            ייתכן שהקישור שגוי או שהשותף אינו פעיל כרגע.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Navigate to="/customer/new-order" search={{ guest: "1", p: slug }} replace />
  );
}
