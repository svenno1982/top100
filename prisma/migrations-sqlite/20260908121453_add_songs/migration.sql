-- CreateTable
CREATE TABLE "Song" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "releaseYear" INTEGER,
    "artworkUrl" TEXT,
    "appleTrackId" TEXT,
    "trackUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Song_position_key" ON "Song"("position");

-- CreateIndex
CREATE UNIQUE INDEX "Song_appleTrackId_key" ON "Song"("appleTrackId");
