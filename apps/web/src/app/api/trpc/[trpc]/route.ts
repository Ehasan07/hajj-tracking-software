import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter, createContext } from "@hajj/api";
import { auth } from "@/server/auth";

async function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => {
      const result = await auth.api.getSession({ headers: req.headers });
      return createContext({
        session: result
          ? { userId: result.user.id, activeOrganizationId: result.session.activeOrganizationId ?? null }
          : null,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      });
    },
    onError({ error, path }) {
      if (error.code === "INTERNAL_SERVER_ERROR") console.error(`[trpc] ${path}`, error);
    },
  });
}

export { handler as GET, handler as POST };
