import type { CSSProperties } from "react";
import type { Column } from "@tanstack/react-table";

/** Sticky positioning + background for a pinned column's header/body cells. */
export function getPinnedCellStyle<TData>(column: Column<TData, unknown>): CSSProperties {
  const pinned = column.getIsPinned();
  if (!pinned) return {};
  return {
    position: "sticky",
    left: pinned === "left" ? column.getStart("left") : undefined,
    right: pinned === "right" ? column.getAfter("right") : undefined,
    zIndex: 1,
  };
}

export function pinnedCellClassName<TData>(column: Column<TData, unknown>): string {
  const pinned = column.getIsPinned();
  if (!pinned) return "";
  const edgeBorder =
    pinned === "left" && column.getIsLastColumn("left")
      ? "border-r border-zinc-200 dark:border-zinc-800"
      : pinned === "right" && column.getIsFirstColumn("right")
        ? "border-l border-zinc-200 dark:border-zinc-800"
        : "";
  return `bg-zinc-50 dark:bg-black ${edgeBorder}`;
}
