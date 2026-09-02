-- One table. `email` is the primary key, which is what makes a second signup a
-- 409 rather than a duplicate row - the uniqueness is enforced by the store,
-- not by a check the endpoint could forget.
--
-- Emails are stored lowercased and trimmed by the Worker so that
-- Nathan@x.com and nathan@x.com cannot both take a seat.
CREATE TABLE IF NOT EXISTS waitlist (
  email      TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,
  -- Where the signup came from, when a link carries ?ref=. Null is normal.
  ref        TEXT,
  -- Optional note to the founder. NULL when they left the box empty, never ''
  -- - the Worker normalises it, so "has a message" is `message IS NOT NULL`
  -- and does not also have to test for the empty string.
  message    TEXT,
  -- Issued on signup and handed back to that visitor once. It is what lets the
  -- SECOND request - the optional message, sent after the address is already
  -- saved - prove it belongs to this row. Without it, knowing someone's address
  -- would be enough to attach a note to their name.
  token      TEXT
);

-- 🔴 THIS FILE IS ONLY RUN ON A FRESH DATABASE. `CREATE TABLE IF NOT EXISTS`
-- does nothing to a table that already exists, so adding a column above does
-- NOT migrate the live one, and the divergence is silent - inserts just start
-- failing on a column the DB has never heard of.
--
-- Columns added to the live DB after first creation, in order. Anything added
-- above must be added here too, and run:
--
--   2026-09-01  ALTER TABLE waitlist ADD COLUMN message TEXT;   (applied)
--   2026-09-01  ALTER TABLE waitlist ADD COLUMN token TEXT;     (applied)
