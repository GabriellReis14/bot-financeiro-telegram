import { getOrCreateUser, getUserSpreadsheetId } from "./userService";
import { detectIntent, analyzeExpense, analyzeQuery } from "./openAiService";
import { setPendingConfirmation } from "./confirmationService";
import { getExpensesInRange } from "./googleSheetsService";

export async function handleUserMessage(
  chatId: number,
  text: string,
  username: string | undefined,
  sendMessage: (msg: string) => void
) {
  const intent = await detectIntent(text);

  const spreadsheetId = await getOrCreateUser(chatId, username);

  if (intent.type === "query") {
    const queryResult: QueryAnalysisResponse = await analyzeQuery(text);
    if (queryResult.success) {
      const { start_date, end_date } = queryResult.data!;
      const total = await getExpensesInRange(
        spreadsheetId,
        start_date,
        end_date
      );
      sendMessage(
        `📊 Total de gastos entre ${start_date} e ${end_date}: R$${total.toFixed(
          2
        )}`
      );
    } else {
      sendMessage(
        queryResult.message || "❌ Não entendi o período da consulta."
      );
    }
    return;
  }

  if (intent.type === "expense") {
    const expenseResult: ExpenseAnalysisResponse = await analyzeExpense(text);

    if (!expenseResult.success) {
      sendMessage(
        expenseResult.message || "❌ Não consegui entender o lançamento."
      );
      return;
    }

    const expense = expenseResult.data!;

    setPendingConfirmation(chatId, expense);

    sendMessage(`🤖 Detectei o seguinte lançamento:
      - Valor: R$${expense.amount}
      - Forma de pagamento: ${expense.payment_method}
      - Categoria: ${expense.macro_category} → ${expense.detailed_category}
      - Data: ${expense.date}

      Está correto? (Responda "sim" para confirmar ou "não" para tentar novamente)`);
    return;
  }

  sendMessage(
    "❌ A frase enviada não parece relacionada a finanças ou gastos."
  );
}
