# 🚌 BusField Pass

**Uma maneira mais prática e digital de gerenciar sua experiência no transporte público.**

O **BusField Pass** é uma aplicação voltada à mobilidade urbana, desenvolvida com o objetivo de facilitar o acesso a informações sobre o transporte público e oferecer uma experiência digital para o gerenciamento do cartão de transporte.

A proposta é reunir funcionalidades como consulta de pontos de ônibus próximos, acompanhamento de saldo e movimentações e gerenciamento das informações do cartão em um único aplicativo.

---

## 📱 Funcionalidades

O projeto contempla as seguintes funcionalidades:

- **Autenticação de usuários:** cadastro e login de usuários.
- **Cartão de transporte:** visualização e gerenciamento das informações do cartão.
- **Consulta de saldo:** acompanhamento do saldo disponível.
- **Recarga:** possibilidade de adicionar créditos ao cartão.
- **Histórico de movimentações:** consulta de recargas e gastos realizados.
- **Interface intuitiva:** navegação simples e experiência voltada à praticidade.

> Algumas funcionalidades podem estar em desenvolvimento e serão implementadas gradualmente.

## 🛠️ Tecnologias utilizadas

O BusField Pass utiliza tecnologias modernas para o desenvolvimento de aplicações mobile, APIs e gerenciamento de dados.

### Front-end
- React Native
- Expo
- JavaScript

### Back-end
- Node.js
- Express.js
- PostgreSQL
- API REST

### Banco de dados e serviços
- Supabase
- PostgreSQL

### Ferramentas
- Visual Studio Code
- Git
- GitHub
- npm

---

## 📂 Estrutura do projeto

O projeto está organizado em duas aplicações principais:

```text
busfield-pass/
│
├── busfield-pass-app/       # Aplicação front-end
│   ├── assets/
│   ├── components/
│   ├── screens/
│   ├── ...
│   └── package.json
│
├── busfield-pass-backend/   # API e lógica de negócio
│   ├── src/
│   ├── scripts/
│   ├── ...
│   └── package.json
│
├── .gitignore
└── README.md
```

*Os diretórios internos podem variar conforme a evolução do projeto.*

---

## ⚙️ Como executar o projeto

### 1. Pré-requisitos

Antes de começar, é necessário ter instalado:

- [Node.js](https://nodejs.org/)
- npm
- [Git](https://git-scm.com/)
- Uma instância PostgreSQL configurada no Supabase.

### 2. Clonar o repositório

```bash
git clone https://github.com/SEU-USUARIO/busfield-pass.git
```

Acesse a pasta do projeto:

```bash
cd busfield-pass
```

### 3. Configurar o back-end

Entre na pasta do servidor:

```bash
cd busfield-pass-backend
```

Instale as dependências:

```bash
npm install
```

Crie um arquivo `.env` na pasta do backend e configure as variáveis necessárias:

```env
PORT=3000
DATABASE_URL=sua_string_de_conexao_postgresql
DATABASE_SSL=true
JWT_SECRET=sua_chave_secreta
```

Inicie o servidor:

```bash
npm run dev
```

### 4. Configurar o front-end

Abra outro terminal e acesse a pasta do aplicativo:

```bash
cd busfield-pass-app
```

Instale as dependências:

```bash
npm install
```

Crie um arquivo `.env` na pasta do front-end:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
```

Inicie a aplicação:

```bash
npm run web
```

O Expo iniciará a aplicação no navegador. Também é possível utilizar os recursos do Expo para executar o projeto em dispositivos compatíveis.

---

## 🔐 Segurança e variáveis de ambiente

As credenciais e informações sensíveis devem ser armazenadas em arquivos `.env`, que não devem ser enviados ao GitHub.

Nunca compartilhe publicamente:

- Senhas do banco de dados.
- Chaves JWT.
- Tokens de autenticação.
- Credenciais de serviços externos.

Para facilitar a configuração, recomenda-se disponibilizar arquivos `.env.example` com valores fictícios e instruções de preenchimento.

---

## 🚀 Objetivo do projeto

O BusField Pass busca explorar como a tecnologia pode contribuir para uma experiência mais acessível, organizada e prática no transporte público.

A aplicação está sendo desenvolvida com uma arquitetura separada entre front-end e back-end, permitindo a integração por meio de uma API REST e facilitando a evolução e manutenção do sistema.

---

## 👨‍💻 Desenvolvimento

Projeto desenvolvido como iniciativa de desenvolvimento de software, envolvendo tecnologias de desenvolvimento mobile, construção de APIs, integração com banco de dados e soluções digitais para mobilidade urbana.

---

**BusField Pass — Mobilidade mais simples, experiência mais digital.**
