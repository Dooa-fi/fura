// Friendly names for each kind of creation, shared by several pages.
export const KIND_LABEL: Record<string, string> = { script: "Script", hooks: "Hooks", ideas: "Ideas", hook: "Hooks", topic: "Ideas" };

export function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
