/**
 * The chat window's first screen for shoppers (not admins): a greeting,
 * sign-in for visitors, a few popular pieces, and suggested questions that
 * are answered instantly from the shop's own facts (utils/chatAnswers.ts).
 * Anything else goes to the team: "Ask anything" sends it as a chat message,
 * and every answer offers "Ask our team".
 */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight, ChevronRight, Loader2, Send } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAppDispatch } from "../../store/hooks";
import { setIsOpen, type ChatMessage } from "../../store/chatSlice";
import { CHAT_PICK_IMAGE_WIDTH, chatPickPhoto, loadChatPicks } from "../../utils/chatPicks";
import { ordersAPI } from "../../api/orders";
import { useShippingSettings } from "../../hooks/useShippingSettings";
import {
  ORDER_STATUS_TEXT,
  QUICK_QUESTIONS,
  quickAnswer,
  type AnswerLink,
  type QuickQuestion,
} from "../../utils/chatAnswers";
import { cardPrice } from "../../utils/pricing";
import { formatPrice } from "../../utils/helpers";
import { imageUrl, onImageError } from "../../utils/image";
import { CONTACT } from "../../config/store";
import type { IProduct } from "../../types";

const MAX_MESSAGE_LENGTH = 2000;

interface OrderRow {
  label: string;
  detail: string;
  to: string;
}

interface Answer {
  lines: string[];
  links: AnswerLink[];
  rows?: OrderRow[];
}

interface Entry {
  id: number;
  question: QuickQuestion;
  answer: Answer | null; // null while loading
}

/** Tilt and place of each card in the fan */
const FAN = ["left-0 top-2 -rotate-[7deg]", "left-[68px] top-0 rotate-[6deg]"];

interface ChatHomeProps {
  /** Send a message to the team ("Ask anything") */
  onSend: (message: string) => void;
  /** Open the conversation, optionally with text in the message box */
  onAskTeam: (prefill?: string) => void;
  /** Latest message of the shopper's conversation, if there is one */
  lastMessage?: ChatMessage;
  unreadCount: number;
}

