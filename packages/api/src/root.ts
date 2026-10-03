import { publicProcedure, router } from "./trpc";
import { articlesRouter } from "./routers/articles";
import { documentsRouter } from "./routers/documents";
import { hotelsRouter } from "./routers/hotels";
import { inquiriesRouter } from "./routers/inquiries";
import { packagesRouter } from "./routers/packages";
import { payrollRouter } from "./routers/payroll";
import { paymentsRouter } from "./routers/payments";
import { pilgrimsRouter } from "./routers/pilgrims";
import { platformRouter } from "./routers/platform";
import { sacredRouter } from "./routers/sacred";
import { shopRouter } from "./routers/shop";
import { expensesRouter, statementsRouter } from "./routers/statements";
import { teamRouter } from "./routers/team";
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
  shop: shopRouter,
  statements: statementsRouter,
  expenses: expensesRouter,
  payroll: payrollRouter,
  hotels: hotelsRouter,
  team: teamRouter,
});

export type AppRouter = typeof appRouter;
