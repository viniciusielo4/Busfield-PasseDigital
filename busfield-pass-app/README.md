# BusField Pass – Aplicativo mobile (Fase 4)

App de passageiros do BusField Pass, feito com **React Native + Expo (SDK 58)** em JavaScript.
Consome a API do backend da Fase 3 (`busfield-pass-backend`).

> MVP: recargas e pagamentos são **simulados**. Uma faixa amarela "MODO DEMONSTRAÇÃO" fica fixa no topo de todas as telas.

## 1. Como rodar

Pré-requisitos: Node 20+, o backend rodando (veja o README dele) e o app **Expo Go** no celular (ou um emulador Android/iOS).

```bash
npm install
cp .env.example .env      # ajuste EXPO_PUBLIC_API_URL (veja abaixo)
npx expo start            # escaneie o QR Code com o Expo Go
```

### Rodar no navegador do PC (sem celular)

```bash
# no .env do app:
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1

npm run web        # abre o app em http://localhost:8081
```
Dica: no Chrome, aperte F12 e ative o modo dispositivo (ícone de celular) para ver o app no formato de telefone.
No navegador a sessão fica no `localStorage` (apenas para desenvolvimento; no celular usa o armazenamento seguro do aparelho).

**Endereço da API (`EXPO_PUBLIC_API_URL`, sempre terminando em `/api/v1`)**

| Onde o app roda | Valor |
|---|---|
| Emulador Android | `http://10.0.2.2:3000/api/v1` |
| Simulador iOS | `http://localhost:3000/api/v1` |
| Celular físico (Expo Go) | `http://IP-DO-SEU-PC:3000/api/v1` (celular e PC na mesma rede Wi-Fi) |

Depois de mudar o `.env`, reinicie com `npx expo start -c`.

## 2. Telas e fluxos

| Atividade da fase | Onde está |
|---|---|
| Autenticação | `screens/auth/`: login, cadastro (já cria o cartão digital), recuperar e redefinir senha. Sessão guardada no armazenamento seguro do aparelho; sair revoga a sessão no servidor. |
| Tela inicial | `HomeScreen`: cartão com saldo, atalhos, resumo do mês e últimas movimentações; puxar para atualizar. |
| Interface do cartão | `CardScreen` + `PassCard`: número, status, tarifa, bloquear/desbloquear (com confirmação) e **simulação de passagem** para demonstrar o débito. |
| Consulta de saldo | Sempre vinda do backend (`GET /wallet`); atualiza ao voltar para a tela e depois de cada operação. |
| Interface de recargas | `RechargeScreen`: valores rápidos ou outro valor, validação de mínimo/máximo, prévia do saldo e comprovante (`ReceiptScreen`). |
| Histórico | `HistoryScreen`: filtro (todos/recargas/pagamentos), paginação infinita, comprovante ao tocar. |
| Perfil | `ProfileScreen` e `EditProfileScreen`: dados da conta, edição de nome/e-mail e sair. |
| Integração com o backend | `src/api/`: cliente HTTP, endpoints e armazenamento dos tokens. |

## 3. Decisões importantes

- **Idempotência:** recarga e pagamento enviam um `Idempotency-Key` (UUID) gerado a cada intenção do usuário. Se a rede cair e o usuário tentar de novo, a **mesma chave** é reenviada, então o backend não duplica a operação. Após sucesso ou erro definitivo (422), a próxima tentativa usa uma chave nova.
- **Renovação de sessão:** o token de acesso dura 15 min; ao expirar, o cliente renova sozinho e repete a chamada. Como o refresh token é de uso único, requisições simultâneas compartilham **uma única** renovação (senão o backend interpretaria como roubo de token e derrubaria a sessão). Queda de rede durante a renovação não desloga o usuário.
- **O app nunca calcula saldo:** só exibe o que o backend informa; valores trafegam em centavos.
- **Visual (redesenho minimalista):** inspirado em apps de bancos digitais, com as mesmas cores do Manual de Identidade. Superfícies brancas sem borda, tipografia mais leve, ícones de traço (Ionicons), cartão do passe com formas suaves, ações redondas com rótulo, valores agrupados por dia no histórico, botão para ocultar valores (olho) e tema claro/escuro automático. O aviso de demonstração virou uma pílula discreta, sempre visível no topo. Os tons suaves (fundos de ícones e avisos) são as próprias cores da paleta com transparência.

## 4. Testes

```bash
npm test                        # 34 testes: utilitários, cliente da API e telas (Jest + Testing Library)
npm run test:integration        # 10 testes contra o BACKEND REAL (precisa estar rodando em localhost:3000)
```
- `tests/apiClient.test.js`: erros padronizados, timeout/rede, renovação de sessão, renovação única em chamadas paralelas, cabeçalho de idempotência.
- `tests/screens.test.js`: validação do login, fluxo de recarga (limites, cartão bloqueado, reuso/troca da chave), cartão e simulação de passagem.
- `tests/integration.test.js`: cadastro → recarga → pagamento → histórico/resumo → bloqueio → renovação de sessão → logout, usando o código real do cliente.

## 5. Limitações e próximos passos
- **Não foi testado visualmente em aparelho/emulador** neste ambiente: a interface foi validada por testes automatizados e pela geração do pacote Android. Faça uma passada manual pelas telas e me avise o que estranhar.
- Ícone e splash ainda são os padrões do Expo; falta o logotipo definitivo.
- Fora desta fase: pontos de ônibus com mapa/localização, QR Code de pagamento, troca de senha pelo app e painel administrativo.
- Builds de produção exigem API em **HTTPS** (o Android bloqueia HTTP em builds finais). Em desenvolvimento com Expo Go, HTTP funciona.
- Acessibilidade: rótulos e papéis já definidos; falta testar com TalkBack/VoiceOver e com fonte ampliada.
