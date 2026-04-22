-- AlterTable
ALTER TABLE "FieldSubmission" ADD COLUMN     "authorLabel" TEXT,
ADD COLUMN     "isInitial" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "FieldSubmission_isInitial_idx" ON "FieldSubmission"("isInitial");
