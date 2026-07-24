"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type GridApi,
  type GridReadyEvent,
  type GridState,
  type IRowNode,
  type StateUpdatedEvent,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Job, JobStatus } from "@/lib/types";
import ColumnsMenu from "./ColumnsMenu";
import { useJobColumns } from "./columns";
import { STORAGE_KEY } from "./constants";

ModuleRegistry.registerModules([AllCommunityModule]);

// Zinc palette to match the rest of the app; mode is selected by the
// data-ag-theme-mode attribute on <html>, kept in sync by ThemeToggle.
const theme = themeQuartz
  .withParams(
    {
      backgroundColor: "#ffffff",
      foregroundColor: "#3f3f46",
      headerBackgroundColor: "#fafafa",
      headerTextColor: "#52525b",
      borderColor: "#e4e4e7",
      accentColor: "#2563eb",
    },
    "light",
  )
  .withParams(
    {
      backgroundColor: "#09090b",
      foregroundColor: "#d4d4d8",
      headerBackgroundColor: "#18181b",
      headerTextColor: "#d4d4d8",
      borderColor: "#27272a",
      accentColor: "#60a5fa",
    },
    "dark",
  );

function loadInitialState(): GridState | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GridState) : undefined;
  } catch {
    return undefined;
  }
}

interface DetailRow {
  id: string;
  isDetail: true;
  jobId: number;
  description: string | null;
}

type Row = Job | DetailRow;

function isDetailRow(row: Row): row is DetailRow {
  return "isDetail" in row;
}

const DETAIL_CHARS_PER_LINE = 140;
const DETAIL_LINE_HEIGHT = 20;
const DETAIL_VERTICAL_PADDING = 24;
const DETAIL_MIN_HEIGHT = 56;
// Reserve space for everything above/around the grid (nav, columns menu,
// table header, the job row itself) so the detail panel's cap leaves the
// rest of the viewport visible rather than pushing it off-screen.
const DETAIL_VIEWPORT_RESERVE = 500;
const DETAIL_MAX_HEIGHT_FALLBACK = 700;

function computeDetailMaxHeight(): number {
  if (typeof window === "undefined") return DETAIL_MAX_HEIGHT_FALLBACK;
  return Math.max(DETAIL_MIN_HEIGHT, window.innerHeight - DETAIL_VIEWPORT_RESERVE);
}

