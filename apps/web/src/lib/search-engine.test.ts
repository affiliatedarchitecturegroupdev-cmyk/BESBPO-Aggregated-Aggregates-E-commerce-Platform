/** Tests for the search engine (run with `pnpm --filter web test`: compiled by tsc, run by node --test). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createSearchIndex, editDistance, normalise, stem, type SearchDoc } from "./search-engine";

const doc = (id: string, name: string, text: string, facets: Record<string, string | null>, price: number | null = null): SearchDoc => ({ id, name, text, facets, price });

const DOCS: SearchDoc[] = [
  doc("ibr", "IBR Roof Sheet 0.47 mm Galvanised × 6.0 m", "Roof Sheeting roofing", { department: "Roofing", availability: "Buy online" }, 420),
  doc("ybar", "Y12 High-Tensile Rebar 6 m", "Reinforcing Bar steel SANS 920", { department: "Steel", availability: "Buy online" }, 95),
  doc("cem", "PPC Surebuild 42,5N Cement 50 kg", "Cement & Hydraulic Binders", { department: "Cement & Concrete", availability: "Buy online", brand: "PPC" }, 115),
  doc("pine", "SA Pine S5 H2 Sized 38 × 114 mm", "Roof & Structural Timber", { department: "Timber", availability: "Quote" }),
  doc("lawn", "Kikuyu Instant Lawn", "Instant Lawn & Lawn Seed garden", { department: "Garden", availability: "Quote" }),
  doc("tiles", "Porcelain Floor Tiles 600 × 600 mm", "Floor & Wall Tiles", { department: "Tiles", availability: "Quote" }),
  doc("prod", "Concrete Repair Mortar", "products for concrete", { department: "Chemicals", availability: "Quote" }),
];
const index = createSearchIndex(DOCS);
const ids = (r: { hits: SearchDoc[] }) => r.hits.map((h) => h.id);

test("normalises decimal commas, × and punctuation", () => {
  assert.equal(normalise("42,5N Cement — 38 × 114"), "42.5n cement 38x114");
  assert.equal(stem("pipes"), "pipe");
  assert.equal(stem("batteries"), "battery");
  assert.equal(stem("glass"), "glass");
  assert.equal(editDistance("cemnt", "cement"), 1);
  assert.equal(editDistance("recieve", "receive"), 1);
});

test("synonyms: trade words find the catalogue's words", () => {
  assert.deepEqual(ids(index.search({ query: "roof sheets" })), ["ibr"]);
  assert.deepEqual(ids(index.search({ query: "reinforcing steel" })), ["ybar"]);
  assert.deepEqual(ids(index.search({ query: "wood" })), ["pine"]);
  assert.deepEqual(ids(index.search({ query: "grass" })), ["lawn"]);
});

test("numbers and sizes match as written or split", () => {
  assert.deepEqual(ids(index.search({ query: "42.5" })), ["cem"]);
  assert.deepEqual(ids(index.search({ query: "38x114" })), ["pine"]);
  assert.deepEqual(ids(index.search({ query: "38 114" })), ["pine"]);
});

test("typos are corrected against catalogue words, and reported", () => {
  const r = index.search({ query: "porcelian tile" });
  assert.deepEqual(ids(r), ["tiles"]);
  assert.deepEqual(r.corrections, [{ from: "porcelian", to: "porcelain" }]);
  assert.deepEqual(ids(index.search({ query: "cemnt" })), ["cem"]);
});

test("matches start at a word, so short words don't match inside others", () => {
  assert.deepEqual(ids(index.search({ query: "rod" })), []);
  assert.deepEqual(ids(index.search({ query: "cem" })), ["cem"]);
});

test("facets count with the other filters applied, and filters narrow results", () => {
  const all = index.search({});
  assert.equal(all.total, DOCS.length);
  assert.deepEqual(all.facets.availability, [{ value: "Quote", count: 4 }, { value: "Buy online", count: 3 }]);
  const online = index.search({ filters: { availability: "Buy online" } });
  assert.equal(online.total, 3);
  // The availability facet still offers "Quote" while it's filtered (it ignores its own filter).
  assert.equal(online.facets.availability.length, 2);
  assert.deepEqual(online.facets.department.map((f) => f.value).sort(), ["Cement & Concrete", "Roofing", "Steel"]);
});

test("sorting by price puts quoted products last; pages slice the results", () => {
  const r = index.search({ sort: "price-asc", pageSize: 2, page: 1 });
  assert.deepEqual(ids(r), ["ybar", "cem"]);
  assert.equal(r.pages, 4);
  const last = index.search({ sort: "price-asc", pageSize: 2, page: 99 });
  assert.equal(last.page, 4);
  assert.equal(index.search({ sort: "price-desc" }).hits[0].id, "ibr");
});

test("with no query, buy-online products come first", () => {
  const r = index.search({});
  assert.deepEqual(ids(r).slice(0, 3).sort(), ["cem", "ibr", "ybar"]);
});
