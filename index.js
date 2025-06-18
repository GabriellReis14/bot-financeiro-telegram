require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const { google } = require('googleapis');

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

async function analisarMensagemComGPT(texto) {
  const prompt = `
  Classifique a seguinte frase de gasto:

  Frase: "${texto}"

  Responda em JSON com os seguintes campos:
  - valor (número)
  - forma_pagamento (pix, débito, crédito, dinheiro, outro)
  - categoria_macro (Despesa Fixa, Variável, Lazer, etc)
  - categoria_detalhada (exemplo: Mercado, Restaurante, Transporte, etc)
  - data (exemplo: "2025-06-18")

  Responda apenas o JSON puro, sem blocos de código, sem comentários, sem formatação adicional.
  `;

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    }
  );

  console.log('Resposta do GPT:', response.data.choices[0].message.content);

  const respostaGPT = response.data.choices[0].message.content;
  return JSON.parse(respostaGPT);
}

async function salvarNoGoogleSheets(lancamento) {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials-google.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.SHEET_ID,
    range: 'Lançamentos!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [
        [
          lancamento.data,
          lancamento.valor,
          lancamento.forma_pagamento,
          lancamento.categoria_macro,
          lancamento.categoria_detalhada,
        ],
      ],
    },
  });
}

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const texto = msg.text;

  try {
    const analise = await analisarMensagemComGPT(texto);

    console.log('Análise do gasto:', analise);
    await salvarNoGoogleSheets(analise);
    bot.sendMessage(chatId, `✅ Lançamento feito: R$${analise.valor} - ${analise.categoria_detalhada} - ${analise.forma_pagamento}`);
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, '❌ Erro ao processar a mensagem.');
  }
});
