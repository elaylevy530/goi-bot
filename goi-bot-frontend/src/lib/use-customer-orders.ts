import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyOrdersFn } from "@/lib/customer-account.functions";
import { getGuestOrdersFn } from "@/lib/guest-order.functions";
import { useGuestSession } from "@/lib/guest-session";

export type CustomerOrderRow = {
  id: string;
  job_number: string;
  status: string;
  service_category?: string | null;
  pickup_address: string | null;
  dropoff_address: string | null;
  customer_price: number | null;
  created_at: string;
  recipient_tracking_token: string | null;
  description?: string | null;
  job_date?: string | null;
  job_time?: string | null;
  pricing_type?: string | null;
  selected_courier_id?: string | null;
  selected_quote_id?: string | null;
  quotes_count?: number;
};

/**
 * One list of orders for both audiences: registered customers (matched by
 * phone on the server) and guests (matched by the tracking tokens stored
 * locally when they ordered).
 */
export function useCustomerOrders() {
  const { loading, isGuest, orders: refs } = useGuestSession();
  const getMine = useServerFn(getMyOrdersFn);
  const getGuest = useServerFn(getGuestOrdersFn);

  const refKey = useMemo(() => refs.map((r) => r.job_id).join(","), [refs]);

  const query = useQuery({
    queryKey: ["my-orders", isGuest ? "guest" : "auth", isGuest ? refKey : ""],
    enabled: !loading,
    queryFn: async () => {
      if (!isGuest) return (await getMine()) as unknown as CustomerOrderRow[];
      if (refs.length === 0) return [] as CustomerOrderRow[];
      return (await getGuest({
        data: { refs: refs.map(({ job_id, tracking_token }) => ({ job_id, tracking_token })) },
      })) as unknown as CustomerOrderRow[];
    },
  });

  return {
    orders: (query.data ?? []) as CustomerOrderRow[],
    isLoading: loading || query.isLoading,
    isGuest,
    refetch: query.refetch,
  };
}
