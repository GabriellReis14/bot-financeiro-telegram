import { setAwaitingEmail } from "./userService";
import { detectIntent, analyzeExpense, analyzeQuery } from "./openAiService";
import { setPendingConfirmation } from "./confirmationService";
import { getExpenseSummaryByPaymentMethod, generateExpenseSummaryPDF } from "./reportService";
import { formatDateToBR } from "../utils/dateUtils";

const pendingPDFConfirmations: Record<number, { startDate: string; endDate: string }> = {};

export async function handleUserMessage(chatId: number, text: string, sendMessage: (msg: string) => void, sendDocument: (path: string) => void) {
  const intent = await detectIntent(text);

  if (intent.type === "registration") {
    setAwaitingEmail(chatId);
    sendMessage("📧 Por favor, me informe seu e-mail para finalizar o cadastro.");
    return;
  }

  if (intent.type === "query") {
    const queryResult: QueryAnalysisResponse = await analyzeQuery(text);
    if (queryResult.success) {
      const { start_date, end_date } = queryResult.data!;
      const summary = await getExpenseSummaryByPaymentMethod(chatId, start_date, end_date);

      if (summary.length === 0) {
        sendMessage("📊 Nenhum gasto encontrado nesse período.");
        return;
      }

      const total = summary.reduce((acc, item) => acc + item.total, 0);
      const periodFormatted = `📅 Período: ${formatDateToBR(start_date)} até ${formatDateToBR(end_date)}`;

      let response = `📊 Resumo de gastos por forma de pagamento:\n\n`;
      summary.forEach((item) => {
        response += `- ${item.paymentMethod}: R$ ${item.total.toFixed(2)}\n`;
      });
      response += `\nTotal gasto: R$ ${total.toFixed(2)}\n\n${periodFormatted}`;

      sendMessage(response);

      pendingPDFConfirmations[chatId] = { startDate: start_date, endDate: end_date };
      sendMessage('📎 Quer que eu gere um PDF com gráfico desse período? (Responda "sim" ou "não")');
    } else {
      sendMessage(queryResult.message || "❌ Não entendi o período da consulta.");
    }
    return;
  }

  if (pendingPDFConfirmations[chatId] && text.toLowerCase() === "sim") {
    const { startDate, endDate } = pendingPDFConfirmations[chatId];
    const pdfPath = await generateExpenseSummaryPDF(chatId, startDate, endDate);

    sendDocument(pdfPath);

    delete pendingPDFConfirmations[chatId];
    return;
  }

  if ((pendingPDFConfirmations[chatId] && text.toLowerCase() === "não") || (pendingPDFConfirmations[chatId] && text.toLowerCase() === "nao")) {
    sendMessage("✅ Ok, não vou gerar o PDF.");
    delete pendingPDFConfirmations[chatId];
    return;
  }

  if (intent.type === "expense" || intent.type === "income") {
    const expenseResult: ExpenseAnalysisResponse = await analyzeExpense(text);

    if (!expenseResult.success) {
      sendMessage(expenseResult.message || "❌ Não consegui entender o lançamento.");
      return;
    }

    const expense = expenseResult.data!;
    setPendingConfirmation(chatId, expense);

    sendMessage(`🤖 Detectei o seguinte lançamento:

    - Valor: R$${expense.amount}
    - Tipo: ${expense.type} 
    - Forma de pagamento: ${expense.payment_method}
    - Categoria: ${expense.macro_category} → ${expense.detailed_category}
    - Data: ${formatDateToBR(expense.date)}

    Está correto? (Responda "sim" para confirmar ou "não" para tentar novamente)`);
    return;
  }

  sendMessage("❌ A frase enviada não parece relacionada a finanças ou gastos.");
}
