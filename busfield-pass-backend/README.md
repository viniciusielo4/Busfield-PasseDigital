# BusField Pass – Backend (Fase 3)

API REST do BusField Pass: contas, cartão digital, carteira de créditos, recargas e pagamentos **simulados**, histórico e pontos de ônibus.
Stack: **Node.js 20+ · Express 5 · PostgreSQL 16 · JWT**.

> MVP: recargas e pagamentos são demonstrativos (`isSimulated: true`), sem dinheiro real.

## 1. Como rodar

```bash
# 1) PostgreSQL local (Docker) – cria os bancos busfield_pass e busfield_pass_test
docker compose up -d

# 2) Dependências e variáveis de ambiente
npm install
cp .env.example .env        # edite JWT_SECRET (mín. 32 caracteres)

# 3) Tabelas e dados iniciais
npm run migrate             # aplica db/migrations/*.sql
npm run seed                # pontos de ônibus de exemplo + administrador (ADMIN_EMAIL/ADMIN_PASSWORD)

# 4) Subir a API
npm run dev                 # http://localhost:3000  (GET /health para conferir)
```

Sem Docker: instale o PostgreSQL, crie os bancos `busfield_pass` e `busfield_pass_test` e ajuste `DATABASE_URL` / `TEST_DATABASE_URL`.

### Alternativa ao Docker: banco no Supabase (PostgreSQL na nuvem)

O Supabase é um PostgreSQL hospedado; o backend o usa normalmente, sem mudar o código.

1. Crie um projeto em supabase.com (região **South America – São Paulo**) e guarde a senha do banco.
2. No projeto, clique em **Connect** e copie a string **Session pooler** (formato `postgresql://postgres.xxxx:[YOUR-PASSWORD]@aws-...pooler.supabase.com:5432/postgres`).
3. No `.env` do backend:
   ```
   DATABASE_URL=<a string copiada, com [YOUR-PASSWORD] trocado pela senha>
   DATABASE_SSL=true
   ```
   Se a senha tiver símbolos (`@`, `#`, `/`...), codifique-os (ex.: `@` vira `%40`). Não acrescente `?sslmode=...` à URL.
4. `npm run migrate` e `npm run seed`. As tabelas aparecem em **Table Editor** no painel do Supabase.

Segurança: a migração `002_lock_down_public_api.sql` liga Row Level Security em todas as tabelas e remove o acesso dos papéis `anon`/`authenticated`, para que ninguém leia os dados pela API automática do Supabase. Todo acesso passa pelo backend. Nunca publique a senha do banco nem o `.env`.

**Não rode `npm test` apontando para o Supabase:** os testes recriam o schema `public`. Eles recusam bancos sem "test" no nome, e o do Supabase se chama `postgres`. Rode os testes em um PostgreSQL local ou em um segundo projeto só para testes.

### Testes automatizados
```bash
npm test      # 27 testes de integração contra um PostgreSQL real
```
Os testes **recriam o esquema do banco de testes**; por segurança abortam se o nome do banco não contiver `test`.
Cobrem cadastro, login, refresh/logout, recuperação de senha, recargas, pagamentos, idempotência, cartão bloqueado,
**concorrência** (pagamentos simultâneos nunca geram saldo negativo), imutabilidade do livro de movimentações, histórico, pontos próximos e permissões de administrador.

## 2. Estrutura

```
db/migrations/001_init.sql   esquema (tabelas, restrições, índices, triggers)
db/seeds/bus_stops.sql       pontos FICTÍCIOS de exemplo
scripts/migrate.js, seed.js  migração e carga inicial
src/app.js, server.js        aplicação Express
src/config.js, db.js         configuração e pool/transações do PostgreSQL
src/routes/                  endpoints (finos: validam e chamam os serviços)
src/services/                regras de negócio (auth, carteira, histórico, pontos, auditoria)
src/middleware/              autenticação/perfis, validação (zod), erros
tests/api.test.js            testes de integração
```

## 3. Modelo de dados

| Tabela | Função |
|---|---|
| `users` | Contas (`passenger` ou `admin`). E-mail único sem diferenciar maiúsculas. Senha só como hash bcrypt. |
| `cards` | Cartão digital (1 por conta no MVP), `card_number` único (`BF-0000-0000`), status `active`/`blocked`. |
| `wallets` | Saldo em **centavos**; `CHECK (balance_cents >= 0)` impede saldo negativo no próprio banco. |
| `transactions` | Livro de movimentações (`recharge`/`payment`) com `balance_after_cents` e `idempotency_key` única por cartão. **Imutável** (trigger bloqueia UPDATE/DELETE). |
| `refresh_tokens`, `password_reset_tokens` | Sessões e recuperação de senha; só o hash do token é guardado. |
| `settings` | Tarifa (R$ 4,50), recarga mínima (R$ 5,00) e máxima (R$ 500,00), editáveis sem mexer no código. |
| `bus_stops` | Pontos de ônibus (latitude/longitude e linhas, quando existirem). |
| `audit_logs` | Auditoria de bloqueios/desbloqueios de cartão. |

## 4. Endpoints (`/api/v1`)

Erros seguem o formato `{ "error": { "code", "message", "details" } }`. Valores em **centavos** (`amountCents`).
Rotas marcadas com 🔒 exigem `Authorization: Bearer <accessToken>`.

