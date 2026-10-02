import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "./auth";

/** One session lookup per request, shared by layouts, pages and tRPC. */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));
