// Agent.rank and CommissionPlan.rank are free-text columns in the schema,
// but every rank actually used (seed data, commission plans) is one of these
// three. Sharing one list keeps the hierarchy form and the commission-plan
// form from drifting into two different spellings of the same rank.
export const RANKS = ["AGENT", "MANAGER", "DIRECTOR"] as const;
