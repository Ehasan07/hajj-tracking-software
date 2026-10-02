import "server-only";
import { appRouter, createCallerFactory, createContext } from "@hajj/api";
import { getSession } from "@/server/session";

const createCaller = createCallerFactory(appRouter);

/** Call procedures directly from Server Components, no HTTP hop. */
export async function api() {
  const result = await getSession();
  return createCaller(
    createContext({
      session: result
        ? { userId: result.user.id, activeOrganizationId: result.session.activeOrganizationId ?? null }
        : null,
    }),
  );
}
