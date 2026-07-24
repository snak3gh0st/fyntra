-- Additive: follow-up scheduling on the case timeline.
ALTER TABLE "CaseTimelineEvent" ADD COLUMN "dueAt" TIMESTAMP(3);
ALTER TABLE "CaseTimelineEvent" ADD COLUMN "doneAt" TIMESTAMP(3);
