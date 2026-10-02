-- Runtime role used by the app. It does not own the tables, so row level
-- security policies always apply to it. Change the password outside dev.
CREATE ROLE hajj_app LOGIN PASSWORD 'hajj_app_dev';
GRANT CONNECT ON DATABASE hajj TO hajj_app;
GRANT USAGE ON SCHEMA public TO hajj_app;

ALTER DEFAULT PRIVILEGES FOR ROLE hajj_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO hajj_app;
ALTER DEFAULT PRIVILEGES FOR ROLE hajj_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO hajj_app;

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
