DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "User" AS u
    LEFT JOIN "StudentProfile" AS sp ON sp."userId" = u."id"
    WHERE (u."role" = 'STUDENT' AND sp."id" IS NULL)
      OR (u."role" <> 'STUDENT' AND sp."id" IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'Contradictory User role and StudentProfile relation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "User" AS u
    INNER JOIN "StudentProfile" AS sp ON sp."userId" = u."id"
    WHERE u."role" = 'STUDENT'
      AND u."status"::text <> sp."status"::text
  ) THEN
    RAISE EXCEPTION 'Student User and StudentProfile statuses must match';
  END IF;

  IF EXISTS (SELECT 1 FROM "User" AS u WHERE u."role" = 'ADMIN')
    AND NOT EXISTS (
      SELECT 1
      FROM "User" AS u
      WHERE u."role" = 'ADMIN' AND u."status" = 'ACTIVE'
    ) THEN
    RAISE EXCEPTION 'At least one ADMIN must be ACTIVE';
  END IF;

  IF to_regclass('public."User_active_admin_idx"') IS NULL THEN
    RAISE EXCEPTION 'User_active_admin_idx is missing';
  END IF;
END
$$;
