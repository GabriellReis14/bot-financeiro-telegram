import { saveLaunch } from "./launchService";
import { getUserSpreadsheetId } from "./userService";
import { appendExpenseToSheet } from "./googleSheetsService";

const pendingConfirmations: Record<number, ExpenseAnalysisResponse["data"]> = {};

export function setPendingConfirmation(chatId: number, expense: ExpenseAnalysisResponse["data"]) {
  pendingConfirmations[chatId] = expense;
}

export function clearPendingConfirmation(chatId: number) {
  delete pendingConfirmations[chatId];
}

export function hasPendingConfirmation(chatId: number) {
  return !!pendingConfirmations[chatId];
}

export async function handleUserConfirmation(chatId: number, text: string, sendMessage: (msg: string) => void) {
  const userResponse = text.toLowerCase();

  if (!pendingConfirmations[chatId]) return false;

  if (userResponse === "sim") {
    const expense = pendingConfirmations[chatId];

    await saveLaunch(chatId, {
      date: expense.date,
      amount: expense.amount,
      type: expense.type?.toLowerCase(), // 'income' ou 'expense'
      paymentMethod: expense.payment_method?.toLowerCase(),
      macroCategory: expense.macro_category,
      detailedCategory: expense.detailed_category,
    });

    // (Opcional) Se ainda quiser gravar também na planilha:
    if (process.env.ENABLE_GOOGLE_SHEETS === "true") {
      const spreadsheetId = await getUserSpreadsheetId(chatId);
      await appendExpenseToSheet(expense, spreadsheetId as string);
    }

    sendMessage("✅ Lançamento confirmado e salvo no banco de dados!");
    clearPendingConfirmation(chatId);
    return true;
  }

  if (userResponse === "não" || userResponse === "nao") {
    sendMessage("❌ Lançamento cancelado. Por favor, envie novamente.");
    clearPendingConfirmation(chatId);
    return true;
  }

  sendMessage('❗ Por favor, responda apenas com "sim" para confirmar ou "não" para cancelar.');
  return true;
}
