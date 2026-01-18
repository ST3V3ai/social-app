-- CreateEnum
CREATE TYPE "CalendarProvider" AS ENUM ('GOOGLE', 'APPLE', 'OUTLOOK');

-- AlterTable (recreate calendar_tokens with new structure)
-- First drop the old table if it exists with data
DROP TABLE IF EXISTS "calendar_tokens";

-- CreateTable
CREATE TABLE "calendar_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" "CalendarProvider" NOT NULL DEFAULT 'GOOGLE',
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "scope" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "calendar_tokens_user_id_idx" ON "calendar_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_tokens_user_id_provider_key" ON "calendar_tokens"("user_id", "provider");

-- AddForeignKey
ALTER TABLE "calendar_tokens" ADD CONSTRAINT "calendar_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
