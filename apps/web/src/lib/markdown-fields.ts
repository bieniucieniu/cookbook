/**
 * Fields the frontend renders as markdown. The API stores plain strings and never sees the
 * difference. Everything not listed here (titles, labels, alt text, comments) stays plain text.
 */
export const markdownFields = {
  recipe: ["description", "notes"],
  node: ["body"],
} as const;
