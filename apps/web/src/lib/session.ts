import type { currentUserResponse } from "@/generated/auth/auth";
import type { MeResponse } from "@/generated/model";

export function signedIn(result: currentUserResponse | undefined): MeResponse | undefined {
  if (!result || result.status !== 200) return undefined;
  return result.data;
}
