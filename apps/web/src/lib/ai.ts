/**
 * AI features kill-switch (launch decision: AI off).
 *
 * When false, all AI surfaces are hidden: the roleplay live-chat card
 * and the settings API-keys form. Scenario reading, objectives and
 * vocabulary stay visible. The server actions (`saveAiConfigAction`,
 * future chat actions) remain in the codebase behind this flag so the
 * feature can be re-enabled by flipping one constant (plus provider
 * keys) — no UI resurrection needed.
 *
 * Never enable in production without provider keys, a spend budget,
 * and abuse rate limits on the chat endpoint.
 */
export const AI_FEATURES_ENABLED = false;
