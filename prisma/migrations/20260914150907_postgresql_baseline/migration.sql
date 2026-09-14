-- CreateTable
CREATE TABLE "Album" (
    "id" SERIAL NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "releaseYear" INTEGER,
    "artworkUrl" TEXT,
    "artworkSource" TEXT,
    "musicBrainzId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Album_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Film" (
    "id" SERIAL NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "director" TEXT,
    "releaseYear" INTEGER,
    "posterUrl" TEXT,
    "tmdbId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Film_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Song" (
    "id" SERIAL NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "releaseYear" INTEGER,
    "artworkUrl" TEXT,
    "appleTrackId" TEXT,
    "trackUrl" TEXT,
    "previewUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Song_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Album_position_key" ON "Album"("position");

-- CreateIndex
CREATE UNIQUE INDEX "Album_musicBrainzId_key" ON "Album"("musicBrainzId");

-- CreateIndex
CREATE UNIQUE INDEX "Film_position_key" ON "Film"("position");

-- CreateIndex
CREATE UNIQUE INDEX "Film_tmdbId_key" ON "Film"("tmdbId");

-- CreateIndex
CREATE UNIQUE INDEX "Song_position_key" ON "Song"("position");

-- CreateIndex
CREATE UNIQUE INDEX "Song_appleTrackId_key" ON "Song"("appleTrackId");
