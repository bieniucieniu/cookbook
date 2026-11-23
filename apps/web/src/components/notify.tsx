import { snackbar } from "@/components/m3/snackbar";

/** "Could not <action>: <message>" for a failed action. */
export function notifyError(action: string, error: unknown, options?: { persistent?: boolean }) {
  return notify(
    `Could not ${action}${error instanceof Error && error.message ? `: ${error.message}` : "."}`,
    options
  );
}

/**
 * A short message in the M3 snackbar (bottom center, one at a time). For results of an action,
 * such as a failed delete or a finished timer. Page-blocking errors use ErrorBlock instead.
 * A persistent snackbar stays until it is dismissed.
 */
export function notify(message: string, options?: { persistent?: boolean }) {
  return snackbar(message, options?.persistent ? { duration: Infinity } : undefined);
}