function useDetailMaxHeight(): number {
  const [detailMaxHeight, setDetailMaxHeight] = useState(computeDetailMaxHeight);
  useEffect(() => {
    const handleResize = () => setDetailMaxHeight(computeDetailMaxHeight());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return detailMaxHeight;
}

function estimateDetailHeight(description: string | null, maxHeight: number): number {
  if (!description) return DETAIL_MIN_HEIGHT;
  // Markdown collapses runs of blank lines into a single paragraph break, so
  // do the same here or the estimate badly overshoots the rendered height.
  const lines = description
    .replace(/(\n\s*){2,}/g, "\n\n")
    .split("\n")
    .reduce((total, line) => total + Math.max(1, Math.ceil(line.length / DETAIL_CHARS_PER_LINE)), 0);
  return Math.min(maxHeight, Math.max(DETAIL_MIN_HEIGHT, lines * DETAIL_LINE_HEIGHT + DETAIL_VERTICAL_PADDING));
}

function DescriptionDetailRenderer(params: { data?: Row; maxHeight: number }) {
  const row = params.data;
  if (!row || !isDetailRow(row)) return null;
  return (
    <div
      style={{ maxHeight: params.maxHeight }}
      className="overflow-y-auto border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/50"
    >
      {row.description ? (
        <div className="prose prose-sm prose-zinc max-w-none dark:prose-invert prose-p:my-2 prose-headings:my-2">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{row.description}</ReactMarkdown>
        </div>
      ) : (
        <p className="text-sm text-zinc-700 dark:text-zinc-300">No description available.</p>
      )}
    </div>
  );
}

function NoRowsOverlay() {
  return (
    <div className="text-center text-sm text-zinc-500">
      <div>No jobs yet — run a search to get started.</div>
      <Link href="/settings" className="mt-2 inline-block text-blue-600 hover:underline dark:text-blue-400">
        Refine your search criteria in Settings
      </Link>
    </div>
  );
}

export default function JobsTable({
  jobs,
  statuses,
  onUpdate,
  onDelete,
}: {
  jobs: Job[];
  statuses: JobStatus[];
  onUpdate: (id: number, patch: { status_id?: number; notes?: string }) => void;
  onDelete: (id: number) => void;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set());
  const [gridApi, setGridApi] = useState<GridApi<Row> | null>(null);
  const detailMaxHeight = useDetailMaxHeight();

  const handleToggleExpand = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const columns = useJobColumns({
    statuses,
    onUpdate,
    onDelete,
    expandedIds,
    onToggleExpand: handleToggleExpand,
  });
  const [initialState] = useState(loadInitialState);

  const rowData = useMemo<Row[]>(
    () =>
      jobs.flatMap((job) =>
        expandedIds.has(job.id)
          ? [job, { id: `detail-${job.id}`, isDetail: true, jobId: job.id, description: job.description } as DetailRow]
          : [job],
      ),
    [jobs, expandedIds],
  );

  const handleGridReady = useCallback((event: GridReadyEvent<Row>) => {
    setGridApi(event.api);
  }, []);

  // Row heights are cached by AG Grid; when the viewport is resized the
  // detail max-height changes, so force a re-measure of detail rows.
  useEffect(() => {
    gridApi?.resetRowHeights();
  }, [gridApi, detailMaxHeight]);

  const isFullWidthRow = useCallback((params: { rowNode: IRowNode<Row> }) => {
    const row = params.rowNode.data;
    return !!row && isDetailRow(row);
  }, []);

  const getRowHeight = useCallback(
    (params: { data?: Row }) => {
      const row = params.data;
      return row && isDetailRow(row) ? estimateDetailHeight(row.description, detailMaxHeight) : undefined;
    },
    [detailMaxHeight],
  );

  // Sorting/filtering runs over the whole rowData array, including our
  // synthetic detail rows (which have no sortable fields and would
  // otherwise drift away from the parent job row they belong under) — pin
  // each detail row back to immediately follow its parent after every sort.
  const postSortRows = useCallback((params: { nodes: IRowNode<Row>[] }) => {
    const nodes = params.nodes;
    const detached: { node: IRowNode<Row>; jobId: number }[] = [];
    for (let i = nodes.length - 1; i >= 0; i--) {
      const data = nodes[i].data;
      if (data && isDetailRow(data)) {
        detached.push({ node: nodes[i], jobId: data.jobId });
        nodes.splice(i, 1);
      }
    }
    for (const { node, jobId } of detached) {
      const parentIndex = nodes.findIndex((n) => n.data && !isDetailRow(n.data) && n.data.id === jobId);
      nodes.splice(parentIndex === -1 ? nodes.length : parentIndex + 1, 0, node);
    }
  }, []);

  const handleStateUpdated = useCallback((event: StateUpdatedEvent<Row>) => {
    if (event.sources.length === 1 && event.sources[0] === "gridInitializing") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(event.state));
    } catch {
      // ignore unavailable localStorage
    }
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <ColumnsMenu api={gridApi} />
      </div>
      <AgGridReact<Row>
        theme={theme}
        rowData={rowData}
        columnDefs={columns as ColDef<Row>[]}
        getRowId={(params) => String(params.data.id)}
        initialState={initialState}
        onGridReady={handleGridReady}
        onStateUpdated={handleStateUpdated}
        domLayout="autoHeight"
        singleClickEdit
        stopEditingWhenCellsLoseFocus
        noRowsOverlayComponent={NoRowsOverlay}
        isFullWidthRow={isFullWidthRow}
        fullWidthCellRenderer={DescriptionDetailRenderer}
        fullWidthCellRendererParams={{ maxHeight: detailMaxHeight }}
        getRowHeight={getRowHeight}
        postSortRows={postSortRows}
        maintainColumnOrder
        defaultColDef={{ sortable: true, resizable: true, minWidth: 80 }}
      />
    </div>
  );
}
