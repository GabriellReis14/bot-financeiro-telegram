import TelegramBot from "node-telegram-bot-api";
import { handleUserMessage } from "../services/financeService";
import {
  handleUserConfirmation,
  hasPendingConfirmation,
} from "../services/confirmationService";
import dotenv from "dotenv";
dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN!, { polling: true });

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();
  const username = msg.contact?.first_name;

  console.log({ username });
  if (!text) return;

  const reply = (message: string) => bot.sendMessage(chatId, message);

  if (hasPendingConfirmation(chatId)) {
    const handled = await handleUserConfirmation(chatId, text, reply);
    if (handled) return;
  }

  await handleUserMessage(chatId, text, username, reply);
});
