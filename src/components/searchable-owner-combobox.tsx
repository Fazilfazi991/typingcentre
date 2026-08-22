"use client";

import React, { useEffect, useRef, useState } from "react";
import "./searchable-owner-combobox.css";

export type OwnerSearchKind = "customer" | "company";
export type OwnerSearchOption = { id: string; label: string; description?: string | null };

export function SearchableOwnerCombobox({
  kind, name, value = "", onChange, selected, allowEmpty = true,
}: {
  kind: OwnerSearchKind;
  name: string;
  value?: string;
  onChange?: (value: string, option: OwnerSearchOption | null) => void;
  selected?: OwnerSearchOption | null;
  allowEmpty?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OwnerSearchOption[]>([]);
  const [active, setActive] = useState(-1);
  const [current, setCurrent] = useState<OwnerSearchOption | null>(selected ?? null);
  const inputRef = useRef<HTMLInputElement>(null);
  const label = kind === "customer" ? "customer" : "company";

  useEffect(() => { if (open) requestAnimationFrame(() => inputRef.current?.focus()); }, [open]);
  useEffect(() => { setCurrent(selected ?? null); }, [selected]);
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); setActive(-1); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/workspace/owner-search?kind=${kind}&q=${encodeURIComponent(query)}`, { signal: controller.signal });
        const body = await response.json();
        if (!controller.signal.aborted) { setResults(body.results ?? []); setActive(body.results?.length ? 0 : -1); }
      } catch { if (!controller.signal.aborted) setResults([]); }
    }, 220);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [kind, query]);

  function choose(option: OwnerSearchOption | null) {
    setCurrent(option); setQuery(""); setResults([]); setOpen(false); onChange?.(option?.id ?? "", option);
  }
  function keys(event: React.KeyboardEvent<HTMLInputElement | HTMLButtonElement>) {
    if (event.key === "Escape") { setOpen(false); return; }
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive((index) => Math.min(index + 1, results.length - 1)); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActive((index) => Math.max(index - 1, 0)); }
    if (event.key === "Enter" && open && active >= 0 && results[active]) { event.preventDefault(); choose(results[active]); }
  }

  return <div className="owner-combobox">
    <input type="hidden" name={name} value={value || current?.id || ""} />
    <button type="button" className="owner-combobox-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((shown) => !shown)} onKeyDown={keys}>
      {current?.label || `Select a ${label}`}<span aria-hidden>⌄</span>
    </button>
    {open && <div className="owner-combobox-menu">
      <input ref={inputRef} className="owner-combobox-search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={keys} placeholder={`Search ${label}...`} aria-label={`Search ${label}`} />
      {allowEmpty && <button type="button" className="owner-combobox-option" onClick={() => choose(null)}>Clear selection</button>}
      {query.trim().length < 2 ? <p className="owner-combobox-empty">Search by name, phone, or company</p> : results.length ? <div role="listbox">{results.map((option, index) => <button type="button" role="option" aria-selected={active === index} className={`owner-combobox-option ${active === index ? "active" : ""}`} key={option.id} onMouseEnter={() => setActive(index)} onClick={() => choose(option)}><b>{option.label}</b>{option.description && <small>{option.description}</small>}</button>)}</div> : <p className="owner-combobox-empty">No {label}s found</p>}
    </div>}
  </div>;
}
