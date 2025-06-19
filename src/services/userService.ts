import { prisma } from "../lib/prisma";
import { google } from "googleapis";
import { getDriveClient, getSheetsClient } from "./googleAuth";

async function createUserSpreadsheet(): Promise<string> {
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

  const ownerResponse = await drive.permissions.create({
    fileId: spreadsheetId,
    requestBody: {
      role: "writer",
      type: "user",
      emailAddress: "gabrielldiflen@gmail.com",
    },
    // transferOwnership: true,
    sendNotificationEmail: true,
  });

  console.log("Propriedade transferida para:", ownerResponse);

  return spreadsheetId;
}

export async function getOrCreateUser(
  telegramId: number,
  telegramUsername?: string
): Promise<string> {
  const existingUser = await prisma.user.findUnique({
    where: { telegramId: BigInt(telegramId) },
  });

  if (existingUser) return existingUser.spreadsheetId;

  const spreadsheetId = await createUserSpreadsheet();

  await prisma.user.create({
    data: {
      telegramId: BigInt(telegramId),
      telegramUsername,
      spreadsheetId,
    },
  });

  return spreadsheetId;
}

export async function getUserSpreadsheetId(
  telegramId: number
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { telegramId: BigInt(telegramId) },
  });

  if (!user) throw new Error("Usuário não encontrado.");
  return user.spreadsheetId;
}
