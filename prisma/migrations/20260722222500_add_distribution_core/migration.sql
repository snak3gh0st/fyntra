-- CreateEnum
CREATE TYPE "CaseStage" AS ENUM ('LEAD', 'DISCOVERY', 'DESIGN', 'ILLUSTRATION_READY', 'APPLICATION_STARTED', 'SUBMITTED', 'UNDERWRITING', 'APPROVED', 'ISSUED', 'PLACED', 'DECLINED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "IllustrationKind" AS ENUM ('PRELIMINARY', 'OFFICIAL');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'STARTED', 'SUBMITTED', 'UNDERWRITING', 'APPROVED', 'ISSUED', 'DECLINED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "RequirementStatus" AS ENUM ('OPEN', 'RECEIVED', 'WAIVED');

-- CreateEnum
CREATE TYPE "PolicyTransactionType" AS ENUM ('PREMIUM', 'CHARGE', 'LOAN', 'WITHDRAWAL', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "CommissionTransactionType" AS ENUM ('EXPECTED', 'PAID', 'CHARGEBACK', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'NEEDS_REVIEW');

-- AlterTable
ALTER TABLE "Policy" ADD COLUMN     "caseId" TEXT,
ADD COLUMN     "sourceExternalId" TEXT,
ADD COLUMN     "sourceProvider" TEXT;

-- AlterTable
ALTER TABLE "Policy" ADD COLUMN "sourceUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "state" TEXT,
    "tobaccoStatus" TEXT,
    "assignedAgentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceCase" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "assignedAgentId" TEXT NOT NULL,
    "clientId" TEXT,
    "stage" "CaseStage" NOT NULL DEFAULT 'LEAD',
    "status" "CaseStatus" NOT NULL DEFAULT 'OPEN',
    "objective" TEXT,
    "targetCoverage" DECIMAL(65,30),
    "monthlyBudget" DECIMAL(65,30),
    "carrier" TEXT,
    "productType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Illustration" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "kind" "IllustrationKind" NOT NULL,
    "provider" TEXT,
    "externalId" TEXT,
    "sourceUpdatedAt" TIMESTAMP(3),
    "productName" TEXT,
    "faceAmount" DECIMAL(65,30),
    "premium" DECIMAL(65,30),
    "documentUrl" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Illustration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IllustrationScenario" (
    "id" TEXT NOT NULL,
    "illustrationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assumptions" JSONB,
    "summary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IllustrationScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "provider" TEXT,
    "externalId" TEXT,
    "sourceUpdatedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationRequirement" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "status" "RequirementStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "provider" TEXT,
    "externalId" TEXT,
    "sourceUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseTimelineEvent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicySnapshot" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "status" "PolicyStatus" NOT NULL,
    "faceAmount" DECIMAL(65,30),
    "plannedPremium" DECIMAL(65,30),
    "lastPaymentDate" TIMESTAMP(3),
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provider" TEXT,
    "externalId" TEXT,
    "sourceUpdatedAt" TIMESTAMP(3),
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyTransaction" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "type" "PolicyTransactionType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "provider" TEXT,
    "externalId" TEXT,
    "sourceUpdatedAt" TIMESTAMP(3),
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionTransaction" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "type" "CommissionTransactionType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "provider" TEXT,
    "externalId" TEXT,
    "sourceTransactionId" TEXT,
    "sourceUpdatedAt" TIMESTAMP(3),
    "originalTransactionId" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationConnection" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "configuration" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalReference" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "sourceUpdatedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncEvent" (
    "id" TEXT NOT NULL,
    "integrationConnectionId" TEXT,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "sourceUpdatedAt" TIMESTAMP(3),
    "direction" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Prospect_assignedAgentId_idx" ON "Prospect"("assignedAgentId");

-- CreateIndex
CREATE INDEX "InsuranceCase_assignedAgentId_stage_idx" ON "InsuranceCase"("assignedAgentId", "stage");

-- CreateIndex
CREATE INDEX "InsuranceCase_prospectId_idx" ON "InsuranceCase"("prospectId");

-- CreateIndex
CREATE INDEX "InsuranceCase_clientId_idx" ON "InsuranceCase"("clientId");

-- CreateIndex
CREATE INDEX "Illustration_caseId_idx" ON "Illustration"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "Illustration_provider_externalId_key" ON "Illustration"("provider", "externalId");

-- CreateIndex
CREATE INDEX "IllustrationScenario_illustrationId_idx" ON "IllustrationScenario"("illustrationId");

-- CreateIndex
CREATE INDEX "Application_caseId_idx" ON "Application"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_provider_externalId_key" ON "Application"("provider", "externalId");

-- CreateIndex
CREATE INDEX "ApplicationRequirement_applicationId_status_idx" ON "ApplicationRequirement"("applicationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationRequirement_provider_externalId_key" ON "ApplicationRequirement"("provider", "externalId");

-- CreateIndex
CREATE INDEX "CaseTimelineEvent_caseId_createdAt_idx" ON "CaseTimelineEvent"("caseId", "createdAt");

-- CreateIndex
CREATE INDEX "PolicySnapshot_policyId_observedAt_idx" ON "PolicySnapshot"("policyId", "observedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PolicySnapshot_provider_externalId_key" ON "PolicySnapshot"("provider", "externalId");

-- CreateIndex
CREATE INDEX "PolicyTransaction_policyId_occurredAt_idx" ON "PolicyTransaction"("policyId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyTransaction_provider_externalId_key" ON "PolicyTransaction"("provider", "externalId");

-- CreateIndex
CREATE INDEX "CommissionTransaction_policyId_occurredAt_idx" ON "CommissionTransaction"("policyId", "occurredAt");

-- CreateIndex
CREATE INDEX "CommissionTransaction_agentId_occurredAt_idx" ON "CommissionTransaction"("agentId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionTransaction_provider_externalId_key" ON "CommissionTransaction"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionTransaction_provider_sourceTransactionId_key" ON "CommissionTransaction"("provider", "sourceTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationConnection_provider_key" ON "IntegrationConnection"("provider");

-- CreateIndex
CREATE INDEX "ExternalReference_entityType_entityId_idx" ON "ExternalReference"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalReference_provider_externalId_key" ON "ExternalReference"("provider", "externalId");

-- CreateIndex
CREATE INDEX "SyncEvent_integrationConnectionId_status_idx" ON "SyncEvent"("integrationConnectionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SyncEvent_provider_externalId_key" ON "SyncEvent"("provider", "externalId");

-- CreateIndex
CREATE INDEX "Policy_caseId_idx" ON "Policy"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "Policy_sourceProvider_sourceExternalId_key" ON "Policy"("sourceProvider", "sourceExternalId");

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "InsuranceCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceCase" ADD CONSTRAINT "InsuranceCase_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceCase" ADD CONSTRAINT "InsuranceCase_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceCase" ADD CONSTRAINT "InsuranceCase_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Illustration" ADD CONSTRAINT "Illustration_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "InsuranceCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IllustrationScenario" ADD CONSTRAINT "IllustrationScenario_illustrationId_fkey" FOREIGN KEY ("illustrationId") REFERENCES "Illustration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "InsuranceCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationRequirement" ADD CONSTRAINT "ApplicationRequirement_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseTimelineEvent" ADD CONSTRAINT "CaseTimelineEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "InsuranceCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicySnapshot" ADD CONSTRAINT "PolicySnapshot_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyTransaction" ADD CONSTRAINT "PolicyTransaction_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionTransaction" ADD CONSTRAINT "CommissionTransaction_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionTransaction" ADD CONSTRAINT "CommissionTransaction_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncEvent" ADD CONSTRAINT "SyncEvent_integrationConnectionId_fkey" FOREIGN KEY ("integrationConnectionId") REFERENCES "IntegrationConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
