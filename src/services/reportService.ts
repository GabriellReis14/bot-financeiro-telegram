import { prisma } from "../lib/prisma";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import { formatDateToBR } from "../utils/dateUtils";

interface PaymentSummary {
  paymentMethod: string;
  total: number;
}

export async function getExpenseSummaryByPaymentMethod(userTelegramId: number, startDate: string, endDate: string): Promise<PaymentSummary[]> {
  const user = await prisma.user.findUnique({
    where: { telegramId: BigInt(userTelegramId) },
  });

  if (!user) throw new Error("Usuário não encontrado.");

  const launches = await prisma.launch.findMany({
    where: {
      userId: user.id,
      type: "expense",
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
  });

  const summary: Record<string, number> = {};

  launches.forEach((launch) => {
    const method = launch.paymentMethod || "Outro";
    summary[method] = (summary[method] || 0) + launch.amount;
  });

  return Object.entries(summary).map(([paymentMethod, total]) => ({
    paymentMethod,
    total,
  }));
}

export async function generateExpenseSummaryPDF(userTelegramId: number, startDate: string, endDate: string): Promise<string> {
  const summary = await getExpenseSummaryByPaymentMethod(userTelegramId, startDate, endDate);
  const total = summary.reduce((acc, item) => acc + item.total, 0);

  const width = 600;
  const height = 400;
  const chartCanvas = new ChartJSNodeCanvas({ width, height });
  const chartBuffer = await chartCanvas.renderToBuffer({
    type: "pie",
    data: {
      labels: summary.map((s) => s.paymentMethod),
      datasets: [
        {
          data: summary.map((s) => s.total),
          backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4CAF50", "#FF9800"],
        },
      ],
    },
  });

  const outputPath = path.resolve("./downloads", `relatorio_${Date.now()}.pdf`);
  const doc = new PDFDocument();
  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  doc.fontSize(16).text("Relatório de Gastos por Forma de Pagamento", { align: "center" });
  doc.moveDown();
  doc.fontSize(12).text(`Período: ${formatDateToBR(startDate)} até ${formatDateToBR(endDate)}`);
  doc.text(`Total gasto: R$ ${total.toFixed(2)}`);
  doc.moveDown();

  summary.forEach((item) => {
    doc.text(`- ${item.paymentMethod}: R$ ${item.total.toFixed(2)}`);
  });

  doc.moveDown();
  doc.image(chartBuffer, { fit: [500, 300], align: "center" });
  doc.end();

  return new Promise((resolve, reject) => {
    writeStream.on("finish", () => resolve(outputPath));
    writeStream.on("error", reject);
  });
}
