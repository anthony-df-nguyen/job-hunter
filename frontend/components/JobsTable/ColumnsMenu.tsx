"use client";

import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Table } from "@tanstack/react-table";
import type { Job } from "@/lib/types";
import { COLUMN_LABELS } from "./constants";

function SortableColumnRow({ id, table }: { id: string; table: Table<Job> }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const column = table.getColumn(id);
  if (!column) return null;

  const pinned = column.getIsPinned();
  const label = COLUMN_LABELS[id] ?? id;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded px-1 py-1 ${isDragging ? "z-10 bg-zinc-100 dark:bg-zinc-800" : ""}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab touch-none text-zinc-400 hover:text-zinc-600 active:cursor-grabbing dark:text-zinc-500 dark:hover:text-zinc-300"
        aria-label={`Reorder ${label}`}
      >
        ⠿
      </button>
      <input
        type="checkbox"
        checked={column.getIsVisible()}
        onChange={column.getToggleVisibilityHandler()}
        disabled={!column.getCanHide()}
        className="shrink-0"
      />
      <span className="flex-1 truncate text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
      <button
        type="button"
        onClick={() => column.pin(pinned === "left" ? false : "left")}
        aria-label={`${pinned === "left" ? "Unpin" : "Pin"} ${label} left`}
        title="Pin left"
        className={`shrink-0 rounded px-1 text-xs ${
          pinned === "left"
            ? "text-blue-600 dark:text-blue-400"
            : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
        }`}
      >
        ⇤
      </button>
      <button
        type="button"
        onClick={() => column.pin(pinned === "right" ? false : "right")}
        aria-label={`${pinned === "right" ? "Unpin" : "Pin"} ${label} right`}
        title="Pin right"
        className={`shrink-0 rounded px-1 text-xs ${
          pinned === "right"
            ? "text-blue-600 dark:text-blue-400"
            : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
        }`}
      >
        ⇥
      </button>
    </li>
  );
}

export default function ColumnsMenu({
  table,
  columnOrder,
  onColumnOrderChange,
  onReset,
}: {
  table: Table<Job>;
  columnOrder: string[];
  onColumnOrderChange: (order: string[]) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = columnOrder.indexOf(String(active.id));
    const newIndex = columnOrder.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onColumnOrderChange(arrayMove(columnOrder, oldIndex, newIndex));
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border border-zinc-300 px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        Columns
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-64 rounded-md border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={columnOrder} strategy={verticalListSortingStrategy}>
                <ul className="space-y-1">
                  {columnOrder.map((id) => (
                    <SortableColumnRow key={id} id={id} table={table} />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
            <button
              type="button"
              onClick={() => {
                onReset();
                setOpen(false);
              }}
              className="mt-2 w-full rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Reset
            </button>
          </div>
        </>
      )}
    </div>
  );
}
