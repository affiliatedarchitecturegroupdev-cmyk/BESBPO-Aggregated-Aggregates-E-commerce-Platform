"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

type Suggestion = { kind: "product" | "category" | "department" | "page"; href: string; label: string; detail?: string };

/**
 * The storefront search bar: always visible in the header on desktop and
 * mobile. Suggestions appear as you type (products with their "from" price,
 * departments, categories and pages); Enter or the button runs a full search
 * at /search. It's a plain GET form, so it works before JavaScript loads.
 */
export function SearchBar({ id, className = "" }: { id: string; className?: string }) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : { suggestions: [] }))
        .then((data: { suggestions: Suggestion[] }) => {
          setSuggestions(data.suggestions);
          setActive(-1);
        })
        .catch(() => undefined);
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Close the list when focus or a click goes elsewhere.
  useEffect(() => {
    const close = (event: MouseEvent | FocusEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("focusin", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("focusin", close);
    };
  }, []);

  const showList = open && suggestions.length > 0;

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <form
      ref={boxRef}
      action="/search"
      method="get"
      role="search"
      className={`relative ${className}`}
      onSubmit={(event) => {
        if (active >= 0 && suggestions[active]) {
          event.preventDefault();
          go(suggestions[active].href);
        } else if (!query.trim()) {
          event.preventDefault();
        } else {
          setOpen(false);
        }
      }}
    >
      <label htmlFor={id} className="sr-only">Search products, categories and pages</label>
      <div className="flex rounded-sm border-2 border-seam-blue bg-white focus-within:ring-2 focus-within:ring-seam-blue/30">
        <input
          id={id}
          name="q"
          type="search"
          autoComplete="off"
          placeholder="Search sand, cement, rebar, bricks, roof sheets…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!showList) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => (i + 1) % suggestions.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          className="min-w-0 flex-1 bg-transparent px-3 py-2 font-body text-sm text-basalt placeholder:text-slate/70 focus:outline-none"
        />
        <button type="submit" className="flex items-center gap-1.5 bg-seam-blue px-3 font-body text-sm font-semibold text-limestone hover:bg-basalt sm:px-4">
          <Search className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Search</span>
        </button>
      </div>
      {showList && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 z-40 mt-1 max-h-[70vh] overflow-y-auto rounded-sm border border-basalt/10 bg-white py-1 shadow-lg">
          {suggestions.map((s, i) => (
            <li
              key={`${s.kind}-${s.href}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                go(s.href);
              }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-2 ${i === active ? "bg-limestone" : ""}`}
            >
              <span className="block font-body text-sm text-basalt">{s.label}</span>
              {s.detail && <span className="block font-body text-xs text-slate">{s.detail}</span>}
            </li>
          ))}
          <li
            role="option"
            aria-selected={false}
            onMouseDown={(e) => {
              e.preventDefault();
              go(`/search?q=${encodeURIComponent(query.trim())}`);
            }}
            className="cursor-pointer border-t border-basalt/10 px-3 py-2 font-body text-xs font-semibold text-seam-blue hover:bg-limestone"
          >
            See all results for “{query.trim()}” →
          </li>
        </ul>
      )}
    </form>
  );
}
