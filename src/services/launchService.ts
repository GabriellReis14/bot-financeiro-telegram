import { prisma } from "../lib/prisma";

export async function saveLaunch(
  telegramId: number,
  data: {
    date: string;
    amount: number;
    type: string; // 'income' ou 'expense'
    paymentMethod: string;
    macroCategory: string;
    detailedCategory: string;
  }
) {
  const user = await prisma.user.findUnique({ where: { telegramId: BigInt(telegramId) } });
  if (!user) throw new Error("Usuário não encontrado.");

  await prisma.launch.create({
    data: {
      userId: user.id,
      date: new Date(data.date),
      amount: data.amount,
      type: data.type,
      paymentMethod: data.paymentMethod,
      macroCategory: data.macroCategory,
      detailedCategory: data.detailedCategory,
    },
  });
}