const ChatHome = ({ onSend, onAskTeam, lastMessage, unreadCount }: ChatHomeProps) => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const shipping = useShippingSettings();
  const [picks, setPicks] = useState<IProduct[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  const firstName = user?.name?.trim().split(/\s+/)[0];

  useEffect(() => {
    let cancelled = false;
    loadChatPicks().then((products) => !cancelled && setPicks(products));
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the newest answer in view
  useEffect(() => {
    const el = scrollRef.current;
    if (el && entries.length > 0) el.scrollTop = el.scrollHeight;
  }, [entries]);

  /** On phones the chat covers the page, so get out of the way when leaving it */
  const closeOnPhone = () => {
    if (window.matchMedia("(max-width: 639px)").matches) dispatch(setIsOpen(false));
  };

  const trackAnswer = async (): Promise<Answer> => {
    if (!isAuthenticated) {
      return {
        lines: ["Sign in to see your orders and where each one is."],
        links: [{ label: "Sign in", to: "/login" }],
      };
    }
    try {
      const res = await ordersAPI.getMyOrders({ limit: 3 });
      const orders = res.data.orders || [];
      if (orders.length === 0) {
        return {
          lines: ["You haven't placed an order yet."],
          links: [{ label: "Browse new pieces", to: "/products" }],
        };
      }
      return {
        lines: [orders.length === 1 ? "Here's your latest order:" : "Here are your latest orders:"],
        rows: orders.map((order) => {
          const orderStatus = order.orderStatus ?? order.status ?? "pending";
          return {
            label: `#${order.orderNumber}`,
            detail: `${ORDER_STATUS_TEXT[orderStatus]} · ${formatPrice(order.pricing?.total ?? order.total)}`,
            to: `/orders/${order._id}`,
          };
        }),
        links: [{ label: "All my orders", to: "/orders" }],
      };
    } catch {
      return {
        lines: ["We couldn't load your orders just now."],
        links: [{ label: "Open My orders", to: "/orders" }],
      };
    }
  };

  const ask = async (question: QuickQuestion) => {
    const id = nextId.current++;
    if (question.id !== "track") {
      const answer = quickAnswer(question.id, shipping);
      setEntries((list) => [...list, { id, question, answer }]);
      return;
    }
    setEntries((list) => [...list, { id, question, answer: null }]);
    const answer = await trackAnswer();
    setEntries((list) => list.map((entry) => (entry.id === id ? { ...entry, answer } : entry)));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const message = text.trim();
    if (!message) return;
    onSend(message);
  };

  const asked = new Set(entries.map((entry) => entry.question.id));
  const remaining = QUICK_QUESTIONS.filter((q) => !asked.has(q.id));

  const answerLink = (link: AnswerLink) =>
    link.external ? (
      <a
        key={link.label}
        href={link.to}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-[var(--color-primary)] hover:border-[var(--color-primary)]"
      >
        {link.label}
        <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    ) : (
      <Link
        key={link.label}
        to={link.to}
        state={link.to === "/login" ? { from: location } : undefined}
        onClick={closeOnPhone}
        className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-[var(--color-primary)] hover:border-[var(--color-primary)]"
      >
        {link.label}
        <ChevronRight className="w-3 h-3" aria-hidden="true" />
      </Link>
    );

  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {/* Greeting with a fan of popular pieces */}
        <section className="relative bg-gradient-to-b from-[var(--color-primary-soft)] to-[var(--color-surface)] px-4 pt-4 pb-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {!isAuthenticated && (
                <Link
                  to="/login"
                  state={{ from: location }}
                  onClick={closeOnPhone}
                  className="inline-flex rounded-full bg-[var(--color-text)] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-surface)] hover:opacity-90"
                >
                  Sign in
                </Link>
              )}
              <p className={`${isAuthenticated ? "" : "mt-3"} text-[15px] font-semibold leading-snug text-[var(--color-text)]`}>
                <span aria-hidden="true">👋 </span>
                Hi{firstName ? ` ${firstName}` : ""}, message us with any questions.
              </p>
              <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">We're happy to help!</p>
            </div>

            {picks.length > 0 && (
              <ul className="relative h-[118px] w-[152px] shrink-0" aria-label="Popular right now">
                {picks.map((product, i) => {
                  const photo = chatPickPhoto(product);
                  const price = cardPrice(product);
                  return (
                    <li
                      key={product._id}
                      className={`absolute ${FAN[i]} transition-transform duration-200 hover:z-10 hover:rotate-0 hover:scale-105 focus-within:z-10 focus-within:rotate-0`}
                    >
                      <Link
                        to={`/products/${product.slug}`}
                        onClick={closeOnPhone}
                        className="block w-[82px] rounded-xl bg-white p-1 shadow-[var(--shadow-md)] ring-1 ring-black/5"
                      >
                        <img
                          src={imageUrl(photo?.url, CHAT_PICK_IMAGE_WIDTH)}
                          onError={onImageError}
                          alt=""
                          width={74}
                          height={74}
                          className="h-[74px] w-[74px] rounded-lg bg-[#f3ece9] object-cover"
                        />
                        <span className="mt-0.5 block truncate px-0.5 text-center text-[10px] font-medium leading-tight text-[#3d2c29]">
                          {product.name}
                        </span>
                        <span className="sr-only">
                          , {price.from ? "from " : ""}
                          {formatPrice(price.price)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <div className="space-y-3 px-4 pb-4">
          {/* An existing conversation with the team */}
          {lastMessage && (
            <button
              type="button"
              onClick={() => onAskTeam()}
              className="flex w-full items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-left shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--color-primary)]"
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                  Your conversation
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-red-700 px-2 py-0.5 text-[11px] font-bold text-white">
                      {unreadCount} new
                    </span>
                  )}
                </span>
                <span className="block truncate text-xs text-[var(--color-text-muted)]">
                  {lastMessage.senderRole === "admin" ? "Nevan: " : "You: "}
                  {lastMessage.content || "Photo"}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
            </button>
          )}

          {/* Questions asked here and their instant answers */}
          <div aria-live="polite" className="space-y-3">
            {entries.map(({ id, question, answer }) => (
              <div key={id} className="space-y-2">
                <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-[var(--color-primary)] px-3.5 py-2 text-sm text-[var(--color-on-primary)]">
                  {question.label}
                </p>
                <div className="flex items-end gap-2">
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-xs font-bold text-[var(--color-primary)]"
                  >
                    N
                  </span>
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-[var(--color-surface-muted)] px-3.5 py-2.5 text-sm text-[var(--color-text)]">
                    {answer === null ? (
                      <span className="inline-flex items-center gap-2 text-[var(--color-text-muted)]">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Looking up your orders…
                      </span>
                    ) : (
                      <>
                        <span className="sr-only">Nevan: </span>
                        {answer.lines.map((line) => (
                          <p key={line} className="mb-1.5 last:mb-0">
                            {line}
                          </p>
                        ))}
                        {answer.rows && (
                          <ul className="my-2 space-y-1.5">
                            {answer.rows.map((row) => (
                              <li key={row.to}>
                                <Link
                                  to={row.to}
                                  onClick={closeOnPhone}
                                  className="flex items-center justify-between gap-2 rounded-xl bg-[var(--color-surface)] px-3 py-2 hover:ring-1 hover:ring-[var(--color-primary)]"
                                >
                                  <span className="min-w-0">
                                    <span className="block text-xs font-semibold">{row.label}</span>
                                    <span className="block text-xs text-[var(--color-text-muted)]">{row.detail}</span>
                                  </span>
                                  <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                        {answer.links.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">{answer.links.map(answerLink)}</div>
                        )}
                        <p className="mt-2.5 border-t border-[var(--color-border)] pt-2 text-xs text-[var(--color-text-muted)]">
                          Still need help?{" "}
                          <button
                            type="button"
                            onClick={() => onAskTeam(`${question.label} `)}
                            className="font-semibold text-[var(--color-primary-dark)] underline-offset-2 hover:underline"
                          >
                            Ask our team
                          </button>
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Suggested questions */}
          {remaining.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-[var(--color-text-muted)]">
                {entries.length > 0 ? "Something else?" : "Popular questions"}
              </p>
              <ul className="flex flex-wrap gap-2">
                {remaining.map((question) => (
                  <li key={question.id}>
                    <button
                      type="button"
                      onClick={() => ask(question)}
                      className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-left text-sm text-[var(--color-text)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                    >
                      {question.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[11px] leading-relaxed text-[var(--color-text-muted)]">
            Instant answers come from our shop policies. Messages go to the Nevan team — {CONTACT.replyTime.replace(/^We /, "we ")}. See our{" "}
            <Link to="/privacy" onClick={closeOnPhone} className="underline underline-offset-2 hover:text-[var(--color-primary)]">
              privacy policy
            </Link>
            .
          </p>
        </div>
      </div>

      {/* Ask anything: goes to the team */}
      <form onSubmit={handleSubmit} className="border-t border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <div className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] py-1 pl-4 pr-1 focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]/30">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder="Ask anything…"
            aria-label="Message the Nevan team"
            className="min-w-0 flex-1 bg-transparent py-1.5 text-base text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] sm:text-sm"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            aria-label="Send message"
            className="rounded-full bg-[var(--color-primary)] p-2 text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-dark)] disabled:opacity-40"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </form>
    </>
  );
};

export default ChatHome;
