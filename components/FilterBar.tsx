"use client";

import type { Market } from "@/lib/types";
import { useState } from "react";

export type Filters = {
  market: "all" | Market;
  reportType: string;
  year: string;
};

type FilterBarProps = {
  filters: Filters;
  onChange: (filters: Filters) => void;
};

const marketOptions = [
  { label: "全部市场", value: "all" },
  { label: "美股", value: "US" },
  { label: "A股", value: "CN" },
] as const;

const reportTypeOptions = [
  { label: "全部类型", value: "all" },
  { label: "年报", value: "年报" },
  { label: "半年报", value: "半年报" },
  { label: "一季报", value: "一季报" },
  { label: "三季报", value: "三季报" },
  { label: "10-K", value: "10-K" },
  { label: "10-Q", value: "10-Q" },
  { label: "20-F", value: "20-F" },
  { label: "6-K", value: "6-K" },
  { label: "40-F", value: "40-F" },
];

const yearOptions = [
  { label: "全部年份", value: "all" },
  { label: "2026", value: "2026" },
  { label: "2025", value: "2025" },
  { label: "2024", value: "2024" },
  { label: "2023", value: "2023" },
  { label: "2022", value: "2022" },
  { label: "更早", value: "更早" },
];

type Option = {
  label: string;
  value: string;
};

type FilterSelectProps = {
  id: keyof Filters;
  label: string;
  value: string;
  options: readonly Option[];
  onSelect: (value: string) => void;
};

function FilterSelect({ id, label, value, options, onSelect }: FilterSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <details
      className="filter-select"
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary
        className="filter-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${id}-options`}
      >
        <span className="filter-label">{label}</span>
        <span>{selected.label}</span>
        <span className="chevron" aria-hidden="true" />
      </summary>
      <div className={isOpen ? "filter-menu open" : "filter-menu"} id={`${id}-options`} role="listbox">
        {options.map((option) => (
          <button
            key={option.value}
            className={option.value === value ? "filter-option selected" : "filter-option"}
            type="button"
            role="option"
            aria-selected={option.value === value}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onSelect(option.value);
              setIsOpen(false);
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </details>
  );
}

export function FilterBar({ filters, onChange }: FilterBarProps) {
  return (
    <div className="filter-bar" aria-label="财报筛选器">
      <FilterSelect
        id="market"
        label="市场"
        value={filters.market}
        options={marketOptions}
        onSelect={(value) => onChange({ ...filters, market: value as Filters["market"] })}
      />
      <FilterSelect
        id="reportType"
        label="报告类型"
        value={filters.reportType}
        options={reportTypeOptions}
        onSelect={(value) => onChange({ ...filters, reportType: value })}
      />
      <FilterSelect
        id="year"
        label="年份"
        value={filters.year}
        options={yearOptions}
        onSelect={(value) => onChange({ ...filters, year: value })}
      />
    </div>
  );
}
