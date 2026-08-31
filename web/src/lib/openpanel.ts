import { OpenPanel } from "@openpanel/web";
import { onAuthChange } from "./auth";

/**
 * OpenPanel analytics client. The client id is public (it only allows writing
 * events), so it ships in the bundle via Vite's `VITE_` env prefix. When it is
 * missing (local dev without a .env) the client is null and every helper below
 * becomes a no-op, so nothing needs to guard its call sites.
 */
const clientId = import.meta.env.VITE_OP_CLIENT_ID;

export const op = clientId
  ? new OpenPanel({
      clientId,
      // Patches history.pushState/replaceState, so react-router navigations
      // are reported as screen views without any per-route wiring.
      trackScreenViews: true,
      trackOutgoingLinks: true,
      trackAttributes: true,
    })
  : null;

/** Events this app reports. Keeping them in one union stops names drifting. */
export type AnalyticsEvent =
  | "login"
  | "signup"
  | "logout"
  | "board_create"
  | "board_open"
  | "board_import"
  | "board_export"
  | "card_create"
  | "card_delete"
  | "connection_create"
  | "connection_delete"
  | "present_start";

export function track(event: AnalyticsEvent, properties?: Record<string, unknown>): void {
  void op?.track(event, properties);
}

// Tie the analytics profile to the PocketBase session. `onAuthChange` also
// fires on token refresh, so dedupe on the user id to avoid re-identifying.
let identifiedId: string | null = null;

onAuthChange((user) => {
  if (!op) return;
  if (user) {
    if (identifiedId === user.id) return;
    identifiedId = user.id;
    void op.identify({
      profileId: user.id,
      email: user.email,
      firstName: user.name || undefined,
    });
  } else if (identifiedId) {
    identifiedId = null;
    op.clear();
  }
});
