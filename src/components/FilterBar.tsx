"use client";

import { useState, useCallback } from "react";

interface FilterOptions {
  companies: { value: string; label: string }[];
  regions: string[];
  cities: string[];
}

export interface Filters {
  company: string;
  region: string;
  city: string;
  title: string;
  daysAgo: string;
  onlyNew: boolean;
}

interface Props {
  options: FilterOptions;
  onFilter: (filters: Filters) => void;
}

const DAY_OPTIONS = [
  { value: "30", label: "Last 30 days" },
  { value: "7",  label: "Last 7 days" },
  { value: "2",  label: "Last 2 days" },
  { value: "0",  label: "Today" },
];

const selectClass =
  "border border-gray-700 rounded-md px-2 py-2 text-sm text-gray-200 bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full";

function Select({
  label,
  value,
  options,
  onChange,
  width,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  width?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${width ?? "w-36"}`}>
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function FilterBar({ options, onFilter }: Props) {
  const [filters, setFilters] = useState<Filters>({
    company: "",
    region: "",
    city: "",
    title: "",
    daysAgo: "2",
    onlyNew: false,
  });

  const update = useCallback(
    (key: keyof Filters, value: string) => {
      const next = { ...filters, [key]: value };
      setFilters(next);
      onFilter(next);
    },
    [filters, onFilter],
  );

  const reset = () => {
    const cleared: Filters = { company: "", region: "", city: "", title: "", daysAgo: "2", onlyNew: false };
    setFilters(cleared);
    onFilter(cleared);
  };

  const hasFilters =
    filters.company !== "" ||
    filters.region !== "" ||
    filters.city !== "" ||
    filters.title !== "" ||
    filters.daysAgo !== "2" ||
    filters.onlyNew;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1 w-56">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Title</label>
          <input
            type="text"
            value={filters.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="e.g. Strategy Operations"
            className={selectClass}
          />
        </div>

        <Select
          label="Company"
          value={filters.company}
          options={options.companies}
          onChange={(v) => update("company", v)}
          width="w-36"
        />

        <Select
          label="State"
          value={filters.region}
          options={options.regions.map((r) => ({ value: r, label: r }))}
          onChange={(v) => update("region", v)}
          width="w-28"
        />

        <Select
          label="City"
          value={filters.city}
          options={options.cities.map((c) => ({ value: c, label: c }))}
          onChange={(v) => update("city", v)}
          width="w-36"
        />

        <Select
          label="Date posted"
          value={filters.daysAgo}
          options={DAY_OPTIONS}
          onChange={(v) => update("daysAgo", v)}
          width="w-36"
        />

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">New</label>
          <button
            onClick={() => { const next = { ...filters, onlyNew: !filters.onlyNew }; setFilters(next); onFilter(next); }}
            className={`px-3 py-2 text-sm rounded-md border transition-colors ${
              filters.onlyNew
                ? "bg-green-600 border-green-500 text-white"
                : "bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-700"
            }`}
          >
            New only
          </button>
        </div>

        {hasFilters && (
          <button
            onClick={reset}
            className="px-3 py-2 text-sm text-gray-400 hover:text-gray-200 border border-gray-700 rounded-md bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
