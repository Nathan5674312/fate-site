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
  ref        TEXT
);
