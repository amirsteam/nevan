/**
 * Slim strip above the header with the store's promises (payment, free
 * shipping, returns, phone). Gives way to the campaign announcement bar while
 * a festival campaign is live.
 */
import { Banknote, Truck, RotateCcw, Phone } from "lucide-react";
import { useCampaign } from "../../context/CampaignContext";
import { CONTACT, RETURN_WINDOW_DAYS } from "../../config/store";
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
      <div className="container-app flex items-center justify-center md:justify-between gap-x-6 py-2">
        <ul className="flex items-center justify-center gap-x-6" aria-label="Why shop with us">
          <li className={`${item} inline-flex`}>
            <Truck className={icon} aria-hidden="true" />
            Free shipping on orders of {formatPrice(freeShippingThreshold)}+
          </li>
          <li className={`${item} hidden min-[420px]:inline-flex`}>
            <Banknote className={icon} aria-hidden="true" />
            Cash on delivery or eSewa
          </li>
          <li className={`${item} hidden sm:inline-flex`}>
            <RotateCcw className={icon} aria-hidden="true" />
            {RETURN_WINDOW_DAYS}-day returns
          </li>
        </ul>
        <a href={CONTACT.phoneHref} className={`${item} hidden md:inline-flex font-medium hover:text-[var(--color-primary)]`}>
          <Phone className={icon} aria-hidden="true" />
          {CONTACT.phoneDisplay}
        </a>
      </div>
    </div>
  );
};

export default UtilityBar;
