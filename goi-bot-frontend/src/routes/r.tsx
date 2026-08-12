import { createFileRoute } from "@tanstack/react-router";
import { partnersUrl, redirectToPartnersWithSession } from "@/lib/partners-redirect";
import { getNestAccessToken } from "@/lib/nest-auth";

export const Route = createFileRoute("/r")({
  ssr: false,
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      if (getNestAccessToken()) {
        redirectToPartnersWithSession("/join");
      } else {
        window.location.replace(partnersUrl("/join"));
      }
    }
  },
  component: PartnersRedirectPage,
});

function PartnersRedirectPage() {
  const href = partnersUrl("/join");
  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md text-center space-y-3">
        <p className="text-sm text-muted-foreground">העמוד הועבר לאפליקציית השותפים (goi-partners).</p>
        <a href={href} className="text-primary font-bold underline">המשך לאפליקציית השותפים</a>
      </div>
    </div>
  );
}
