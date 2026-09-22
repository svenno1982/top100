-- AlterTable
ALTER TABLE "Album"
ADD COLUMN "tracklistReleaseId" TEXT,
ADD COLUMN "tracklistFetchedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AlbumTrack" (
    "id" SERIAL NOT NULL,
    "albumId" INTEGER NOT NULL,
    "discNumber" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL,
    "trackNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "lengthMs" INTEGER,

    CONSTRAINT "AlbumTrack_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AlbumTrack_albumId_discNumber_position_key"
ON "AlbumTrack"("albumId", "discNumber", "position");

-- CreateIndex
CREATE INDEX "AlbumTrack_albumId_idx"
ON "AlbumTrack"("albumId");

-- AddForeignKey
ALTER TABLE "AlbumTrack"
ADD CONSTRAINT "AlbumTrack_albumId_fkey"
FOREIGN KEY ("albumId")
REFERENCES "Album"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;