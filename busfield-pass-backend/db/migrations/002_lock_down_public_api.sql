-- Segurança para bancos gerenciados (ex.: Supabase).
-- O Supabase expõe o schema "public" por uma API automática (PostgREST) usada pelos papéis "anon" e
-- "authenticated". Este sistema acessa o banco SOMENTE pelo backend, então:
--   1) ligamos Row Level Security em todas as tabelas (sem políticas = acesso negado para esses papéis);
--   2) retiramos os privilégios desses papéis, inclusive nas tabelas criadas no futuro.
-- O backend conecta como dono do banco, que não é afetado. Em um PostgreSQL comum (sem esses papéis) o passo 2 é ignorado.
DO $$
DECLARE
  t record;
  r text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;

  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I', r);
    END IF;
  END LOOP;
END $$;
