/**
 * Profile Page
 * Account area: details (editable), saved addresses, security, appearance,
 * plus shortcuts to orders and wishlist. The tab is kept in ?tab= so it can
 * be linked to.
 */
import { useState, useEffect, useCallback, FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Lock, Loader2, Package, Heart, ChevronRight, MapPin, Plus, Pencil, Trash2, Star } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { authAPI } from "../api/auth";
import { getErrorMessage } from "../utils/helpers";
import { NEPALI_MOBILE, normalizePhone, PROVINCE_NAMES } from "../utils/nepal";
import { usePageTitle } from "../hooks/usePageTitle";
import Tabs, { TabList, TabTrigger, TabContent } from "../components/ui/Tabs";
import Modal, { ConfirmModal } from "../components/ui/Modal";
import Breadcrumb from "../components/ui/Breadcrumb";
import { Skeleton } from "../components/ui/Skeleton";
import AddressForm from "../components/AddressForm";
import PasswordStrength from "../components/PasswordStrength";
import ThemeToggle from "../components/layout/ThemeToggle";
import type { ISavedAddress, ISavedAddressInput } from "../types";

const TABS = [
  { value: "profile", label: "Profile" },
  { value: "addresses", label: "Addresses" },
  { value: "security", label: "Security" },
  { value: "appearance", label: "Appearance" },
];

