"use client";

import { useState, useCallback } from "react";

interface SearchResult {
  id: string | null;
  title: string;
  company: string;
  location: string | null;
  url: string;
  postedAt: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  isNew: boolean;
}

function formatSalary(min: number | null, max: number | null): string {
  if (!min && !max) return "-";
  const fmt = (n: number) => `$${Math.round(n / 1000)}K`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return `–${fmt(max!)}`;
}

const PER_PAGE = 20;

export default function SearchPanel() {
  const [where, setWhere] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (w: string, p: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (w.trim()) params.set("where", w.trim());
      const res = await fetch(`/api/search?${params}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setResults([]);
        setTotal(0);
        return;
      }
      setResults(data.jobs ?? []);
      setTotal(data.total ?? 0);
      setSearched(true);
    } catch {
      setError("Search failed. Check your network or API keys.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    search(where, 1);
  };

  const handlePage = (newPage: number) => {
    setPage(newPage);
    search(where, newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const totalPages = Math.ceil(total / PER_PAGE);
  const from = (page - 1) * PER_PAGE + 1;
  const to = Math.min(page * PER_PAGE, total);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {["Customer Experience Manager", "Voice of the Customer", "Customer Journey"].map((phrase) => (
          <span key={phrase} className="text-xs font-medium text-blue-300 bg-blue-900/30 border border-blue-800/50 px-2.5 py-1 rounded-full">
            {phrase}
          </span>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <input
          type="text"
          value={where}
          onChange={(e) => setWhere(e.target.value)}
          placeholder="City or state (optional)"
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && (
        <div className="text-red-400 text-sm mb-4 p-3 bg-red-900/20 rounded-lg border border-red-800">
          {error}
        </div>
      )}

      {searched && !loading && (
        <p className="text-xs text-gray-500 mb-3">
          {total === 0
            ? "No results found."
            : `Showing ${from}–${to} of ${total.toLocaleString()} results · with salary · last 2 days`}
        </p>
      )}

      {loading && (
        <div className="text-center py-16 text-gray-600">Searching...</div>
      )}

      {!loading && results.length > 0 && (
        <>
          <div className="hidden sm:flex items-center gap-3 px-4 mb-1">
            <div className="w-40 shrink-0 text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</div>
            <div className="flex-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</div>
            <div className="w-36 shrink-0 text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</div>
            <div className="w-32 shrink-0 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Salary</div>
            <div className="w-24 shrink-0 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Posted</div>
            <div className="w-16 shrink-0 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Apply</div>
          </div>

          <div className="flex flex-col gap-1">
            {results.map((job, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors"
              >
                <div className="w-40 shrink-0 flex items-center gap-2 min-w-0">
                  {job.isNew && (
                    <span className="shrink-0 text-xs font-bold text-emerald-400 bg-emerald-900/30 px-1.5 py-0.5 rounded">NEW</span>
                  )}
                  <span className="text-sm font-medium text-gray-200 truncate">{job.company}</span>
                </div>
                <div className="flex-1 text-sm text-white truncate">{job.title}</div>
                <div className="w-36 shrink-0 text-sm text-gray-400 truncate">{job.location ?? "-"}</div>
                <div className="w-32 shrink-0 text-sm text-gray-300 text-right">{formatSalary(job.salaryMin, job.salaryMax)}</div>
                <div className="w-24 shrink-0 text-sm text-gray-500 text-right">{job.postedAt ?? "-"}</div>
                <div className="w-16 shrink-0 text-right">
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Apply →
                  </a>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
              <button
                onClick={() => handlePage(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ← Prev
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => handlePage(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {!loading && searched && results.length === 0 && !error && (
        <div className="text-center py-16">
          <p className="text-gray-500 font-medium">No results found</p>
          <p className="text-gray-600 text-sm mt-1">Try different keywords or broaden your location.</p>
        </div>
      )}

      {!searched && !loading && (
        <div className="text-center py-16 text-gray-600 text-sm">
          With salary · last 2 days · title match only
        </div>
      )}
    </div>
  );
}
