/**
 * Shown in the chat window to visitors who aren't signed in: starts a guest chat
 * (name required, email optional for replies after they leave).
 */
import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import api from "../../api/axios";
import { useAppDispatch } from "../../store/hooks";
import { setGuest, setIsOpen } from "../../store/chatSlice";
import { saveGuestSession } from "../../utils/guestChat";
import { getErrorMessage } from "../../utils/helpers";

const GuestChatStart = () => {
    const dispatch = useAppDispatch();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!name.trim()) {
            setError("Please tell us your name");
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const { data } = await api.post("/chat/guest-session", {
                name: name.trim(),
                email: email.trim() || undefined,
            });
            const { guestToken, guest } = data.data;
            saveGuestSession({ token: guestToken, id: guest.id, name: guest.name });
            dispatch(setGuest({ id: guest.id, name: guest.name }));
        } catch (err) {
            setError(getErrorMessage(err, "Could not start the chat. Please try again."));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
                <h4 className="font-semibold text-[var(--color-text)]">Chat with us 👋</h4>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                    Questions about sizes, delivery or an order? Our team usually replies within a few hours.
                </p>
            </div>

            <div>
                <label htmlFor="guest-chat-name" className="block text-sm font-medium mb-1">
                    Your name <span className="text-red-500">*</span>
                </label>
                <input
                    id="guest-chat-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={50}
                    autoComplete="name"
                    className="input w-full text-sm"
                    placeholder="e.g. Asha"
                />
            </div>

            <div>
                <label htmlFor="guest-chat-email" className="block text-sm font-medium mb-1">
                    Email <span className="text-[var(--color-text-muted)] font-normal">(optional)</span>
                </label>
                <input
                    id="guest-chat-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="input w-full text-sm"
                    placeholder="So we can reply if you leave"
                />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button type="submit" disabled={submitting} className="btn btn-primary w-full flex items-center justify-center gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Start chat
            </button>

            <p className="text-xs text-[var(--color-text-muted)] text-center">
                Have an account?{" "}
                <Link to="/login" onClick={() => dispatch(setIsOpen(false))} className="text-[var(--color-primary)] hover:underline">
                    Log in
                </Link>{" "}
                to see your orders in chat. Your guest conversation moves to your account when you log in.
            </p>
        </form>
    );
};

export default GuestChatStart;
