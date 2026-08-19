"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import "./timezone-combobox.css";

type TimezoneOption = { value: string; label: string };

const COMMON_TIMEZONES = [
  "Asia/Dubai", "Asia/Kolkata", "Asia/Riyadh", "Asia/Qatar", "Asia/Muscat",
  "Asia/Karachi", "Asia/Dhaka", "Asia/Colombo", "Europe/London", "America/New_York",
];

function supportedTimezones() {
  const values = typeof Intl.supportedValuesOf === "function"
    ? Intl.supportedValuesOf("timeZone")
    : COMMON_TIMEZONES;
  return [...new Set([...COMMON_TIMEZONES, ...values])];
}

function timezoneLabel(value: string) {
  const city = value.split("/").at(-1)?.replaceAll("_", " ") ?? value;
  try {
    const offset = new Intl.DateTimeFormat("en", { timeZone: value, timeZoneName: "longOffset" })
      .formatToParts(new Date())
      .find((part) => part.type === "timeZoneName")?.value;
    return `${city} (${offset === "GMT" ? "UTC" : offset?.replace("GMT", "UTC") ?? "UTC"}) — ${value}`;
  } catch {
    return `${city} — ${value}`;
  }
}

const OPTIONS: TimezoneOption[] = supportedTimezones().map((value) => ({ value, label: timezoneLabel(value) }));
const COMMON_OPTIONS = COMMON_TIMEZONES.map((value) => OPTIONS.find((option) => option.value === value)!).filter(Boolean);

export function TimezoneCombobox({ value, disabled = false }: { value: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(value);
  const [active, setActive] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const options = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return COMMON_OPTIONS;
    return OPTIONS.filter((option) => option.value.toLowerCase().includes(normalized) || option.label.toLowerCase().includes(normalized));
  }, [query]);
  const selectedOption = OPTIONS.find((option) => option.value === selected) ?? { value: selected, label: timezoneLabel(selected) };

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  function choose(option: TimezoneOption) {
    setSelected(option.value);
    setOpen(false);
    setQuery("");
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (!open && ["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => Math.max(0, Math.min(options.length - 1, current + (event.key === "ArrowDown" ? 1 : -1))));
    } else if (event.key === "Enter" && options[active]) {
      event.preventDefault();
      choose(options[active]);
    }
  }

  return <div className="timezone-combobox" onKeyDown={onKeyDown}>
    <input type="hidden" name="timezone" value={selected}/>
    <button type="button" className="timezone-combobox-trigger" aria-haspopup="listbox" aria-expanded={open} disabled={disabled} onClick={() => setOpen((shown) => !shown)}>
      <span>{selectedOption.label}</span><span aria-hidden="true">⌄</span>
    </button>
    {open && <div className="timezone-combobox-menu">
      <input ref={searchRef} className="timezone-combobox-search" value={query} onChange={(event) => { setQuery(event.target.value); setActive(0); }} placeholder="Search timezones..." aria-label="Search timezones"/>
      <div className="timezone-combobox-results" role="listbox" aria-label="Timezone results">
        {!query.trim() && <p className="timezone-combobox-heading">Common timezones</p>}
        {options.length ? options.map((option, index) => {
          const isSelected = option.value === selected;
          return <button type="button" role="option" aria-selected={isSelected} className={`timezone-combobox-option ${active === index ? "active" : ""} ${isSelected ? "selected" : ""}`} key={option.value} onMouseEnter={() => setActive(index)} onClick={() => choose(option)}><span>{option.label}</span>{isSelected && <b aria-label="Selected">Selected</b>}</button>;
        }) : <p className="timezone-combobox-empty">No timezones found.</p>}
      </div>
    </div>}
  </div>;
}
