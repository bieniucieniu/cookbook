import type { currentUserResponse } from "@/generated/auth/auth";
import type { MeResponse } from "@/generated/model";
import { settledData } from "./query";

/** The signed-in user from the `useCurrentUser` query, or undefined. Never suspends. */
export function signedIn(session: {
  isSuccess: boolean;
  data: currentUserResponse | undefined;
}): MeResponse | undefined {
  const result = settledData(session);
  if (!result || result.status !== 200) return undefined;
  return result.data;
}
