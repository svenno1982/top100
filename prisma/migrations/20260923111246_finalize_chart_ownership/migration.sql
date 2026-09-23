/*
  Warnings:

  - A unique constraint covering the columns `[ownerId,position]` on the table `Album` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ownerId,musicBrainzId]` on the table `Album` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ownerId,position]` on the table `Film` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ownerId,tmdbId]` on the table `Film` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ownerId,position]` on the table `Song` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ownerId,appleTrackId]` on the table `Song` will be added. If there are existing duplicate values, this will fail.
  - Made the column `ownerId` on table `Album` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ownerId` on table `Film` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ownerId` on table `Song` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "Album_musicBrainzId_key";

-- DropIndex
DROP INDEX "Album_ownerId_idx";

-- DropIndex
DROP INDEX "Album_position_key";

-- DropIndex
DROP INDEX "Film_ownerId_idx";

-- DropIndex
DROP INDEX "Film_position_key";

-- DropIndex
DROP INDEX "Film_tmdbId_key";

-- DropIndex
DROP INDEX "Song_appleTrackId_key";

-- DropIndex
DROP INDEX "Song_ownerId_idx";

-- DropIndex
DROP INDEX "Song_position_key";

-- AlterTable
ALTER TABLE "Album" ALTER COLUMN "ownerId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Film" ALTER COLUMN "ownerId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Song" ALTER COLUMN "ownerId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Album_ownerId_position_key" ON "Album"("ownerId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Album_ownerId_musicBrainzId_key" ON "Album"("ownerId", "musicBrainzId");

-- CreateIndex
CREATE UNIQUE INDEX "Film_ownerId_position_key" ON "Film"("ownerId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Film_ownerId_tmdbId_key" ON "Film"("ownerId", "tmdbId");

-- CreateIndex
CREATE UNIQUE INDEX "Song_ownerId_position_key" ON "Song"("ownerId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Song_ownerId_appleTrackId_key" ON "Song"("ownerId", "appleTrackId");
