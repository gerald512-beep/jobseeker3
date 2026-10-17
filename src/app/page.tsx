"use client";

import { useEffect, useState, useCallback } from "react";
import JobCard from "@/components/JobCard";
import FilterBar, { type Filters } from "@/components/FilterBar";
import SearchPanel from "@/components/SearchPanel";
import type { Job } from "../generated/prisma";

type Tab = "so" | "cx" | "search";

interface FilterOptions {
  companies: { value: string; label: string }[];
  regions: string[];
  cities: string[];
}

const TAB_META: Record<Tab, { title: string; subtitle: string }> = {
  so:     { title: "S&O Jobs",  subtitle: "Strategy & Operations roles"            },
  cx:     { title: "CX Jobs",   subtitle: "Customer Experience roles"              },
  search: { title: "Search",    subtitle: "Search any company on any job board"    },
};

const DEFAULT_FILTERS: Filters = { company: "", region: "", city: "", title: "", daysAgo: "2", onlyNew: false };

export default function Page() {
  const [tab, setTab] = useState<Tab>("so");

  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [options, setOptions] = useState<FilterOptions>({ companies: [], regions: [], cities: [] });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchOptions = useCallback((t: Tab) => {
    fetch(`/api/filters?category=${t}`)
      .then((r) => r.json())
      .then(setOptions)
      .catch(console.error);
  }, []);

  const fetchJobs = useCallback(async (filters: Filters, t: Tab) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("category", t);
    if (filters.company) params.set("company", filters.company);
    if (filters.region)  params.set("region", filters.region);
    if (filters.city)    params.set("city", filters.city);
    if (filters.title)   params.set("title", filters.title);
    if (filters.daysAgo) params.set("daysAgo", filters.daysAgo);
    if (filters.onlyNew) params.set("onlyNew", "1");

    try {
      const res = await fetch(`/api/jobs?${params}`);
      const data = await res.json();
      setJobs(data.jobs ?? []);
      setTotal(data.total ?? 0);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "search") return;
    fetchOptions(tab);
    fetchJobs(DEFAULT_FILTERS, tab);
  }, [tab, fetchOptions, fetchJobs]);

  const handleTabChange = (t: Tab) => {
    setTab(t);
    setOptions({ companies: [], regions: [], cities: [] });
    setJobs([]);
  };

  const meta = TAB_META[tab];

  return (
    <main className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{meta.title}</h1>
            <p className="text-xs text-gray-500">{meta.subtitle}</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Tabs */}
            <div className="flex gap-1">
              {(["so", "cx", "search"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => handleTabChange(t)}
                  className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                    tab === t
                      ? "bg-blue-600 text-white"
                      : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                  }`}
                >
                  {TAB_META[t].title}
                </button>
              ))}
            </div>
            {tab !== "search" && (
              <div className="text-right text-xs text-gray-500">
                {lastUpdated && <p>Updated {lastUpdated}</p>}
                <p>{total} job{total !== 1 ? "s" : ""}</p>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {tab === "search" ? (
          <SearchPanel />
        ) : (
          <>
            <FilterBar
              key={tab}
              options={options}
              onFilter={(filters) => fetchJobs(filters, tab)}
            />

            {/* Column headers */}
            <div className="hidden sm:flex items-center gap-3 px-4 mb-1">
              <div className="w-44 shrink-0 text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</div>
              <div className="flex-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</div>
              <div className="w-40 shrink-0 text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</div>
              <div className="w-32 shrink-0 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Posted</div>
              <div className="w-20 shrink-0 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Apply</div>
            </div>

            {loading ? (
              <div className="text-center py-16 text-gray-600">Loading...</div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500 font-medium">No jobs found</p>
                <p className="text-gray-600 text-sm mt-1">Try adjusting your filters or run a scan first.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
