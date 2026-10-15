/**
 * The store's social accounts with their official logos, for every place that
 * links to them (footer, home page, About, Contact, phone menu). Links come
 * from CONTACT in shared/store.ts. The logos are full-colour images drawn as
 * <img> (their gradient ids would clash if inlined twice on one page) and need
 * no background of their own.
 */
import facebookLogo from "../assets/social/facebook.svg";
import instagramLogo from "../assets/social/instagram.svg";
import { CONTACT } from "./store";

/** "https://www.instagram.com/nevancollection/" -> "@nevancollection" */
const handleFrom = (url: string): string => `@${url.replace(/\/+$/, "").split("/").pop()}`;

export interface SocialLink {
  network: "Instagram" | "Facebook";
  href: string;
  handle: string;
  logo: string;
  /** What shoppers get by following, for longer layouts */
  pitch: string;
}

export const SOCIAL_LINKS: readonly SocialLink[] = [
  {
    network: "Instagram",
    href: CONTACT.instagram,
    handle: handleFrom(CONTACT.instagram),
    logo: instagramLogo,
    pitch: "New pieces and little ones wearing them",
  },
  {
    network: "Facebook",
    href: CONTACT.facebook,
    handle: handleFrom(CONTACT.facebook),
    logo: facebookLogo,
    pitch: "Offers, festival sales and updates",
  },
];
