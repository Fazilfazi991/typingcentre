"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReportFilters, ReportRange } from "@/lib/reports/filters";

export function ReportsFilterToolbar({
  filters,
  types,
}: {
  filters: ReportFilters;
  types: Array<{ id: string; name: string }>;
}) {
  const [range, setRange] = useState<ReportRange>(filters.range);
  const [open, setOpen] = useState(false);
  const isCustom = range === "custom";
  const appliedCount = [filters.range !== "all", filters.owner !== "all", Boolean(filters.typeId), filters.sort !== "expiry-asc"].filter(Boolean).length;
  return (
    <form className={`panel reports-filters ${open ? "is-open" : ""}`} method="get" aria-label="Report filters">
      <button className="reports-mobile-filter-toggle" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}><span>Filters{appliedCount ? ` (${appliedCount})` : ""}</span><span aria-hidden>{open ? "−" : "+"}</span></button>
      <div className="reports-filter-row">
        <label>
          Range
          <select
            name="range"
            value={range}
            onChange={(event) => setRange(event.target.value as ReportRange)}
          >
            <option value="all">All active documents</option>
            <option value="today">Today</option>
            <option value="7d">Next 7 days</option>
            <option value="30d">Next 30 days</option>
            <option value="month">This month</option>
            <option value="custom">Custom range</option>
          </select>
        </label>
        <label>
          Owner
          <select name="owner" defaultValue={filters.owner}>
            <option value="all">All owners</option>
            <option value="customers">Customers</option>
            <option value="companies">Companies</option>
          </select>
        </label>
        <label>
          Document type
          <select name="type" defaultValue={filters.typeId ?? ""}>
            <option value="">All types</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sort
          <select name="sort" defaultValue={filters.sort}>
            <option value="expiry-asc">Expiry date: nearest first</option>
            <option value="expiry-desc">Expiry date: latest first</option>
            <option value="name">Owner name</option>
            <option value="status">Status</option>
          </select>
        </label>
      </div>
      {isCustom && (
        <div className="reports-filter-row reports-filter-custom">
          <label>
            From
            <input type="date" name="start" defaultValue={filters.start} required />
          </label>
          <label>
            To
            <input type="date" name="end" defaultValue={filters.end} required />
          </label>
        </div>
      )}
      <div className="reports-filter-actions">
        <button className="primary-button">Apply filters</button>
        <Link href="/reports" className="quiet-action">
          Reset
        </Link>
      </div>
    </form>
  );
}
