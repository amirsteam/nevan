/**
 * Shell for the sign-in and sign-up pages: a single column on phones and
 * tablets; from `lg` a two-column card with what an account is for on the left.
 */
import type { ReactNode } from "react";
import { Heart, Package, PartyPopper, Truck } from "lucide-react";
import logo from "../../assets/logo.png";
import { FREE_SHIPPING_THRESHOLD, RETURN_WINDOW_DAYS } from "../../config/store";
import { formatPrice } from "../../utils/helpers";

const BENEFITS = [
  { icon: Package, title: "Track every order", text: "See where your parcel is, from packing to your door." },
  { icon: Heart, title: "Save favourites", text: "Keep a wishlist of the sizes and colours you love." },
  { icon: Truck, title: "Faster checkout", text: "Saved addresses make the next order take seconds." },
  { icon: PartyPopper, title: "Festival offers", text: "Hear about Dashain, Tihar and other sales." },
];

const Benefits = () => (
  <aside className="hidden lg:flex lg:order-first flex-col gap-10 bg-[var(--color-primary-soft)] p-10 xl:p-12">
    <div>
      <img src={logo} alt="" className="h-14 w-auto mb-6" />
      <h2 className="text-2xl font-bold mb-2">Made for little ones, handmade in Nepal</h2>
      <p className="text-[var(--color-text-muted)]">One account for your orders, wishlist and addresses.</p>
    </div>

    <ul className="space-y-5">
      {BENEFITS.map(({ icon: Icon, title, text }) => (
        <li key={title} className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-primary)]">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-medium">{title}</p>
            <p className="text-sm text-[var(--color-text-muted)]">{text}</p>
          </div>
        </li>
      ))}
    </ul>

    <p className="mt-auto text-sm text-[var(--color-text-muted)]">
      <span className="whitespace-nowrap">Cash on delivery or eSewa</span> ·{" "}
      <span className="whitespace-nowrap">Free shipping over {formatPrice(FREE_SHIPPING_THRESHOLD)}</span> ·{" "}
      <span className="whitespace-nowrap">{RETURN_WINDOW_DAYS}-day returns</span>
    </p>
  </aside>
);

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Under the form, e.g. "New to Nevan? Create an account" */
  footer?: ReactNode;
}

const AuthLayout = ({ title, subtitle, children, footer }: AuthLayoutProps) => (
  <div className="container-app py-8 sm:py-12 lg:py-16">
    <div className="mx-auto grid max-w-md lg:max-w-5xl lg:grid-cols-2 lg:overflow-hidden lg:rounded-2xl lg:border lg:border-[var(--color-border)] lg:bg-[var(--color-surface)] lg:shadow-[var(--shadow-md)]">
      <div className="lg:p-10 xl:p-12">
        <div className="mb-6 text-center lg:text-left">
          <h1 className="text-3xl font-bold mb-2">{title}</h1>
          <p className="text-[var(--color-text-muted)]">{subtitle}</p>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 lg:rounded-none lg:border-0 lg:p-0">
          {children}
        </div>

        {footer && (
          <p className="mt-6 text-center text-sm text-[var(--color-text-muted)] lg:text-left">{footer}</p>
        )}
      </div>

      {/* After the form in the DOM so the page's h1 comes first; shown on the left */}
      <Benefits />
    </div>
  </div>
);

export default AuthLayout;
