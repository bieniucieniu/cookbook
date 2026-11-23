import { notifyError } from "@/components/notify";
import { createSignal } from "solid-js";

/**
 * Pending state for a write started from the UI. `run(action, work)` marks it pending, runs
 * `work`, and on failure shows "Could not <action>" in a snackbar; it resolves to the result, or
 * undefined after a failure. Mutations revalidate the cached queries themselves (src/mutator.ts).
 */
export function createSubmit() {
  const [pending, setPending] = createSignal(false);
  async function run<T>(
    action: string,
    work: () => Promise<T>,
    options?: { persistent?: boolean }
  ): Promise<T | undefined> {
    setPending(true);
    try {
      return await work();
    } catch (error) {
      notifyError(action, error, options);
      return undefined;
    } finally {
      setPending(false);
    }
  }
  return [pending, run] as const;
}
