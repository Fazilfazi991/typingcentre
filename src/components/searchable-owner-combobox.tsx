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

  useEffect(() => {
    document.body.classList.toggle("owner-picker-open", open);
    if (open && window.matchMedia?.("(min-width: 761px) and (pointer: fine)").matches)
      requestAnimationFrame(() => inputRef.current?.focus());
    return () => document.body.classList.remove("owner-picker-open");
  }, [open]);
  useEffect(() => { setCurrent(selected ?? null); }, [selected]);
  useEffect(() => {
    if (!open) return;
    const trimmedQuery = query.trim();
    if (trimmedQuery.length === 1) { setResults([]); setActive(-1); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const search = new URLSearchParams({ kind });
        if (trimmedQuery) search.set("q", trimmedQuery);
        const response = await fetch(`/api/workspace/owner-search?${search}`, { signal: controller.signal });
        const body = await response.json();
        if (!controller.signal.aborted) { setResults(body.results ?? []); setActive(body.results?.length ? 0 : -1); }
      } catch { if (!controller.signal.aborted) setResults([]); }
    }, trimmedQuery ? 220 : 0);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [kind, open, query]);

  function choose(option: OwnerSearchOption | null) {
    inputRef.current?.blur(); setCurrent(option); setQuery(""); setResults([]); setOpen(false); onChange?.(option?.id ?? "", option);
  }
  function keys(event: React.KeyboardEvent<HTMLInputElement | HTMLButtonElement>) {
    if (event.key === "Escape") { setOpen(false); return; }
    if (event.key === "Tab") { setOpen(false); return; }
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
      <div className="owner-combobox-search-row"><input ref={inputRef} className="owner-combobox-search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={keys} placeholder={`Search ${label}...`} aria-label={`Search ${label}`} />{query && <button type="button" onClick={() => { setQuery(""); inputRef.current?.focus(); }}>Clear</button>}<button type="button" onClick={() => { inputRef.current?.blur(); setOpen(false); }}>Done</button></div>
      {allowEmpty && current && <button type="button" className="owner-combobox-clear" onClick={() => choose(null)}>Clear selection</button>}
      <div className="owner-combobox-results" role="listbox" aria-label={`${label} results`}>
        {query.trim().length === 1 ? <p className="owner-combobox-empty">Enter at least 2 characters to search</p> : results.length ? results.map((option, index) => {
          const isSelected = current?.id === option.id;
          return <button type="button" role="option" aria-selected={isSelected} className={`owner-combobox-option ${active === index ? "active" : ""} ${isSelected ? "selected" : ""}`} key={option.id} onMouseEnter={() => setActive(index)} onClick={() => choose(option)}><b>{option.label}</b>{option.description && <small>{option.description}</small>}</button>;
        }) : <p className="owner-combobox-empty">{query.trim() ? `No ${label}s found for “${query.trim()}”` : `No ${label}s yet`}</p>}
      </div>
    </div>}
  </div>;
}
