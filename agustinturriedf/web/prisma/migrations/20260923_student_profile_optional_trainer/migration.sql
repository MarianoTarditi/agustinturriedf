-- Students may be admitted before a trainer is assigned. Assignment remains a
-- separate optimistic-concurrency command; this migration changes no records.
ALTER TABLE "StudentProfile" ALTER COLUMN "trainerId" DROP NOT NULL;
