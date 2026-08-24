-- CreateTable
CREATE TABLE "Phrasebook" (
    "id" TEXT NOT NULL,
    "filipino" TEXT NOT NULL,
    "pangasinan" TEXT NOT NULL,
    "english" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Phrasebook_pkey" PRIMARY KEY ("id")
);
