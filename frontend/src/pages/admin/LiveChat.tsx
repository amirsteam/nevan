/**
 * Admin Live Chat (/admin/chat)
 * The shared support inbox — customers' and website visitors' conversations —
 * full height inside the admin panel. Uses the same chat window and live
 * connection as the floating widget (which hides itself on this page).
 */
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAppDispatch } from "../../store/hooks";
import { setIsOpen } from "../../store/chatSlice";
import ChatWindow from "../../components/chat/ChatWindow";
import { usePageTitle } from "../../hooks/usePageTitle";

const LiveChat = () => {
  usePageTitle("Live chat");
  const dispatch = useAppDispatch();

  // The inbox is "open" while this page is shown (live room list, read receipts)
  useEffect(() => {
    dispatch(setIsOpen(true));
    return () => {
      dispatch(setIsOpen(false));
    };
  }, [dispatch]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Live chat</h1>
        <p className="text-[var(--color-text-muted)]">
          Conversations with customers and website visitors. Contact-form emails are under{" "}
          <Link to="/admin/messages" className="text-[var(--color-primary)] hover:underline">
            Contact forms
          </Link>
          .
        </p>
      </div>
      <div className="h-[calc(100vh-13rem)] lg:h-[calc(100vh-11rem)] min-h-[28rem] max-w-3xl">
        <ChatWindow embedded />
      </div>
    </div>
  );
};

export default LiveChat;
