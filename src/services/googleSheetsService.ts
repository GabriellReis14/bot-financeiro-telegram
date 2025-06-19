import { getSheetsClient } from "./googleAuth";

export async function appendExpenseToSheet(expense: any, spreadsheetId: string): Promise<void> {
  const sheets = await getSheetsClient();

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "Lançamentos!A2",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[expense.date, expense.amount, expense.type, expense.payment_method, expense.macro_category, expense.detailed_category]],
    },
  });
}
