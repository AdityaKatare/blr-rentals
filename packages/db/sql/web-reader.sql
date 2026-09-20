CREATE ROLE web_reader LOGIN PASSWORD 'replace-me';

GRANT USAGE ON SCHEMA public, extensions TO web_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO web_reader;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT ON TABLES TO web_reader;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'schema_migrations' LOOP
    EXECUTE format('CREATE POLICY web_reader_select ON public.%I FOR SELECT TO web_reader USING (true)', t);
  END LOOP;
END $$;

SELECT rolname, rolcanlogin, rolbypassrls FROM pg_roles WHERE rolname = 'web_reader';
SELECT count(*) AS select_policies FROM pg_policies WHERE policyname = 'web_reader_select';
