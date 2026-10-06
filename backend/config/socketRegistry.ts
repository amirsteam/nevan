/**
 * Lets the rest of the API act on live chat connections (e.g. disconnect a user
 * whose account was deactivated or whose sessions were revoked) without importing
 * config/socket.ts and its dependencies.
 */
import type { Namespace } from "socket.io";

let chatNamespace: Namespace | null = null;

export const registerChatNamespace = (namespace: Namespace): void => {
    chatNamespace = namespace;
};

/** Disconnect every chat socket of a user (each socket joins `user:<id>`) */
export const disconnectUserSockets = (userId: string): void => {
    chatNamespace?.in(`user:${userId}`).disconnectSockets(true);
};
