"use client";

import { useEffect, useMemo, useState } from "react";

interface DayRow {
  date: string;
  posted: number;
  discovered: number | null; // null = no scan ran that day
  active: number | null;
}

interface TrackerJob {
  id: string;
  title: string;
  location: string | null;
  url: string;
  department: string | null;
  createdAt: string | null;
  isActive: boolean;
  isNew: boolean;
}

interface DailyData {
  days: number;
  today: string;
  rows: DayRow[]; // newest first, one per local day
  jobs: TrackerJob[];
  open: number;
  lastScanAt: string | null;
}

const RANGES = [7, 14, 30, 90];
// Single-series bar color; validated (dataviz validate_palette.js) against the gray-900 card surface
const BAR_COLOR = "#3987e5";
const CHART_HEIGHT = 160;

const asDate = (d: string) => new Date(`${d}T00:00:00`);
const shortDay = (d: string) => asDate(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const longDay = (d: string) =>
  asDate(d).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });

function niceMax(max: number): number {
  if (max <= 4) return 4;
  if (max <= 10) return Math.ceil(max / 2) * 2;
  return Math.ceil(max / 10) * 10;
}

function StatTile({ label, value, small = false }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 min-w-36 flex-1">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`font-semibold text-white mt-1 whitespace-nowrap ${small ? "text-lg leading-8" : "text-2xl"}`}>{value}</p>
    </div>
  );
}

