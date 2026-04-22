-- AlterTable
ALTER TABLE "ProtocolQuestion" ADD COLUMN     "isATC" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "ProtocolQuestion_isATC_idx" ON "ProtocolQuestion"("isATC");
