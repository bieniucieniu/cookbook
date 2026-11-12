import { Snackbar, SnackbarClose, SnackbarMessage, snackbar } from "@/components/m3/snackbar";

/**
 * A short message in the M3 snackbar (bottom center, one at a time). For results of an action,
 * such as a failed delete or a finished timer. Page-blocking errors use ErrorBlock instead.
 */
export function notify(message: string, options?: { persistent?: boolean }) {
  return snackbar.show((toast) => (
    <Snackbar toastId={toast.toastId} persistent={options?.persistent}>
      <SnackbarMessage>{message}</SnackbarMessage>
      <SnackbarClose />
    </Snackbar>
  ));
}