function PostedChart({ rows, today }: { rows: DayRow[]; today: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const days = useMemo(() => [...rows].reverse(), [rows]); // oldest → newest, left → right
  const n = days.length;
  const top = niceMax(Math.max(0, ...days.map((d) => d.posted)));
  const ticks = [0, top / 2, top];
  // Label only the peak (most recent if tied); the axis, tooltip and table carry the rest
  const peak = days.reduce((best, d, i) => (d.posted > 0 && d.posted >= (days[best]?.posted ?? 0) ? i : best), -1);
  const labelEvery = n <= 14 ? 1 : n <= 30 ? 7 : 15;

  const tip = hovered !== null ? days[hovered] : null;
  const tipPos = hovered !== null ? (hovered + 0.5) / n : 0;
  const tipShift = tipPos < 0.15 ? "0%" : tipPos > 0.85 ? "-100%" : "-50%";

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <p className="text-sm font-medium text-gray-100">New Adobe US postings per day</p>
      <p className="text-xs text-gray-500 mb-6">By posted date · hover or focus a day for details</p>

      <div className="flex gap-2">
        {/* Y axis */}
        <div className="relative w-6 shrink-0 text-right text-xs text-gray-500 tabular-nums" style={{ height: CHART_HEIGHT }}>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - (t / top) * 100}%` }}>
              {t}
            </span>
          ))}
        </div>

        <div className="flex-1 min-w-0">
          <div className="relative" style={{ height: CHART_HEIGHT }}>
            {/* Hairline gridlines */}
            {ticks.map((t) => (
              <div key={t} className="absolute inset-x-0 h-px bg-gray-800" style={{ top: `${100 - (t / top) * 100}%` }} />
            ))}

            {/* Columns: each day's slot is the hit target, the bar inside is the mark */}
            <div className="absolute inset-0 flex" role="group" aria-label="New Adobe US postings per day">
              {days.map((d, i) => {
                const pct = (d.posted / top) * 100;
                return (
                  <div
                    key={d.date}
                    tabIndex={0}
                    aria-label={`${longDay(d.date)}: ${d.posted} posted`}
                    className="relative flex-1 h-full flex items-end justify-center px-px outline-none"
                    onPointerEnter={() => setHovered(i)}
                    onPointerLeave={() => setHovered(null)}
                    onFocus={() => setHovered(i)}
                    onBlur={() => setHovered(null)}
                  >
                    {d.posted > 0 && (
                      <div
                        className="w-full transition-[outline-color]"
                        style={{
                          maxWidth: 24,
                          height: `${pct}%`,
                          background: BAR_COLOR,
                          borderRadius: "4px 4px 0 0",
                          outline: hovered === i ? "2px solid #d1d5dc" : "2px solid transparent",
                          outlineOffset: 1,
                        }}
                      />
                    )}
                    {i === peak && (
                      <span
                        className="absolute text-xs text-gray-300 tabular-nums pb-1"
                        style={{ bottom: `${pct}%` }}
                      >
                        {d.posted}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Tooltip: value leads, date follows */}
            {tip && (
              <div
                className="pointer-events-none absolute z-10 -top-2 rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 shadow-lg whitespace-nowrap"
                style={{ left: `${tipPos * 100}%`, transform: `translate(${tipShift}, -100%)` }}
              >
                <p className="text-sm font-semibold text-white">
                  {tip.posted} posted
                </p>
                <p className="text-xs text-gray-400">{longDay(tip.date)}{tip.date === today ? " (today)" : ""}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {tip.discovered === null ? "No scan this day" : `Found by scan: ${tip.discovered} · Open: ${tip.active ?? "-"}`}
                </p>
              </div>
            )}
          </div>

          {/* X axis */}
          <div className="flex mt-2 text-xs text-gray-500">
            {days.map((d, i) => {
              const show = d.date === today || (n - 1 - i) % labelEvery === 0;
              return (
                <div key={d.date} className="flex-1 flex justify-center min-w-0">
                  {show && <span className="whitespace-nowrap">{d.date === today ? "Today" : shortDay(d.date)}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DailyTracker() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<DailyData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/daily?days=${days}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<DailyData>;
      })
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const loading = !error && (!data || data.days !== days);

  const groups = useMemo(() => {
    const byDate = new Map<string, TrackerJob[]>();
    for (const job of data?.jobs ?? []) {
      if (!job.createdAt) continue;
      byDate.set(job.createdAt, [...(byDate.get(job.createdAt) ?? []), job]);
    }
    return [...byDate].sort(([a], [b]) => b.localeCompare(a));
  }, [data]);

  const rangeButtons = (
    <div className="flex flex-wrap items-center gap-1 mb-4" role="group" aria-label="Date range">
      <span className="text-xs text-gray-500 mr-1">Last</span>
      {RANGES.map((r) => (
        <button
          key={r}
          onClick={() => setDays(r)}
          aria-pressed={days === r}
          className={`px-3 py-1.5 text-sm rounded-md font-medium whitespace-nowrap transition-colors ${
            days === r ? "bg-gray-700 text-white" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
          }`}
        >
          {r} days
        </button>
      ))}
    </div>
  );

  if (error && !data) {
    return (
      <div>
        {rangeButtons}
        <div className="text-red-400 text-sm p-3 bg-red-900/20 rounded-lg border border-red-800">
          Could not load the daily record: {error}
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div>
        {rangeButtons}
        <div className="text-center py-16 text-gray-600">Loading...</div>
      </div>
    );
  }

  const postedToday = data.rows[0]?.posted ?? 0;
  const postedLast7 = data.rows.slice(0, 7).reduce((s, r) => s + r.posted, 0);
  const postedInRange = data.rows.reduce((s, r) => s + r.posted, 0);
  const lastScan = data.lastScanAt
    ? new Date(data.lastScanAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "Never";

  return (
    <div>
      {rangeButtons}

      {/* Refetch keeps the frame: hold the previous render, dimmed */}
      <div className={`flex flex-col gap-4 transition-opacity ${loading ? "opacity-50" : ""}`}>
        <div className="flex flex-wrap gap-3">
          <StatTile label="Open jobs now" value={data.open.toLocaleString()} />
          <StatTile label="Posted today" value={String(postedToday)} />
          {data.days > 7 && <StatTile label="Posted, last 7 days" value={String(postedLast7)} />}
          <StatTile label={`Posted, last ${data.days} days`} value={String(postedInRange)} />
          <StatTile label="Last scan" value={lastScan} small />
        </div>

        <PostedChart rows={data.rows} today={data.today} />

        {/* New JDs grouped by posted day */}
        <div className="flex flex-col gap-4">
          {groups.length === 0 && (
            <div className="text-center py-10 text-gray-500 text-sm">
              No Adobe postings in this range yet. Run a scan to update.
            </div>
          )}
          {groups.map(([date, jobs]) => (
            <section key={date}>
              <h2 className="flex items-baseline gap-2 px-1 mb-2">
                <span className="text-sm font-semibold text-gray-100">{longDay(date)}</span>
                {date === data.today && <span className="text-xs font-medium text-blue-400">Today</span>}
                <span className="text-xs text-gray-500">
                  {jobs.length} posted
                </span>
              </h2>
              <div className="flex flex-col gap-1">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className={`border border-gray-700 rounded-lg px-4 py-3 bg-gray-900 hover:bg-gray-800 transition-colors flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 ${
                      job.isActive ? "" : "opacity-60"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-gray-100 hover:text-blue-300 hover:underline truncate block"
                      >
                        {job.title}
                      </a>
                      {job.department && <p className="text-xs text-gray-500 mt-0.5">{job.department}</p>}
                    </div>
                    <div className="sm:w-44 shrink-0 text-sm text-gray-400">{job.location ?? "-"}</div>
                    <div className="sm:w-32 shrink-0 text-sm text-gray-400 sm:text-right tabular-nums">Posted {job.createdAt}</div>
                    <div className="sm:w-28 shrink-0 flex sm:justify-end items-center gap-2">
                      {job.isNew && (
                        <span className="text-xs bg-green-900 text-green-400 font-medium px-2 py-0.5 rounded-full">New</span>
                      )}
                      {!job.isActive && (
                        <span className="text-xs bg-gray-800 text-gray-400 font-medium px-2 py-0.5 rounded-full">Closed</span>
                      )}
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline"
                      >
                        Apply
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* The daily record, also the chart's table view */}
        <details open={data.days <= 30} className="bg-gray-900 border border-gray-700 rounded-xl">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-100">Daily record</summary>
          <div className="px-4 pb-4 overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left font-semibold py-2">Date</th>
                  <th className="text-right font-semibold py-2">Posted</th>
                  <th className="text-right font-semibold py-2">Found by scan</th>
                  <th className="text-right font-semibold py-2">Open jobs</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.date} className={`border-t border-gray-800 ${r.date === data.today ? "text-white" : "text-gray-300"}`}>
                    <td className="py-1.5">
                      {r.date}
                      <span className="text-gray-500"> · {asDate(r.date).toLocaleDateString("en-US", { weekday: "short" })}</span>
                    </td>
                    <td className="py-1.5 text-right">{r.posted}</td>
                    <td className="py-1.5 text-right">{r.discovered ?? <span className="text-gray-600">no scan</span>}</td>
                    <td className="py-1.5 text-right">{r.active ?? <span className="text-gray-600">-</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </div>
  );
}
