import type { JSX } from "@solidjs/web";
import { createContext, useContext } from "solid-js";
import type { ReducedMotion, Transition, VariantLabels } from "@/lib/motion/types";

export interface MotionConfigValue {
  readonly transition: Transition | undefined;
  readonly reducedMotion: ReducedMotion | undefined;
}

// Optional contexts: Solid 2 throws on a read with no provider and no default, so the empty
// default is `null`.
export const MotionConfigContext = createContext<MotionConfigValue | null>(null);

export function MotionConfig(props: {
  transition?: Transition;
  reducedMotion?: ReducedMotion;
  children?: JSX.Element;
}) {
  const parent = useContext(MotionConfigContext);
  const value: MotionConfigValue = {
    get transition() {
      return props.transition ?? parent?.transition;
    },
    get reducedMotion() {
      return props.reducedMotion ?? parent?.reducedMotion;
    },
  };
  return <MotionConfigContext value={value}>{props.children}</MotionConfigContext>;
}

export interface VariantContextValue {
  readonly initial: VariantLabels | false | undefined;
  readonly animate: VariantLabels | undefined;
}

export const VariantContext = createContext<VariantContextValue | null>(null);
