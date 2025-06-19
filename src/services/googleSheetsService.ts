import { getSheetsClient } from "./googleAuth";

export async function appendExpenseToSheet(
  expense: any,
  spreadsheetId: string
): Promise<void> {
  const sheets = await getSheetsClient();

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "Lançamentos!A2",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          expense.date,
          expense.amount,
          expense.payment_method,
          expense.macro_category,
          expense.detailed_category,
        ],
      ],
    },
  });
}

export async function getExpensesInRange(
  spreadsheetId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const sheets = await getSheetsClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Lançamentos!A2:E",
  });

  const rows = res.data.values || [];
  let total = 0;

  rows.forEach(([date, amount]) => {
    if (date >= startDate && date <= endDate && !isNaN(parseFloat(amount))) {
      total += parseFloat(amount);
    }
  });

  return total;
}
