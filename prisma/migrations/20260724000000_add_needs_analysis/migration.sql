-- Additive: nullable JSON column for case needs-analysis snapshot.
ALTER TABLE "InsuranceCase" ADD COLUMN "needsAnalysis" JSONB;
