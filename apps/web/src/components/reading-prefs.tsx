import { IconTextSize } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { createEffect, createSignal } from "solid-js";

type Prefs = { scale: "1" | "1.125" | "1.25"; spacing: "normal" | "wide" };

const storageKey = "cookbook:reading";
const fallback: Prefs = { scale: "1", spacing: "normal" };

function load(): Prefs {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return fallback;
    const scale = "scale" in parsed ? parsed.scale : undefined;
    const spacing = "spacing" in parsed ? parsed.spacing : undefined;
    return {
      scale: scale === "1.125" || scale === "1.25" ? scale : "1",
      spacing: spacing === "wide" ? "wide" : "normal",
    };
  } catch {
    return fallback;
  }
}

/** Text size and letter spacing for this browser. Sets the tokens read in index.css. */
export function ReadingPrefs() {
  const [prefs, setPrefs] = createSignal(load());

  createEffect(() => {
    const current = prefs();
    const root = document.documentElement.style;
    root.setProperty("--reading-scale", current.scale);
    root.setProperty("--reading-tracking", current.spacing === "wide" ? "0.04em" : "normal");
    root.setProperty("--reading-word-spacing", current.spacing === "wide" ? "0.12em" : "normal");
    try {
      localStorage.setItem(storageKey, JSON.stringify(current));
    } catch {
      return;
    }
  });

  return (
    <Popover>
      <PopoverTrigger as={Button} variant="ghost" size="lg" aria-label="Reading settings">
        <IconTextSize aria-hidden="true" />
        Aa
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent>
          <PopoverTitle class="text-sm font-semibold">Reading</PopoverTitle>
          <div class="flex flex-col gap-1">
            <span class="text-xs font-medium text-muted-foreground">Text size</span>
            <ToggleGroup
              variant="outline"
              spacing={0}
              value={prefs().scale}
              onChange={(value) => {
                if (value === "1" || value === "1.125" || value === "1.25")
                  setPrefs((current) => ({ ...current, scale: value }));
              }}
            >
              <ToggleGroupItem value="1" class="text-xs">
                A
              </ToggleGroupItem>
              <ToggleGroupItem value="1.125" class="text-sm">
                A
              </ToggleGroupItem>
              <ToggleGroupItem value="1.25" class="text-base">
                A
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-xs font-medium text-muted-foreground">Letter spacing</span>
            <ToggleGroup
              variant="outline"
              spacing={0}
              value={prefs().spacing}
              onChange={(value) => {
                if (value === "normal" || value === "wide")
                  setPrefs((current) => ({ ...current, spacing: value }));
              }}
            >
              <ToggleGroupItem value="normal">Normal</ToggleGroupItem>
              <ToggleGroupItem value="wide" class="tracking-wider">
                Wide
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
}
