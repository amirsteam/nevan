import { useEffect } from "react";
import { STORE_NAME } from "../config/store";

/**
 * Sets document.title to "<title> · Nevan Handicraft" (or just the store
 * name without a title) and, optionally, the meta description.
 */
export const usePageTitle = (title?: string | null, description?: string | null): void => {
  useEffect(() => {
    document.title = title ? `${title} · ${STORE_NAME}` : `${STORE_NAME} · Soft, handmade baby clothing from Nepal`;
  }, [title]);

  useEffect(() => {
    if (!description) return;
    const meta = document.querySelector('meta[name="description"]');
    const previous = meta?.getAttribute("content");
    meta?.setAttribute("content", description.slice(0, 160));
    return () => {
      if (previous) meta?.setAttribute("content", previous);
    };
  }, [description]);
};

export default usePageTitle;
