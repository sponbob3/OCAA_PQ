-- AlterEnum
ALTER TYPE "FieldKey" ADD VALUE 'RPL';

-- AlterTable
ALTER TABLE "ProtocolQuestion" ADD COLUMN     "enabledPelSubAreasJson" TEXT;
