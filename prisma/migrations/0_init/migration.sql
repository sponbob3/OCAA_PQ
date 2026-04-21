-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'NEEDS_WORK', 'UNDER_REVIEW', 'COMPLETE');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');

-- CreateTable
CREATE TABLE "ProtocolQuestion" (
    "id" TEXT NOT NULL,
    "auditArea" TEXT NOT NULL DEFAULT 'PEL',
    "pqNo" TEXT NOT NULL,
    "ce" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "guidanceJson" TEXT NOT NULL DEFAULT '[]',
    "icaoReferencesJson" TEXT NOT NULL DEFAULT '[]',
    "isPPQ" BOOLEAN NOT NULL DEFAULT false,
    "amendmentDescription" TEXT,
    "status" "Status" NOT NULL DEFAULT 'NOT_STARTED',
    "statusOfImplementation" TEXT,
    "mainResponsibility" TEXT,
    "partResponsibility" TEXT,
    "fcl" TEXT,
    "aw" TEXT,
    "atc" TEXT,
    "med" TEXT,
    "workRequired" TEXT,
    "briefOnWorkRequired" TEXT,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "ProtocolQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceLink" (
    "id" TEXT NOT NULL,
    "pqId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "EvidenceLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusHistory" (
    "id" TEXT NOT NULL,
    "pqId" TEXT NOT NULL,
    "fromStatus" "Status",
    "toStatus" "Status" NOT NULL,
    "note" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedById" TEXT,

    CONSTRAINT "StatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'EDITOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProtocolQuestion_pqNo_key" ON "ProtocolQuestion"("pqNo");

-- CreateIndex
CREATE INDEX "ProtocolQuestion_ce_idx" ON "ProtocolQuestion"("ce");

-- CreateIndex
CREATE INDEX "ProtocolQuestion_status_idx" ON "ProtocolQuestion"("status");

-- CreateIndex
CREATE INDEX "ProtocolQuestion_isPPQ_idx" ON "ProtocolQuestion"("isPPQ");

-- CreateIndex
CREATE INDEX "ProtocolQuestion_auditArea_idx" ON "ProtocolQuestion"("auditArea");

-- CreateIndex
CREATE INDEX "EvidenceLink_pqId_idx" ON "EvidenceLink"("pqId");

-- CreateIndex
CREATE INDEX "StatusHistory_pqId_idx" ON "StatusHistory"("pqId");

-- CreateIndex
CREATE INDEX "StatusHistory_changedAt_idx" ON "StatusHistory"("changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "ProtocolQuestion" ADD CONSTRAINT "ProtocolQuestion_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceLink" ADD CONSTRAINT "EvidenceLink_pqId_fkey" FOREIGN KEY ("pqId") REFERENCES "ProtocolQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceLink" ADD CONSTRAINT "EvidenceLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusHistory" ADD CONSTRAINT "StatusHistory_pqId_fkey" FOREIGN KEY ("pqId") REFERENCES "ProtocolQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusHistory" ADD CONSTRAINT "StatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

