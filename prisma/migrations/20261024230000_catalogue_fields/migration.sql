-- CreateEnum
CREATE TYPE "ImageRights" AS ENUM ('NONE', 'CLIENT_SUPPLIED', 'MANUFACTURER_APPROVED', 'LICENSED', 'OWN_PHOTO');

-- CreateEnum
CREATE TYPE "InfoStatus" AS ENUM ('AWAITING', 'PROVISIONAL', 'VERIFIED');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "manufacturer" TEXT,
ADD COLUMN     "activeIngredients" TEXT,
ADD COLUMN     "strength" TEXT,
ADD COLUMN     "storage" TEXT,
ADD COLUMN     "brandConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "infoStatus" "InfoStatus" NOT NULL DEFAULT 'AWAITING',
ADD COLUMN     "infoSource" TEXT,
ADD COLUMN     "photo" TEXT,
ADD COLUMN     "gallery" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "imageAlt" TEXT,
ADD COLUMN     "imageSource" TEXT,
ADD COLUMN     "imageRights" "ImageRights" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "packMarket" TEXT,
ADD COLUMN     "priceConfirmed" BOOLEAN NOT NULL DEFAULT false;
