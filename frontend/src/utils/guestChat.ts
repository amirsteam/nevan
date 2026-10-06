/**
 * Support-chat session for visitors who aren't signed in.
 *
 * The guest token only grants access to that visitor's own chat conversation
 * (it is not an account login), so it is kept in localStorage to survive page
 * reloads. Account tokens are never stored here.
 */
const STORAGE_KEY = "nevan.chatGuest";

export interface GuestChatSession {
  token: string;
  id: string;
  name: string;
}

export const loadGuestSession = (): GuestChatSession | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GuestChatSession>;
    return parsed.token && parsed.id && parsed.name ? (parsed as GuestChatSession) : null;
  } catch {
    return null;
  }
};

export const saveGuestSession = (session: GuestChatSession): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // storage unavailable (private mode): the chat still works until reload
  }
};

export const clearGuestSession = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nothing to clear
  }
};
