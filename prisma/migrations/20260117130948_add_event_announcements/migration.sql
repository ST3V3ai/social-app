-- CreateTable
CREATE TABLE "event_announcements" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "title" VARCHAR(200),
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_announcements_event_id_idx" ON "event_announcements"("event_id");

-- CreateIndex
CREATE INDEX "event_announcements_author_id_idx" ON "event_announcements"("author_id");

-- AddForeignKey
ALTER TABLE "event_announcements" ADD CONSTRAINT "event_announcements_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_announcements" ADD CONSTRAINT "event_announcements_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
