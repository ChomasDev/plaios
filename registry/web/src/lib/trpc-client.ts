import { createTRPCClient, httpBatchLink } from "@trpc/client"
import type { AppRouter } from "@api"

// The store API is served by the registry itself, on the same origin as this page.
export const trpc = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: `${window.location.origin}/-/store/trpc` })],
})
