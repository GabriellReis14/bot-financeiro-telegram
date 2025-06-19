import { appendExpenseToSheet } from "./googleSheetsService";
import { getUserSpreadsheetId } from "./userService";

const pendingConfirmations: Record<number, ExpenseAnalysisResponse["data"]> =
  {};

export function setPendingConfirmation(
  chatId: number,
  expense: ExpenseAnalysisResponse["data"]
) {
  pendingConfirmations[chatId] = expense;
}

export function clearPendingConfirmation(chatId: number) {
  delete pendingConfirmations[chatId];
}

export function hasPendingConfirmation(chatId: number) {
  return !!pendingConfirmations[chatId];
}

export async function handleUserConfirmation(
  chatId: number,
  text: string,
  sendMessage: (msg: string) => void
) {
  const userResponse = text.toLowerCase().trim();

  if (!pendingConfirmations[chatId]) return false;

  if (userResponse === "sim") {
    const expense = pendingConfirmations[chatId];
    const spreadsheetId = await getUserSpreadsheetId(chatId);
    await appendExpenseToSheet(expense!, spreadsheetId);
    sendMessage("✅ Lançamento confirmado e salvo!");
    clearPendingConfirmation(chatId);
    return true;
  }

  if (userResponse === "não" || userResponse === "nao") {
    sendMessage("❌ Lançamento cancelado. Por favor, envie novamente.");
    clearPendingConfirmation(chatId);
    return true;
  }

  sendMessage(
    '❗ Por favor, responda apenas com "sim" para confirmar ou "não" para cancelar.'
  );
  return true;
}
