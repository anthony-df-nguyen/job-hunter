"use client";

import { flexRender, type Header } from "@tanstack/react-table";
import type { Job } from "@/lib/types";
import { getPinnedCellStyle, pinnedCellClassName } from "./pinning";

export default function TableHeaderCell({ header }: { header: Header<Job, unknown> }) {
  const column = header.column;

  return (
    <th
      colSpan={header.colSpan}
      style={{ width: header.getSize(), ...getPinnedCellStyle(column) }}
      className={`relative whitespace-nowrap bg-zinc-50 px-3 py-2 text-left font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 ${pinnedCellClassName(column)}`}
    >
      <span onClick={header.column.getToggleSortingHandler()} className="cursor-pointer select-none">
        {flexRender(header.column.columnDef.header, header.getContext())}
        {{ asc: " ▲", desc: " ▼" }[header.column.getIsSorted() as string] ?? ""}
      </span>
      {column.getCanResize() && (
        <div
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          onClick={(e) => e.stopPropagation()}
          className={`absolute right-0 top-0 h-full w-1.5 cursor-col-resize touch-none select-none ${
            column.getIsResizing() ? "bg-blue-500" : "hover:bg-zinc-300 dark:hover:bg-zinc-600"
          }`}
        />
      )}
    </th>
  );
}
