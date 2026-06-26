/**
 * Plan gating (Free vs Pro). Billing is out of scope for now, so this is a
 * single source of truth the UI reads to show/lock Pro features. Flip to "pro"
 * (or wire to a real entitlement later) to unlock everything.
 */
export type Plan = "free" | "pro";

export const PLAN = "free" as Plan;

export const isPro: boolean = PLAN === "pro";

/** Free-tier monthly limit on detailed scoring (brief §5 feature matrix). */
export const FREE_SCORE_LIMIT = 3;
