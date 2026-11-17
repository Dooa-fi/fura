// lib/route.ts
// Every API route is wrapped in handler(). It does the same 3 boring things for all of them:
//   1. checks the person is signed in (Clerk),
//   2. loads their row from the database,
//   3. turns any crash into a clean JSON error the page can show.

import { auth } from "@clerk/nextjs/server";
import { getCreator } from "./db";

type Creator = Awaited<ReturnType<typeof getCreator>>;

export function handler(work: (creator: Creator, req: Request) => Promise<Response>) {
  return async (req: Request) => {
    try {
      const { userId } = await auth();
      if (!userId) return Response.json({ error: "Please sign in first." }, { status: 401 });

      const creator = await getCreator(userId);
      return await work(creator, req);
    } catch (err: any) {
      console.error(err);
      return Response.json({ error: err?.message || "Something went wrong." }, { status: 500 });
    }
  };
}

// Small helper so routes can say: return fail("Topic is required")
export function fail(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
