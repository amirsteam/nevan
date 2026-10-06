import { useEffect } from "react";

/**
 * Lift the floating chat button above a sticky bottom bar on small screens
 * (index.css applies --chat-offset-mobile below the lg breakpoint only).
 */
export const useChatOffset = (active: boolean, offset = "4.5rem"): void => {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    root.style.setProperty("--chat-offset-mobile", offset);
    return () => {
      root.style.removeProperty("--chat-offset-mobile");
    };
  }, [active, offset]);
};

export default useChatOffset;
