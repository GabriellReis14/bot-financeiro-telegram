import { prisma } from "../lib/prisma";
import { getDriveClient, getSheetsClient } from "./googleAuth";

const pendingEmails: Record<number, boolean> = {};

export function isAwaitingEmail(chatId: number) {
  return pendingEmails[chatId];
}

export function setAwaitingEmail(chatId: number) {
  pendingEmails[chatId] = true;
}

export function clearAwaitingEmail(chatId: number) {
  delete pendingEmails[chatId];
}

export async function handleEmailResponse(chatId: number, email: string, username: string, sendMessage: (msg: string) => void) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    sendMessage("❌ O e-mail informado não parece ser válido. Por favor, envie um e-mail no formato correto (exemplo: seuemail@gmail.com).");
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    sendMessage("❌ Este e-mail já está sendo usado por outro usuário. Informe outro.");
    return;
  }

  const user = await prisma.user.upsert({
    update: {
      telegramUsername: username,
      email,
    },
    create: {
      telegramId: BigInt(chatId),
      telegramUsername: username,
      email,
      spreadsheetId: process.env.ENABLE_GOOGLE_SHEETS === "true" ? await createUserSpreadsheet(email) : null,
    },
    where: {
      telegramId: BigInt(chatId),
    },
  });

  clearAwaitingEmail(chatId);

  let message = `✅ Cadastro concluído! Agora posso te ajudar com suas despesas e receitas.\n`;
  if (user?.spreadsheetId) {
    message += `📊 Sua planilha foi criada com sucesso! Você pode acessá-la aqui: https://docs.google.com/spreadsheets/d/${user.spreadsheetId}`;
  }

  sendMessage(message);
}

async function createUserSpreadsheet(email?: string): Promise<string> {
  const sheets = await getSheetsClient();
  const drive = getDriveClient();

  const response = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: "Bot Financeiro - Novo Usuário" },
      sheets: [
        {
          properties: { title: "Lançamentos" },
        },
      ],
    },
  });

  const spreadsheetId = response.data.spreadsheetId!;
  const sheetName = "Lançamentos";

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1:G1`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          "Data",
          "Valor",
          "Tipo", // Receita ou Despesa
          "Forma de Pagamento",
          "Categoria Macro",
          "Categoria Detalhada",
          "Descrição Opcional",
        ],
      ],
    },
  });

  await drive.permissions.create({
    fileId: spreadsheetId,
    requestBody: {
      role: "writer",
      type: "user",
      emailAddress: email || "",
    },
    // transferOwnership: true,
    sendNotificationEmail: true,
  });

  return spreadsheetId;
}

type CreateUserProps = {
  telegramId: number;
  telegramUsername?: string;
  email?: string;
};

export async function getOrCreateUser(props: CreateUserProps) {
  const { telegramId, telegramUsername = "", email } = props;
  const existingUser = await prisma.user.findUnique({
    where: { telegramId: BigInt(telegramId) },
  });

  if (existingUser) {
    await prisma.user.update({
      where: { telegramId: BigInt(telegramId) },
      data: { telegramUsername },
    });
    return existingUser;
  }

  let spreadsheetId = null;
  if (process?.env.ENABLE_GOOGLE_SHEETS === "true") {
    spreadsheetId = await createUserSpreadsheet(email);
  }

  const user = await prisma.user.create({
    data: {
      telegramId: BigInt(telegramId),
      telegramUsername,
      email,
      spreadsheetId,
    },
  });

  return user;
}

export async function getUserSpreadsheetId(telegramId: number): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { telegramId: BigInt(telegramId) },
  });

  if (!user) throw new Error("Usuário não encontrado.");
  return user.spreadsheetId;
}
