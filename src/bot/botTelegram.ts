import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import { handleUserMessage } from "../services/financeService";
import { handleUserConfirmation, hasPendingConfirmation } from "../services/confirmationService";
import { downloadTelegramFile } from "../utils/telegramFile";
import { runOCR } from "../services/ocrService";
import { convertOggToMp3 } from "../services/audioService";
import { transcribeAudio } from "../services/transcriptionService";
import { handleEmailResponse, isAwaitingEmail, setAwaitingEmail } from "../services/userService";

import dotenv from "dotenv";
import { prisma } from "../lib/prisma";
dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN!, { polling: true });

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg?.text?.trim()!;
  const photo = msg?.photo;
  const voice = msg?.voice;
  const username = `${msg.chat?.first_name} ${msg.chat?.last_name}`.trim() || undefined;

  if (!text && !photo && !voice) return;

  const reply = (message: string) => bot.sendMessage(chatId, message);
  const sendDocument = (filePath: string) => bot.sendDocument(chatId, fs.createReadStream(filePath));

  if (hasPendingConfirmation(chatId)) {
    const handled = await handleUserConfirmation(chatId, text, reply);
    if (handled) return;
  }

  if (isAwaitingEmail(chatId)) {
    await handleEmailResponse(chatId, text, username || "", reply);
    return;
  }

  const existingUser = await prisma.user.findUnique({
    where: { telegramId: BigInt(chatId) },
  });

  if (!existingUser || !existingUser.email) {
    reply("👋 Olá! Antes de começarmos, por favor, me informe seu e-mail para cadastro.");
    setAwaitingEmail(chatId);
    return;
  }

  if (text && ["/start", "oi", "olá", "ola", "bom", "boa"].includes(text?.toLowerCase())) {
    reply('👋 Olá novamente! Como posso te ajudar hoje?\nVocê pode me perguntar coisas como:\n- "Quanto gastei ontem?"\n- "Quero lançar um gasto de 50 reais no mercado."');
    return;
  }

  if (voice) {
    const fileId = voice.file_id;
    const oggPath = await downloadTelegramFile(fileId, "./downloads");
    const mp3Path = await convertOggToMp3(oggPath, "./downloads");

    reply("🎙️ Áudio recebido. Transcrevendo...");

    try {
      const transcription = await transcribeAudio(mp3Path);

      reply(`📝 Transcrição: "${transcription}"`);

      await handleUserMessage(chatId, transcription, reply, (filePath) => {
        sendDocument(filePath);
      });
    } catch (error) {
      console.error("Erro na transcrição:", error);
      reply("❌ Erro ao transcrever o áudio.");
    }

    return;
  }

  if (photo) {
    const largestPhoto = photo[photo.length - 1];
    const fileId = largestPhoto.file_id;
    const localPath = await downloadTelegramFile(fileId, "./downloads");

    reply("📷 Imagem recebida. Processando OCR...");

    const extractedText = await runOCR(localPath);

    if (!extractedText.trim()) {
      reply("❌ Não consegui extrair texto da imagem.");
      return;
    }

    reply(`📝 Texto extraído da imagem:\n\n"${extractedText}"`);

    // Depois do OCR, envia o texto para o fluxo de NLP normal (detectar gasto ou consulta)
    await handleUserMessage(chatId, extractedText, reply, (filePath) => {
      sendDocument(filePath);
    });
    return;
  }

  if (hasPendingConfirmation(chatId)) {
    const handled = await handleUserConfirmation(chatId, text, reply);
    if (handled) return;
  }

  await handleUserMessage(chatId, text, reply, (filePath) => {
    sendDocument(filePath);
  });
});
