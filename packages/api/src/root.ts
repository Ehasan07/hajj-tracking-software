import { publicProcedure, router } from "./trpc";
import { articlesRouter } from "./routers/articles";
import { documentsRouter } from "./routers/documents";
import { inquiriesRouter } from "./routers/inquiries";
import { packagesRouter } from "./routers/packages";
import { paymentsRouter } from "./routers/payments";
import { pilgrimsRouter } from "./routers/pilgrims";
import { platformRouter } from "./routers/platform";
import { sacredRouter } from "./routers/sacred";
import { tenantRouter } from "./routers/tenant";

export const appRouter = router({
  health: publicProcedure.query(() => ({ ok: true, at: new Date() })),
  tenant: tenantRouter,
  packages: packagesRouter,
  inquiries: inquiriesRouter,
  pilgrims: pilgrimsRouter,
  documents: documentsRouter,
  payments: paymentsRouter,
  articles: articlesRouter,
  sacred: sacredRouter,
  platform: platformRouter,
});

export type AppRouter = typeof appRouter;
