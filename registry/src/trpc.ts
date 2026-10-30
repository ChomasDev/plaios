import { initTRPC } from "@trpc/server"
import { z } from "zod"

import { getPackage, listPackages, registryStatus } from "./registry.js"

export interface Context {
  /** Registry URL as the browser reached it, so install commands work from other machines too. */
  publicRegistryUrl: string
}

const t = initTRPC.context<Context>().create()

export const appRouter = t.router({
  registry: t.router({
    status: t.procedure.query(() => registryStatus()),
  }),
  packages: t.router({
    list: t.procedure
      .input(z.object({ search: z.string().max(100).default("") }))
      .query(({ input }) => listPackages(input.search)),
    byName: t.procedure
      .input(z.object({ name: z.string().regex(/^@[a-z0-9-]+\/[a-z0-9-]+$/) }))
      .query(({ ctx, input }) => getPackage(input.name, ctx.publicRegistryUrl)),
  }),
})

export type AppRouter = typeof appRouter
export type { CapabilityKind, PackageDetail, PackageSummary } from "./registry.js"
