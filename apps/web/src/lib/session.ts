import { Auth } from "@/generated/auth/auth";
import type { MeResponse } from "@/generated/model";
import { isUnauthorized } from "@/mutator";
import { query } from "@solidjs/router";
import { createMemo } from "solid-js";

export type Session =
  | { status: "signed-in"; user: MeResponse }
  | { status: "signed-out" }
  | { status: "unavailable"; error: unknown };

/**
 * `/auth/me` as a session state instead of a thrown error: a 401 is the normal signed-out answer,
 * any other failure means the session could not be read. On the server the mutator forwards the
 * browser's cookies, so the first render already knows who is signed in.
 */
export const getSession = query(async (): Promise<Session> => {
  try {
    return { status: "signed-in", user: await Auth.currentUser() };
  } catch (error) {
    return isUnauthorized(error) ? { status: "signed-out" } : { status: "unavailable", error };
  }
}, "session");

/** The session as an async memo. Read it under a `<Loading>` boundary. */
export function useSession() {
  return createMemo(() => getSession());
}

/** The signed-in user, or undefined. */
export function signedIn(session: Session): MeResponse | undefined {
  return session.status === "signed-in" ? session.user : undefined;
}
