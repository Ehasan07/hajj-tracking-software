import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter, createContext, describeError, errorRef } from "@hajj/api";
import { auth } from "@/server/auth";
import { clientIp } from "@/server/client-ip";

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
        ip: clientIp(req.headers),
      });
    },
    onError({ error, path }) {
      if (error.code === "INTERNAL_SERVER_ERROR") console.error(`[trpc] ${path} ref=${errorRef(error)} ${describeError(error)}`);
    },
  });
}

export { handler as GET, handler as POST };
