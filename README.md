# 📊 Personal Finance Telegram Bot (Open Source MVP)

Um bot de Telegram open-source, feito em **Node.js + TypeScript**, que ajuda a **controlar receitas e despesas pessoais**, com uso de **OpenAI GPT API**, **Google Sheets API**, **SQLite via Prisma** e **Telegram Bot API**.

Este é um projeto de estudo e MVP, criado para testar automações financeiras pessoais de forma simples e interativa via Telegram.

---

## ✅ Funcionalidades principais

- 💬 **Cadastro de despesas e receitas por texto, áudio ou imagem (com OCR)**
- 🤖 **Análise de texto com OpenAI GPT para interpretar lançamentos**
- 🧾 **Consulta de gastos por período (exemplo: "Quanto gastei esse mês?")**
- 📧 **Cadastro de usuários por e-mail**
- 🗃️ **Armazenamento dos dados em SQLite (via Prisma)**
- 📈 **Geração de PDF com resumo e gráfico de pizza dos gastos**
- 🗂️ **Integração opcional com Google Sheets (para ter uma planilha online)**
- 🎙️ **Suporte a mensagens de áudio (transcrição via OpenAI Whisper API)**
- 🖼️ **Suporte a OCR de imagens (com Tesseract.js)**

---

## 📂 Estrutura de pastas

```
📁 /src
 ├── /bot               → Arquivos do Telegram Bot
 ├── /services          → Lógica de negócio (finance, user, openai, google, etc)
 ├── /utils             → Funções utilitárias (formatadores, conversores, etc)
 ├── /lib               → Prisma Client
 └── /types             → Tipagens TypeScript globais

📁 /prisma               → Schema Prisma
📁 /downloads            → Onde salva áudios, imagens e PDFs temporários
📄 .env                  → Variáveis de ambiente (não subir pro Git)
📄 .env.example          → Exemplo de env
📄 package.json
📄 tsconfig.json
```

---

## 🚀 Como rodar o projeto localmente

### 1. Clone o repositório:

```bash
git clone https://github.com/GabriellReis14/telegram-finance-bot.git
cd telegram-finance-bot
```

---

### 2. Instale as dependências:

```bash
npm install
```

---

### 3. Configure seu `.env`

Crie um arquivo `.env` com base no `.env.example`:

```bash
cp .env.example .env
```

Preencha com suas chaves:

| Variável             | Descrição                                                        |
| -------------------- | ---------------------------------------------------------------- |
| TELEGRAM_TOKEN       | Token do seu Bot no Telegram                                     |
| OPENAI_API_KEY       | Sua API Key da OpenAI                                            |
| ENABLE_GOOGLE_SHEETS | true ou false - Ativa ou desativa a integração com Google Sheets |
| ---                  | ---                                                              |

---

### 4. Configure o banco de dados Prisma (SQLite)

```bash
npx prisma migrate dev --name init
```

---

### 5. Configurando a API do Google Sheets (Google Cloud)

Se quiser utilizar a integração com **Google Sheets**, siga os passos abaixo para gerar o arquivo `credenciais-google.json`:

#### ✅ Passo a passo para criar o projeto no Google Cloud:

1. Acesse: [https://console.cloud.google.com/](https://console.cloud.google.com/)

2. Crie um novo projeto (exemplo: **FinanceBot Sheets Integration**)

3. No menu lateral, vá em **APIs & Services → Library**

4. Ative as seguintes APIs:

- **Google Sheets API**
- **Google Drive API**

5. Vá em **APIs & Services → Credentials → Create Credentials → Service Account**

6. Após criar a Service Account:

- Clique em "**Manage keys**"
- Crie uma chave no formato **JSON**
- Baixe o arquivo e renomeie para:  
  📄 `credenciais-google.json`

7. Copie esse arquivo para a raiz do projeto (junto ao `package.json`).

8. Compartilhe a planilha criada com o e-mail da service account (exemplo: `finance-bot-123@yourproject.iam.gserviceaccount.com`).

9. No seu `.env`, ative a integração definindo:

```
ENABLE_GOOGLE_SHEETS=true
```

---

### 6. Inicie o projeto:

```bash
npm run build
npm run start
```

(ou, para rodar em dev com hot reload:)

```bash
npm run dev
```

---

## 🧪 Exemplos de comandos para testar:

| Comando                                  | Resultado                           |
| ---------------------------------------- | ----------------------------------- |
| "Gastei 30 reais no mercado hoje"        | Bot pede confirmação e salva        |
| "Recebi 500 reais de um cliente"         | Bot reconhece como receita          |
| "Quanto gastei esse mês?"                | Bot responde com total              |
| "Quanto recebi este ano?"                | Bot responde com total de receitas  |
| "Me gera um PDF dos meus gastos de maio" | Bot gera e envia um PDF com gráfico |

---

## 🛠️ Tecnologias usadas:

- Node.js
- TypeScript
- Prisma ORM (SQLite)
- Telegram Bot API
- OpenAI API (GPT + Whisper)
- Google Sheets API
- Tesseract.js (OCR)
- pdfkit + chartjs-node-canvas (PDF com gráficos)

---

## ⚠️ Avisos:

- Este projeto é um **exemplo didático / MVP**
- Não é indicado para uso comercial ou produção sem ajustes de segurança
- Não possui autenticação robusta entre múltiplos usuários
- Dependências de API externas podem gerar custos (exemplo: OpenAI API, Google Cloud)

---

## 🛠️ Possíveis Melhorias Futuras

- 📅 **Cadastro de despesas fixas e variáveis mensais**

Exemplo:

| Dia | Descrição                   | Tipo     |
| --- | --------------------------- | -------- |
| 10  | Aluguel, Conta de Energia   | Fixo     |
| 20  | Fatura do Cartão de Crédito | Variável |

Permitir ao usuário consultar:

- "**Quais são minhas despesas fixas deste mês?**"
- "**Quais despesas tenho previstas para o mês?**"

---

- 🔔 **Envio automático de lembretes**

Exemplo:

> "_Hoje é dia 10! Não esqueça que você tem o Aluguel e a Conta de Energia para pagar._"

- 📆 **Consulta de fluxo de caixa futuro**

> "_Me mostre todas as despesas previstas para os próximos 30 dias._"

- 📈 **Dashboard Web para visualização de gráficos, metas e saldos**

- 🏦 **Integração com APIs bancárias (Open Finance ou serviços de terceiros)**

- 🧠 **Treinamento do GPT para categorizar melhor despesas novas com base no histórico do usuário**

---

## 📄 Licença:

MIT License.

---

## 👤 Autor:

Gabriell Reis

---
