-- CreateTable
CREATE TABLE "Album" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "releaseYear" INTEGER,
    "artworkUrl" TEXT,
    "artworkSource" TEXT,
    "musicBrainzId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Album_position_key" ON "Album"("position");

-- CreateIndex
CREATE UNIQUE INDEX "Album_musicBrainzId_key" ON "Album"("musicBrainzId");