| Método e rota | Descrição |
|---|---|
| `POST /auth/register` | Cria conta + cartão digital + carteira e já devolve os tokens |
| `POST /auth/login` | Login |
| `POST /auth/refresh` | Renova a sessão (o refresh token é de uso único) |
| `POST /auth/logout` | Encerra a sessão (revoga o refresh token) |
| `POST /auth/forgot-password` · `POST /auth/reset-password` | Recuperação de senha |
| 🔒 `GET /users/me` · `PATCH /users/me` · `PATCH /users/me/password` | Perfil e troca de senha |
| 🔒 `GET /cards/me` · `POST /cards/me/block` · `POST /cards/me/unblock` | Cartão e bloqueio |
| 🔒 `GET /wallet` | Saldo, tarifa e limites de recarga |
| 🔒 `POST /recharges` | Recarga simulada `{ "amountCents": 2000 }` |
| 🔒 `POST /payments/fare` | Pagamento simulado de passagem (valor definido pelo servidor) |
| 🔒 `GET /transactions` | Histórico (`page`, `limit`, `type`, `from`, `to`) |
| 🔒 `GET /transactions/summary` | Resumo por período: total recarregado/gasto e contagens |
| 🔒 `GET /transactions/:id` | Comprovante |
| 🔒 `GET /bus-stops/nearby?lat&lng&radius&limit` · `GET /bus-stops/:id` | Pontos próximos (raio em metros, 50–5000) |
| 🔒👑 `GET /admin/users` · `GET /admin/transactions` · `GET /admin/stats` · `PATCH /admin/cards/:id/status` | Painel administrativo (somente `admin`) |
| `GET /health` | Verifica API e banco |

**`Idempotency-Key` é obrigatório** em `POST /recharges` e `POST /payments/fare`. O app gera um UUID a cada toque do usuário e o reutiliza em novas tentativas: a operação é aplicada só uma vez (reenvio devolve `200` com `"replayed": true`).

### Exemplo
```bash
curl -X POST localhost:3000/api/v1/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"Vinicius","email":"vini@exemplo.com","password":"senhaSegura1"}'

curl -X POST localhost:3000/api/v1/recharges \
  -H "Authorization: Bearer $TOKEN" -H "Idempotency-Key: $(uuidgen)" \
  -H 'Content-Type: application/json' -d '{"amountCents":2000}'
```

### Códigos de erro de negócio (HTTP 422/409)
`INSUFFICIENT_BALANCE` · `CARD_BLOCKED` · `RECHARGE_BELOW_MINIMUM` · `RECHARGE_ABOVE_MAXIMUM` · `IDEMPOTENCY_KEY_REUSED` · `EMAIL_ALREADY_REGISTERED`

## 5. Regras de negócio implementadas

| Regra (documento de requisitos) | Como foi feita |
|---|---|
| RN01 e-mail único | Índice único em `lower(email)` + erro 409 |
| RN02–04 acesso por perfil | JWT + `requireRole('admin')`; cada consulta filtra pelo usuário logado |
| RN05–07 cartão único, independente, identificador imutável | `cards.user_id UNIQUE`, `card_number UNIQUE`, criado no cadastro |
| RN08–09 bloqueio/desbloqueio | `POST /cards/me/block\|unblock`; cartão bloqueado recusa pagamento e recarga; auditado |
| RN10 saldo só no backend | Nenhum endpoint aceita saldo do app; só `walletService` altera `wallets` |
| RN11 saldo nunca negativo | Validação no serviço **e** `CHECK` no banco |
| RN12 toda alteração gera registro | Atualização do saldo e `INSERT` em `transactions` na mesma transação |
| RN13 operação atômica | `withTransaction` + travamento `FOR UPDATE` do cartão e da carteira |
| RN14 registros imutáveis | Trigger no PostgreSQL |
| RN15 sem duplicidade | `Idempotency-Key` + `UNIQUE (card_id, idempotency_key)` |
| RN17 admin não mexe no saldo | Não existe rota administrativa de ajuste de saldo; admin só bloqueia/desbloqueia |
| RN18–22 recargas | Limites em `settings`, simuladas (`is_simulated`), comprovante em `/transactions/:id` |
| RN23–27 pagamento | Ordem: trava → idempotência → status → saldo → débito → registro; tarifa vem de `settings` |
| RN30 pontos | Haversine em SQL; `lines` vazio quando não há dados |
| RN31 LGPD (mínimo de dados) | Cadastro pede só nome, e-mail e senha |

**Fora do backend desta fase:** permissão de localização (RN28–29, é do app), integrações reais (RN27, RN32–33), envio de e-mail na recuperação de senha.

## 6. Segurança aplicada
- Senhas com bcrypt (custo 12); política de 8–72 caracteres; resposta de login idêntica para e-mail inexistente/senha errada.
- JWT de acesso curto (15 min, HS256 fixo) + refresh token opaco, guardado como hash, **rotativo**; reuso de token antigo revoga todas as sessões.
- Troca/redefinição de senha revoga as sessões abertas; conta desativada perde acesso na hora.
- `helmet`, CORS configurável, limite de corpo (100 kb), rate limit em `/auth`, validação de toda entrada com `zod`, SQL sempre parametrizado.
- Segredos só por variável de ambiente (`.env` fora do Git).

## 7. Limitações conhecidas / próximos passos
- Recuperação de senha **não envia e-mail** ainda: com `EXPOSE_RESET_TOKEN=true` (apenas desenvolvimento) o token vem na resposta.
- Pontos de ônibus são fictícios; falta importar dados reais (ex.: OpenStreetMap).
- O pagamento é disparado pelo próprio app (simulação). A validação real pelo validador do ônibus depende de integração com a bilhetagem.
- Falta publicar a especificação OpenAPI, configurar CI, ESLint e o deploy (HTTPS via proxy reverso).
- Fase 4: conectar o aplicativo (React Native) a esta API.
