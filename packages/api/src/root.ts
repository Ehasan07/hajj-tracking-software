import { publicProcedure, router } from "./trpc";
import { tenantRouter } from "./routers/tenant";

export const appRouter = router({
  health: publicProcedure.query(() => ({ ok: true, at: new Date() })),
  tenant: tenantRouter,
});

export type AppRouter = typeof appRouter;
