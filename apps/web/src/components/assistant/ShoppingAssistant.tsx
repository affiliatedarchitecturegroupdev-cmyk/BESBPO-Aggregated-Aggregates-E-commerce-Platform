"use client";

import { MessageCircle, Send, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cart as cartStore, useCart } from "@/lib/cart";
import type { AssistantCard, AssistantReply, AssistantState } from "@/lib/assistant/types";

type Message = { role: "user"; text: string } | { role: "assistant"; reply: AssistantReply };

const KEY = "aa-assistant";
const HIDDEN_ON = ["/admin", "/partners/portal"];

function load(): { messages: Message[]; state: AssistantState } {
  try {
    const raw = sessionStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && Array.isArray(parsed.messages)) return { messages: parsed.messages.slice(-40), state: parsed.state ?? {} };
  } catch {
    // storage unavailable: the chat lasts for this page only
  }
  return { messages: [], state: {} };
}

function save(messages: Message[], state: AssistantState) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ messages: messages.slice(-40), state }));
  } catch {
    // ignore
  }
}

function Card({ card }: { card: AssistantCard }) {
  const [added, setAdded] = useState(false);
  return (
    <li className="rounded-sm border border-basalt/10 bg-white p-3">
      <Link href={card.href} className="font-body text-sm font-semibold text-basalt hover:text-seam-blue hover:underline">
        {card.name}
      </Link>
      {card.note && <p className="mt-0.5 font-body text-xs text-slate">{card.note}</p>}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-xs text-seam-blue">{card.price ?? "Price on request"}</span>
        {card.add ? (
          <button
            type="button"
            onClick={() => {
              cartStore.add({ sku: card.sku, unit: card.add!.unit, quantity: card.add!.quantity });
              setAdded(true);
            }}
            disabled={added}
            className="rounded-sm bg-seam-blue px-2.5 py-1 font-body text-xs font-semibold text-limestone hover:bg-basalt disabled:bg-emerald-700"
          >
            {added ? "Added ✓" : `Add ${card.add.label}`}
          </button>
        ) : card.quoteHref ? (
          <Link href={card.quoteHref} className="rounded-sm border border-seam-blue px-2.5 py-1 font-body text-xs font-semibold text-seam-blue hover:bg-seam-blue hover:text-limestone">
            Request a quote
          </Link>
        ) : null}
      </div>
    </li>
  );
}

/**
 * The shopping assistant (SHOPPING_ASSISTANT.md): a chat panel on every
 * storefront page that knows the page and the cart. It asks /api/assistant,
 * which answers from the store's own data. The conversation is kept in this
 * tab only (sessionStorage) and is never stored on our side.
 */
