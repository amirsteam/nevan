/**
 * "Not sure which size?" help band: size is the main worry when buying baby
 * clothes online, so offer the size guide, live chat and WhatsApp in one place.
 */
import { useState } from "react";
import { MessageCircle, Ruler } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { CONTACT } from "../../config/store";
import { useAppDispatch } from "../../store/hooks";
import { openChat } from "../../store/chatSlice";
import SizeGuide from "../SizeGuide";

const HelpBand = () => {
  const dispatch = useAppDispatch();
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  return (
    <section aria-labelledby="size-help-title">
      <div className="reveal relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-8 md:px-10 md:py-10 grid lg:grid-cols-[1fr_auto] gap-6 lg:gap-10 items-center">
        <span aria-hidden="true" className="absolute -right-16 -top-24 w-56 h-56 rounded-full bg-[var(--color-accent)]/15" />
        <div className="relative flex gap-4 md:gap-5">
          <span className="hidden sm:flex w-14 h-14 shrink-0 rounded-2xl bg-[var(--color-accent-light)] items-center justify-center">
            <Ruler className="w-7 h-7 text-[var(--color-accent-strong)]" aria-hidden="true" />
          </span>
          <div>
            <h2 id="size-help-title" className="text-2xl md:text-3xl font-bold mb-2">
              Not sure which size to pick?
            </h2>
            <p className="text-[var(--color-text-muted)] max-w-2xl">
              Babies grow fast and every outfit fits a little differently. Check the size guide, or ask us and we'll help
              you choose. {CONTACT.replyTime}.
            </p>
          </div>
        </div>
        {/* Full-width stacked buttons on phones */}
        <div className="relative grid sm:flex sm:flex-wrap gap-3">
          <button type="button" onClick={() => setShowSizeGuide(true)} className="btn btn-primary">
            <Ruler className="w-4 h-4" aria-hidden="true" />
            Size guide
          </button>
          <button
            type="button"
            onClick={() => dispatch(openChat({ draft: "Hi! Could you help me choose the right size?" }))}
            className="btn btn-secondary bg-[var(--color-surface)]"
          >
            <MessageCircle className="w-4 h-4" aria-hidden="true" />
            Chat with us
          </button>
          <a href={CONTACT.whatsappHref} target="_blank" rel="noopener noreferrer" className="btn btn-secondary bg-[var(--color-surface)]">
            <FaWhatsapp className="w-4 h-4 text-[#128c4a] dark:text-[#25d366]" aria-hidden="true" />
            WhatsApp
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>
      </div>
      <SizeGuide isOpen={showSizeGuide} onClose={() => setShowSizeGuide(false)} />
    </section>
  );
};

export default HelpBand;
