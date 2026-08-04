import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { RouteErrorBoundary } from "./components/RouteErrorBoundary";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: 10_000,
        placeholderData: (prev: unknown) => prev,
        retry: (failureCount: number, err: unknown) => {
          // Don't retry 4xx; retry network/5xx once.
          const status = (err as { status?: number })?.status;
          if (status && status >= 400 && status < 500) return false;
          return failureCount < 1;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: RouteErrorBoundary,
  });

  return router;
};
