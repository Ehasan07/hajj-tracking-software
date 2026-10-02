import { publicProcedure, router } from "./trpc";
import { articlesRouter } from "./routers/articles";
import { inquiriesRouter } from "./routers/inquiries";
import { packagesRouter } from "./routers/packages";
import { paymentsRouter } from "./routers/payments";
import { pilgrimsRouter } from "./routers/pilgrims";
import { tenantRouter } from "./routers/tenant";

export const appRouter = router({
  health: publicProcedure.query(() => ({ ok: true, at: new Date() })),
  tenant: tenantRouter,
  packages: packagesRouter,
  inquiries: inquiriesRouter,
  pilgrims: pilgrimsRouter,
  payments: paymentsRouter,
  articles: articlesRouter,
});

export type AppRouter = typeof appRouter;
