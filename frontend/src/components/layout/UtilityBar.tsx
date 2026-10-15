/**
 * Slim strip above the header with the store's promises (payment, free
 * shipping, returns, phone, social accounts). Gives way to the campaign announcement bar while
 * a festival campaign is live.
 */
import { Banknote, Truck, RotateCcw, Phone } from "lucide-react";
import { useCampaign } from "../../context/CampaignContext";
import { CONTACT, RETURN_WINDOW_DAYS } from "../../config/store";
import { SOCIAL_LINKS } from "../../config/social";
import { useShippingSettings } from "../../hooks/useShippingSettings";
import { formatPrice } from "../../utils/helpers";

// Display is set per item (`inline-flex` or `hidden …:inline-flex`), never here
const item = "items-center gap-1.5 whitespace-nowrap";
const icon = "w-3.5 h-3.5 shrink-0";

const UtilityBar = () => {
  const { campaign, isPreview } = useCampaign();
  const { freeShippingThreshold } = useShippingSettings();
  if (campaign && (isPreview || campaign.state === "live")) return null;

  return (
    <div className="bg-[var(--color-primary-soft)] text-[var(--color-text)] text-xs">
      <div className="container-app flex items-center justify-between gap-x-4 py-1.5">
        <ul className="flex min-w-0 items-center gap-x-6" aria-label="Why shop with us">
          <li className={`${item} inline-flex`}>
            <Truck className={icon} aria-hidden="true" />
            <span className="sm:hidden">Free shipping on {formatPrice(freeShippingThreshold)}+</span>
            <span className="hidden sm:inline">Free shipping on orders of {formatPrice(freeShippingThreshold)}+</span>
          </li>
          <li className={`${item} hidden min-[520px]:inline-flex`}>
            <Banknote className={icon} aria-hidden="true" />
            Cash on delivery or eSewa
          </li>
          <li className={`${item} hidden lg:inline-flex`}>
            <RotateCcw className={icon} aria-hidden="true" />
            {RETURN_WINDOW_DAYS}-day returns
          </li>
        </ul>
        <div className="flex shrink-0 items-center gap-4">
          <a href={CONTACT.phoneHref} className={`${item} hidden md:inline-flex font-medium hover:text-[var(--color-primary)]`}>
            <Phone className={icon} aria-hidden="true" />
            {CONTACT.phoneDisplay}
          </a>
          {/* Always shown: the shop sells mostly through Instagram and Facebook */}
          <ul className="flex items-center gap-1" aria-label="Follow us">
            {SOCIAL_LINKS.map(({ network, href, logo }) => (
              <li key={network} className="flex">
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Nevan on ${network}`}
                  className="rounded-full p-1 transition-transform hover:scale-110"
                >
                  <img src={logo} alt={`Nevan on ${network} (opens in a new tab)`} width={20} height={20} className="w-5 h-5" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UtilityBar;
