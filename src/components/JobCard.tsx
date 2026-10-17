"use client";

import type { Job } from "../generated/prisma";

const SOURCE_LABELS: Record<string, string> = {
  greenhouse: "Greenhouse",
  ashby: "Ashby",
  smartrecruiters: "SmartRecruiters",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function dayLabel(dateStr: string | null): string {
  if (!dateStr) return "";
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const twoDays = new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0];
  if (dateStr >= today) return "Today";
  if (dateStr >= yesterday) return "Yesterday";
  if (dateStr >= twoDays) return "2 days ago";
  return "";
}

interface Props {
  job: Job;
}

export default function JobCard({ job }: Props) {
  const label = dayLabel(job.createdAt);

  return (
    <div className="border border-gray-700 rounded-lg px-4 py-3 bg-gray-900 hover:bg-gray-800 transition-colors flex flex-col sm:flex-row sm:items-center gap-3">
      {/* Company */}
      <div className="sm:w-44 shrink-0">
        <p className="font-semibold text-white text-sm">{job.label}</p>
        <span className="text-xs text-gray-500">{SOURCE_LABELS[job.source] ?? job.source}</span>
      </div>

      {/* Title + dept */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-100 truncate">{job.title}</p>
        {job.department && (
          <p className="text-xs text-gray-500 mt-0.5">{job.department}</p>
        )}
      </div>

      {/* Location */}
      <div className="sm:w-40 shrink-0">
        <p className="text-sm text-gray-400">{job.location ?? "-"}</p>
      </div>

      {/* Date */}
      <div className="sm:w-32 shrink-0 text-right">
        <p className="text-sm text-gray-400">{formatDate(job.createdAt)}</p>
        {label && (
          <span className="text-xs font-medium text-blue-400">{label}</span>
        )}
      </div>

      {/* Apply */}
      <div className="sm:w-20 shrink-0 text-right">
        {job.isNew && (
          <span className="inline-block mb-1 text-xs bg-green-900 text-green-400 font-medium px-2 py-0.5 rounded-full">
            New
          </span>
        )}
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline"
        >
          Apply
        </a>
      </div>
    </div>
  );
}
