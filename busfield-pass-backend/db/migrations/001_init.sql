-- BusField Pass – esquema inicial
-- Valores monetários são guardados em CENTAVOS (bigint) para evitar erros de ponto flutuante.

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          varchar(120) NOT NULL,
  email         varchar(254) NOT NULL,
  password_hash text         NOT NULL,
  role          varchar(20)  NOT NULL DEFAULT 'passenger' CHECK (role IN ('passenger', 'admin')),
  is_active     boolean      NOT NULL DEFAULT true,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now()
);
-- e-mail único sem diferenciar maiúsculas/minúsculas
CREATE UNIQUE INDEX users_email_unique ON users (lower(email));

CREATE TABLE cards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL UNIQUE REFERENCES users (id) ON DELETE RESTRICT, -- 1 cartão por conta (MVP)
  card_number varchar(20) NOT NULL UNIQUE,                                          -- identificador único (ex.: BF-0042-7731)
  status      varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Carteira de créditos do cartão. O saldo só é alterado pelo backend e nunca pode ficar negativo.
CREATE TABLE wallets (
  card_id       uuid PRIMARY KEY REFERENCES cards (id) ON DELETE RESTRICT,
  balance_cents bigint      NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Livro de movimentações: cada alteração de saldo gera uma linha, que nunca é editada nem apagada.
CREATE TABLE transactions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id             uuid         NOT NULL REFERENCES cards (id) ON DELETE RESTRICT,
  type                varchar(20)  NOT NULL CHECK (type IN ('recharge', 'payment')),
  amount_cents        bigint       NOT NULL CHECK (amount_cents > 0),
  balance_after_cents bigint       NOT NULL CHECK (balance_after_cents >= 0),
  description         varchar(200) NOT NULL,
  is_simulated        boolean      NOT NULL DEFAULT true, -- MVP: operações demonstrativas, sem dinheiro real
  idempotency_key     varchar(100) NOT NULL,              -- evita processar a mesma operação duas vezes
  created_at          timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (card_id, idempotency_key)
);
CREATE INDEX transactions_card_created_idx ON transactions (card_id, created_at DESC);

CREATE FUNCTION forbid_transaction_changes() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Movimentações são imutáveis: use um novo registro de estorno ou ajuste.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transactions_immutable
  BEFORE UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION forbid_transaction_changes();

-- Sessões: só o hash do refresh token é guardado
CREATE TABLE refresh_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash char(64)    NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX refresh_tokens_user_idx ON refresh_tokens (user_id);

CREATE TABLE password_reset_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash char(64)    NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Parâmetros de negócio configuráveis (valores em centavos)
CREATE TABLE settings (
  key         varchar(60) PRIMARY KEY,
  value       varchar(200) NOT NULL,
  description varchar(200) NOT NULL
);
INSERT INTO settings (key, value, description) VALUES
  ('fare_cents',         '450',   'Valor da passagem, em centavos'),
  ('min_recharge_cents', '500',   'Recarga mínima, em centavos'),
  ('max_recharge_cents', '50000', 'Recarga máxima, em centavos');

CREATE TABLE bus_stops (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       varchar(150)     NOT NULL,
  latitude   double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude  double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  lines      text[]           NOT NULL DEFAULT '{}', -- vazio quando não há dados de linhas
  source     varchar(40)      NOT NULL DEFAULT 'sample',
  created_at timestamptz      NOT NULL DEFAULT now()
);
CREATE INDEX bus_stops_lat_lng_idx ON bus_stops (latitude, longitude);

-- Trilha de auditoria de ações sensíveis (bloqueio de cartão, ações administrativas)
CREATE TABLE audit_logs (
  id            bigserial PRIMARY KEY,
  actor_user_id uuid        REFERENCES users (id) ON DELETE SET NULL,
  action        varchar(60) NOT NULL,
  entity        varchar(40) NOT NULL,
  entity_id     uuid,
  metadata      jsonb       NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);
