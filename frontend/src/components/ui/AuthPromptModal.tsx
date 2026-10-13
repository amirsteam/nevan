/**
 * Auth Prompt Modal
 * Sign in or create an account when a signed-out shopper adds to cart, with the
 * item they chose as a reminder. Uses the same forms as the /login and /register
 * pages; the shared Modal handles focus, Escape and scroll lock.
 */
import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { usePendingCart } from "../../context/PendingCartContext";
import { formatPrice } from "../../utils/helpers";
import Modal from "./Modal";
import Tabs, { TabContent, TabList, TabTrigger } from "./Tabs";
import GoogleSignInButton from "../auth/GoogleSignInButton";
import SignInForm from "../auth/SignInForm";
import SignUpForm from "../auth/SignUpForm";

type TabValue = "signin" | "signup";

const AuthPromptModal = () => {
  const { pendingItem, isModalOpen, closeModal } = usePendingCart();
  const [activeTab, setActiveTab] = useState<TabValue>("signin");
  // Filled when sign-up finds an existing account, so sign-in starts with that email
  const [signInEmail, setSignInEmail] = useState("");

  // The pending item is added to the cart by the component that opened this
  const handleClose = () => {
    closeModal();
    setActiveTab("signin");
    setSignInEmail("");
  };

  const action = pendingItem ? " and add to cart" : "";

  return (
    <Modal
      isOpen={isModalOpen}
      onClose={handleClose}
      title="Sign in to continue"
      description="Sign in or create an account to add items to your cart"
      size="md"
      bodyClassName="space-y-5"
    >
      {pendingItem && (
        <div className="flex items-center gap-4 rounded-lg bg-[var(--color-primary-soft)] p-3">
          <img
            src={pendingItem.productImage}
            alt=""
            className="h-16 w-16 shrink-0 rounded-lg object-cover bg-[var(--color-bg)]"
          />
          <div className="min-w-0 flex-1">
            <p className="mb-0.5 flex items-center gap-1.5 text-xs font-medium text-[var(--color-primary)]">
              <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
              Ready to add to your cart
            </p>
            <p className="truncate font-medium">{pendingItem.productName}</p>
            <p className="text-sm text-[var(--color-text-muted)]">
              {formatPrice(pendingItem.productPrice)}
              {pendingItem.variantDetails &&
                ` · ${pendingItem.variantDetails.size} · ${pendingItem.variantDetails.color}`}
              {` · Qty ${pendingItem.quantity}`}
            </p>
          </div>
        </div>
      )}

      <GoogleSignInButton onSuccess={handleClose} />

      <Tabs value={activeTab} defaultValue="signin" onChange={(v) => setActiveTab(v as TabValue)}>
        <TabList variant="underline">
          <TabTrigger value="signin" variant="underline">
            Sign in
          </TabTrigger>
          <TabTrigger value="signup" variant="underline">
            Create account
          </TabTrigger>
        </TabList>

        <TabContent value="signin">
          <SignInForm
            key={signInEmail}
            initialEmail={signInEmail}
            submitLabel={`Sign in${action}`}
            onSuccess={handleClose}
            onLeave={handleClose}
          />
        </TabContent>
        <TabContent value="signup">
          <SignUpForm
            submitLabel={`Create account${action}`}
            onSuccess={handleClose}
            onSignInInstead={(email) => {
              setSignInEmail(email);
              setActiveTab("signin");
            }}
            onLeave={handleClose}
          />
        </TabContent>
      </Tabs>
    </Modal>
  );
};

export default AuthPromptModal;