/* ---------- Profile details ---------- */
const DetailsPanel = () => {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const dirty = name.trim() !== (user?.name || "") || normalizePhone(phone) !== (user?.phone || "");

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Please enter your name");
    if (phone && !NEPALI_MOBILE.test(normalizePhone(phone))) return setError("Enter a 10-digit mobile number starting with 98 or 97");
    setSaving(true);
    try {
      const res = await authAPI.updateProfile({ name: name.trim(), phone: normalizePhone(phone) });
      updateUser({ name: res.data.user.name, phone: res.data.user.phone });
      toast.success("Profile updated");
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't save your profile"));
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <form onSubmit={handleSave} className="card p-5 md:p-6 space-y-4 max-w-xl" noValidate>
      <h2 className="text-lg font-semibold font-sans">Personal details</h2>
      {error && (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {error}
        </p>
      )}
      <div>
        <label htmlFor="profile-name" className="block text-sm font-medium mb-1">
          Full name
        </label>
        <input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="input" />
      </div>
      <div>
        <label htmlFor="profile-email" className="block text-sm font-medium mb-1">
          Email
        </label>
        <input id="profile-email" value={user.email} disabled className="input opacity-70" aria-describedby="profile-email-hint" />
        <p id="profile-email-hint" className="text-xs text-[var(--color-text-muted)] mt-1">
          Contact us on chat to change your email.
        </p>
      </div>
      <div>
        <label htmlFor="profile-phone" className="block text-sm font-medium mb-1">
          Mobile number
        </label>
        <input
          id="profile-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="98XXXXXXXX"
          className="input"
        />
      </div>
      <div className="flex items-center justify-between gap-3 pt-2">
        <p className="text-xs text-[var(--color-text-muted)]">
          Member since {new Date(user.createdAt || Date.now()).toLocaleDateString("en-US", { year: "numeric", month: "long" })}
        </p>
        <button type="submit" disabled={!dirty || saving} aria-busy={saving} className="btn btn-primary">
          {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          Save
        </button>
      </div>
    </form>
  );
};

/* ---------- Address book ---------- */
const AddressesPanel = () => {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<ISavedAddress[] | null>(null);
  const [editing, setEditing] = useState<ISavedAddress | "new" | null>(null);
  const [deleting, setDeleting] = useState<ISavedAddress | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    authAPI
      .getAddresses()
      .then((res) => setAddresses(res.data.addresses))
      .catch(() => setAddresses([]));
  }, []);

  useEffect(() => load(), [load]);

  const save = async (input: ISavedAddressInput) => {
    try {
      const res = editing && editing !== "new" ? await authAPI.updateAddress(editing._id, input) : await authAPI.addAddress(input);
      setAddresses(res.data.addresses);
      setEditing(null);
      toast.success("Address saved");
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't save the address"));
    }
  };

  const makeDefault = async (address: ISavedAddress) => {
    try {
      const res = await authAPI.updateAddress(address._id, { isDefault: true });
      setAddresses(res.data.addresses);
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't update the address"));
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      const res = await authAPI.deleteAddress(deleting._id);
      setAddresses(res.data.addresses);
      setDeleting(null);
      toast.success("Address removed");
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't remove the address"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold font-sans">Saved addresses</h2>
          <p className="text-sm text-[var(--color-text-muted)]">Pick one at checkout instead of typing it again. Up to 5.</p>
        </div>
        {addresses && addresses.length < 5 && (
          <button type="button" onClick={() => setEditing("new")} className="btn btn-primary text-sm">
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add address
          </button>
        )}
      </div>

      {addresses === null ? (
        <div className="grid sm:grid-cols-2 gap-4" aria-busy="true">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      ) : addresses.length === 0 ? (
        <div className="card p-8 text-center">
          <MapPin className="w-8 h-8 mx-auto mb-2 text-[var(--color-text-muted)]" aria-hidden="true" />
          <p className="font-medium">No saved addresses yet</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Addresses you use at checkout can be saved here too.</p>
        </div>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-4">
          {addresses.map((a) => (
            <li key={a._id} className={`card p-4 ${a.isDefault ? "border-[var(--color-primary)]" : ""}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="font-semibold">
                  {a.label || a.name}
                  {a.isDefault && (
                    <span className="ml-2 align-middle text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                      Default
                    </span>
                  )}
                </p>
              </div>
              <address className="not-italic text-sm text-[var(--color-text-muted)] space-y-0.5">
                <p className="text-[var(--color-text)]">
                  {a.name} · {a.phone}
                </p>
                <p>{a.street}</p>
                <p>
                  {a.city}, {a.district}, {PROVINCE_NAMES[a.province]}
                </p>
                {a.landmark && <p>Near {a.landmark}</p>}
              </address>
              <div className="flex flex-wrap gap-3 mt-3 text-sm">
                <button type="button" onClick={() => setEditing(a)} className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline underline-offset-4">
                  <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                  Edit<span className="sr-only"> {a.label || a.name}</span>
                </button>
                {!a.isDefault && (
                  <button type="button" onClick={() => makeDefault(a)} className="inline-flex items-center gap-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                    <Star className="w-3.5 h-3.5" aria-hidden="true" />
                    Make default
                  </button>
                )}
                <button type="button" onClick={() => setDeleting(a)} className="inline-flex items-center gap-1 text-[var(--color-text-muted)] hover:text-[var(--color-error)]">
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Remove<span className="sr-only"> {a.label || a.name}</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Add an address" : "Edit address"} size="lg" variant="sheet">
        {editing !== null && (
          <AddressForm
            initial={editing === "new" ? null : editing}
            defaultName={user?.name}
            defaultPhone={user?.phone}
            onSubmit={save}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        isLoading={busy}
        title="Remove this address?"
        message={deleting ? `${deleting.label || deleting.name} — ${deleting.street}, ${deleting.city}` : ""}
        confirmText="Remove"
      />
    </div>
  );
};

/* ---------- Security ---------- */
const SecurityPanel = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChangePassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) return setError("New password must be at least 6 characters");
    if (newPassword !== confirmPassword) return setError("The new passwords don't match");

    setLoading(true);
    try {
      await authAPI.changePassword(currentPassword, newPassword);
      toast.success("Password changed. Other devices have been signed out.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't change your password"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleChangePassword} className="card p-5 md:p-6 space-y-4 max-w-xl" noValidate>
      <div>
        <h2 className="text-lg font-semibold font-sans">Change password</h2>
        <p className="text-sm text-[var(--color-text-muted)]">Changing it signs you out on all other devices.</p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {error}
        </p>
      )}
      <div>
        <label htmlFor="current-password" className="block text-sm font-medium mb-1">
          Current password
        </label>
        <div className="input-group">
          <Lock className="input-icon w-4 h-4" aria-hidden="true" />
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="input"
            required
          />
        </div>
      </div>
      <div>
        <label htmlFor="new-password" className="block text-sm font-medium mb-1">
          New password
        </label>
        <div className="input-group">
          <Lock className="input-icon w-4 h-4" aria-hidden="true" />
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            aria-describedby="new-password-strength"
            className="input"
            required
          />
        </div>
        <PasswordStrength password={newPassword} id="new-password-strength" />
      </div>
      <div>
        <label htmlFor="confirm-password" className="block text-sm font-medium mb-1">
          Confirm new password
        </label>
        <div className="input-group">
          <Lock className="input-icon w-4 h-4" aria-hidden="true" />
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input"
            required
          />
        </div>
      </div>
      <div className="flex justify-end">
        <button type="submit" disabled={loading || !currentPassword || !newPassword} aria-busy={loading} className="btn btn-primary">
          {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          Update password
        </button>
      </div>
    </form>
  );
};

const Profile = () => {
  usePageTitle("My account");
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.some((t) => t.value === searchParams.get("tab")) ? (searchParams.get("tab") as string) : "profile";

  if (!user) return null;

  return (
    <div className="container-app py-6 md:py-8">
      <Breadcrumb items={[{ label: "My account" }]} className="mb-5" />
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Hi, {user.name.split(" ")[0]}</h1>
          <p className="text-[var(--color-text-muted)]">{user.email}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/orders" className="btn btn-secondary text-sm">
            <Package className="w-4 h-4" aria-hidden="true" />
            Orders
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </Link>
          <Link to="/wishlist" className="btn btn-secondary text-sm">
            <Heart className="w-4 h-4" aria-hidden="true" />
            Wishlist
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <Tabs defaultValue="profile" value={tab} onChange={(value) => setSearchParams(value === "profile" ? {} : { tab: value }, { replace: true })}>
        <TabList variant="underline">
          {TABS.map((t) => (
            <TabTrigger key={t.value} value={t.value} variant="underline">
              {t.label}
            </TabTrigger>
          ))}
        </TabList>
        <TabContent value="profile" className="mt-6">
          <DetailsPanel />
        </TabContent>
        <TabContent value="addresses" className="mt-6">
          <AddressesPanel />
        </TabContent>
        <TabContent value="security" className="mt-6">
          <SecurityPanel />
        </TabContent>
        <TabContent value="appearance" className="mt-6">
          <div className="card p-5 md:p-6 max-w-xl space-y-3">
            <h2 className="text-lg font-semibold font-sans">Theme</h2>
            <p className="text-sm text-[var(--color-text-muted)]">“System” follows your phone or computer setting.</p>
            <ThemeToggle variant="segmented" />
          </div>
        </TabContent>
      </Tabs>
    </div>
  );
};

export default Profile;