export function ShoppingAssistant() {
  const pathname = usePathname() ?? "/";
  const cart = useCart();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [state, setState] = useState<AssistantState>({});
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const greetedOn = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = load();
    setMessages(saved.messages);
    setState(saved.state);
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function ask(text: string, opts: { silent?: boolean } = {}) {
    setBusy(true);
    setError(null);
    const next: Message[] = opts.silent ? messages : [...messages, { role: "user", text }];
    setMessages(next);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, path: pathname, cart: cart.lines, state }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      const reply = data as AssistantReply;
      const withReply: Message[] = [...next, { role: "assistant", reply }];
      const nextState = reply.state ?? {};
      setMessages(withReply);
      setState(nextState);
      save(withReply, nextState);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  // Greet once per page the panel is opened on, so a product page gets its own context.
  useEffect(() => {
    if (!open || busy || greetedOn.current === pathname) return;
    greetedOn.current = pathname;
    const last = messages[messages.length - 1];
    if (!messages.length || (pathname.startsWith("/products/") && !(last?.role === "assistant" && last.reply.intent === "greeting"))) void ask("", { silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pathname]);

  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  const lastReply = [...messages].reverse().find((m): m is Extract<Message, { role: "assistant" }> => m.role === "assistant")?.reply;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-seam-blue px-4 py-3 font-body text-sm font-semibold text-limestone shadow-lg hover:bg-basalt"
          aria-label="Open the shopping assistant"
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          <span className="hidden sm:inline">Ask us</span>
        </button>
      )}
      {open && (
        <section
          role="dialog"
          aria-label="Shopping assistant"
          className="fixed inset-x-0 bottom-0 z-40 flex h-[85vh] flex-col border border-basalt/10 bg-limestone shadow-2xl sm:inset-x-auto sm:bottom-4 sm:right-4 sm:h-[34rem] sm:max-h-[calc(100vh-2rem)] sm:w-[24rem] sm:rounded-sm"
        >
          <header className="flex items-center justify-between bg-basalt px-4 py-3 text-limestone sm:rounded-t-sm">
            <div>
              <p className="font-display text-sm font-semibold">Shopping assistant</p>
              <p className="font-mono text-[10px] text-limestone/60">Automated · answers from our catalogue</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close the assistant" className="rounded-sm p-1 hover:bg-limestone/10">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3" aria-live="polite">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <p key={i} className="ml-auto max-w-[85%] rounded-sm bg-seam-blue px-3 py-2 font-body text-sm text-limestone">
                  {m.text}
                </p>
              ) : (
                <div key={i} className="max-w-[95%] space-y-2">
                  <p className="whitespace-pre-line rounded-sm bg-white px-3 py-2 font-body text-sm text-basalt shadow-sm">{m.reply.text}</p>
                  {m.reply.cards && m.reply.cards.length > 0 && (
                    <ul className="space-y-2">
                      {m.reply.cards.map((c) => (
                        <Card key={c.sku} card={c} />
                      ))}
                    </ul>
                  )}
                  {m.reply.links && m.reply.links.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {m.reply.links.map((l) =>
                        l.href.startsWith("http") ? (
                          <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="rounded-full border border-seam-blue/40 bg-white px-3 py-1 font-body text-xs font-semibold text-seam-blue hover:border-seam-blue">
                            {l.label} ↗
                          </a>
                        ) : (
                          <Link key={l.href} href={l.href} className="rounded-full border border-seam-blue/40 bg-white px-3 py-1 font-body text-xs font-semibold text-seam-blue hover:border-seam-blue">
                            {l.label}
                          </Link>
                        ),
                      )}
                    </div>
                  )}
                </div>
              ),
            )}
            {!messages.length && !busy && (
              <p className="font-body text-sm text-slate">Ask about materials, prices, quantities, delivery, hire or design — for example &ldquo;What do I need for a driveway?&rdquo;</p>
            )}
            {busy && <p className="font-body text-xs text-slate">Thinking…</p>}
            {error && <p className="font-body text-xs text-red-800">{error}</p>}
          </div>

          {lastReply?.suggestions && lastReply.suggestions.length > 0 && !busy && (
            <div className="flex gap-2 overflow-x-auto border-t border-basalt/10 px-3 py-2">
              {lastReply.suggestions.map((s) => (
                <button key={s} type="button" onClick={() => void ask(s)} className="shrink-0 rounded-full border border-basalt/20 bg-white px-3 py-1 font-body text-xs text-basalt hover:border-seam-blue">
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const text = input.trim();
              if (!text || busy) return;
              setInput("");
              void ask(text);
            }}
            className="flex gap-2 border-t border-basalt/10 bg-white p-3 sm:rounded-b-sm"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={500}
              placeholder="Ask about materials, quantities, delivery…"
              aria-label="Your question"
              className="min-w-0 flex-1 rounded-sm border border-basalt/20 px-3 py-2 font-body text-sm"
            />
            <button type="submit" disabled={busy || !input.trim()} aria-label="Send" className="rounded-sm bg-seam-blue px-3 text-limestone hover:bg-basalt disabled:opacity-40">
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
          <p className="bg-white px-3 pb-2 font-body text-[10px] text-slate sm:rounded-b-sm">
            Please don&apos;t share personal details here. List prices only — your quote or checkout confirms the price.{" "}
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setMessages([]);
                  setState({});
                  save([], {});
                  greetedOn.current = null;
                }}
                className="underline hover:text-seam-blue"
              >
                Clear chat
              </button>
            )}
          </p>
        </section>
      )}
    </>
  );
}
