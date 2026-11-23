import { useSearchParams } from "@solidjs/router";

/**
 * The editor's `?step=` param: the selected step's key, or undefined. Selecting a step replaces
 * the history entry, so walking through steps does not fill the back stack.
 */
export function useEditorStep() {
  const [search, setSearch] = useSearchParams();
  const step = () => {
    const value = search.step;
    return typeof value === "string" && value ? value : undefined;
  };
  const selectStep = (next: string | undefined) =>
    setSearch({ step: next }, { replace: true, scroll: false });
  return [step, selectStep] as const;
}
