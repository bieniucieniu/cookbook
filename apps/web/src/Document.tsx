import { HydrationScript } from "@solidjs/web";
import type { ParentProps } from "solid-js";
import { preferencesScript } from "@/lib/preferences";

/** The HTML shell, picked up by start mode's src/Document.* convention. */
export default function Document(props: ParentProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Cookbook</title>
        {/* Before paint, so the first frame already has the stored theme and reading size. */}
        <script innerHTML={preferencesScript} />
        <HydrationScript />
      </head>
      <body>{props.children}</body>
    </html>
  );
}
