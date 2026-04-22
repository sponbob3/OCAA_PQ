-- CreateEnum
CREATE TYPE "FieldKey" AS ENUM ('STATUS_OF_IMPLEMENTATION', 'MAIN_RESPONSIBILITY', 'PART_RESPONSIBILITY', 'FCL', 'AW', 'ATC', 'MED', 'WORK_REQUIRED', 'BRIEF_ON_WORK_REQUIRED', 'INTERNAL_NOTES', 'OCAA_FINAL_RESPONSE');

-- CreateTable
CREATE TABLE "FieldSubmission" (
    "id" SERIAL NOT NULL,
    "pqId" TEXT NOT NULL,
    "fieldKey" "FieldKey" NOT NULL,
    "seq" INTEGER NOT NULL,
    "value" TEXT NOT NULL,
    "revisesIdsJson" TEXT NOT NULL DEFAULT '[]',
    "authorId" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FieldSubmission_pqId_fieldKey_createdAt_idx" ON "FieldSubmission"("pqId", "fieldKey", "createdAt");

-- CreateIndex
CREATE INDEX "FieldSubmission_approvedAt_idx" ON "FieldSubmission"("approvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FieldSubmission_pqId_fieldKey_seq_key" ON "FieldSubmission"("pqId", "fieldKey", "seq");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- AddForeignKey
ALTER TABLE "FieldSubmission" ADD CONSTRAINT "FieldSubmission_pqId_fkey" FOREIGN KEY ("pqId") REFERENCES "ProtocolQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldSubmission" ADD CONSTRAINT "FieldSubmission_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldSubmission" ADD CONSTRAINT "FieldSubmission_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
