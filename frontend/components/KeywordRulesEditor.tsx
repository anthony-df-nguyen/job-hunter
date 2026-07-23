"use client";

import useSWR from "swr";
import TagList from "./TagList";
import { createKeywordRule, deleteKeywordRule, fetcher } from "@/lib/api";
import type { KeywordCategory, KeywordRule } from "@/lib/types";

const SECTIONS: { category: KeywordCategory; label: string; hint: string }[] = [
  {
    category: "good_title",
    label: "Must match one of (title)",
    hint: "A job's title must contain at least one of these to be considered. Leave empty to skip this check.",
  },
  {
    category: "skip_title",
    label: "Skip if title contains",
    hint: "Reject a job if any of these appear in the title (e.g. seniority tiers you don't want).",
  },
  {
    category: "skip_description",
    label: "Skip if description contains",
    hint: "Reject a job if any of these appear in the description (deal-breakers that don't show up in the title).",
  },
  {
    category: "contract_type",
    label: "Skip contract/temp roles",
    hint: "Reject a job if any of these appear in the title or job type field.",
  },
];

function CategorySection({
  category,
  label,
  hint,
}: {
  category: KeywordCategory;
  label: string;
  hint: string;
}) {
  const { data, mutate } = useSWR<KeywordRule[]>(
    `/keyword-rules?category=${category}`,
    fetcher,
  );

  return (
    <TagList
      label={label}
      hint={hint}
      items={(data ?? []).map((r) => ({ id: r.id, text: r.keyword }))}
      onAdd={async (keyword) => {
        await createKeywordRule(keyword, category);
        mutate();
      }}
      onRemove={async (id) => {
        await deleteKeywordRule(id);
        mutate();
      }}
    />
  );
}

export default function KeywordRulesEditor() {
  return (
    <div className="space-y-6">
      {SECTIONS.map((s) => (
        <CategorySection key={s.category} {...s} />
      ))}
    </div>
  );
}
