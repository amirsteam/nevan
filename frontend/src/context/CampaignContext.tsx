/**
 * Campaign Context
 * The festival/event campaign running now, fetched once per page load and
 * shared by the announcement bar, hero carousel and sale badges.
 *
 * Admins can open the storefront with ?preview=<campaignId> to see a draft or
 * scheduled campaign's look before it goes live (prices only change when the
 * campaign is actually live).
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { campaignsAPI } from "../api/campaigns";
import { useAuth } from "./AuthContext";
import type { IPublicCampaign } from "../types";

interface CampaignContextType {
  campaign: IPublicCampaign | null;
  loading: boolean;
  /** True when showing an admin preview instead of the live campaign */
  isPreview: boolean;
}

const CampaignContext = createContext<CampaignContextType>({ campaign: null, loading: false, isPreview: false });

// eslint-disable-next-line react-refresh/only-export-components
export const useCampaign = (): CampaignContextType => useContext(CampaignContext);

const readPreviewId = (): string | null => {
  try {
    return new URLSearchParams(window.location.search).get("preview");
  } catch {
    return null;
  }
};

export const CampaignProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [previewId] = useState(readPreviewId);
  const isAdmin = user?.role === "admin";
  const [state, setState] = useState<{ campaign: IPublicCampaign | null; loading: boolean; isPreview: boolean }>({
    campaign: null,
    loading: true,
    isPreview: false,
  });

  // A preview needs the admin's session, so wait for auth before asking
  const wantsPreview = Boolean(previewId) && isAdmin;
  const waitForAuth = Boolean(previewId) && authLoading;

  useEffect(() => {
    if (waitForAuth) return;
    let cancelled = false;
    campaignsAPI
      .getLive(wantsPreview ? previewId : null)
      .then((campaign) => {
        if (!cancelled) setState({ campaign, loading: false, isPreview: wantsPreview && Boolean(campaign) });
      })
      .catch(() => {
        // A missing campaign must never break the storefront
        if (!cancelled) setState({ campaign: null, loading: false, isPreview: false });
      });
    return () => {
      cancelled = true;
    };
  }, [previewId, wantsPreview, waitForAuth]);

  return <CampaignContext.Provider value={state}>{children}</CampaignContext.Provider>;
};
