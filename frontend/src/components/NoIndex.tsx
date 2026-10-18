/**
 * Asks search engines not to index the page while it is shown (not-found
 * screens). The server answers every address with the app, so without this a
 * dead link would be indexed as a real page.
 */
import { useEffect } from "react";

const NoIndex = () => {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
  return null;
};

export default NoIndex;
