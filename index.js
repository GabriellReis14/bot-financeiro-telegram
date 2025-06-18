require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const { google } = require("googleapis");

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const estadoUsuario = {}; // Estado de interação por usuário

const auth = new google.auth.GoogleAuth({
  keyFile: "credentials-google.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

async function detectarIntencao(texto) {
  const prompt = `
Frase: "${texto}"

Determine o tipo de intenção do usuário.

A intenção deve ser relacionado a gastos, como lançamentos de despesas ou consultas de totais.

Se a frase não for um gasto (lançamento ou consulta), responda:

{
  "success": false,
  "message": "Desculpe, não consegui identificar um gasto nessa frase."
}

Se for uma consulta de total de gastos por período (exemplo: "Quanto gastei hoje?", "Total do mês passado", "Gastos em 2023"), responda:

{ "tipo": "consulta" }

Se for um lançamento de gasto (exemplo: "Gastei 50 reais no mercado", "Lançar um gasto de 30 reais no almoço"), responda:

{ "tipo": "lancamento" }

Se não for nenhuma das duas, responda:

{ "tipo": "outro" }

Responda apenas o JSON puro, sem blocos de código, sem comentários.
`;

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    }
  );

  const respostaGPT = response.data.choices[0].message.content;
  const respostaLimpa = respostaGPT.replace(/```json|```/g, "").trim();
  return JSON.parse(respostaLimpa);
}

async function analisarMensagemComGPT(texto, tipoAnalise = "lancamento") {
  const today = new Date().toISOString().split("T")[0];
  let prompt = "";

  if (tipoAnalise === "lancamento") {
    prompt = `
Hoje é ${today}.

Classifique a seguinte frase de gasto:

Frase: "${texto}"

Quando o texto mencionar "hoje", use a data: "${today}"
Use a data de hoje como referência se caso falar "ontem", "amanhã" ou "hoje".

Se a frase não for um gasto, responda:

{
  "success": false,
  "message": "Desculpe, não consegui identificar um gasto nessa frase."
}

Se for um gasto, responda em JSON assim:

{
  "success": true,
  "data": {
    "valor": (número),
    "forma_pagamento": (pix, débito, crédito, dinheiro, outro),
    "categoria_macro": (Despesa Fixa, Variável, Lazer, etc),
    "categoria_detalhada": (exemplo: Mercado, Restaurante, Transporte, etc),
    "data": (exemplo: "2025-06-18")
  }
}

Responda apenas o JSON puro, sem blocos de código.
`;
  } else if (tipoAnalise === "consulta") {
    prompt = `
Hoje é ${today}.

Sua tarefa é analisar a frase a seguir e identificar o intervalo de datas a que o usuário está se referindo.

Frase: "${texto}"

Instruções:

1. Considere frases com datas relativas como "hoje", "ontem", "amanhã", "este mês", "mês passado", "ano passado", "últimos 3 meses", "último semestre", etc.

2. Considere também frases com datas absolutas como "em 2023", "durante 2022", "abril de 2024", etc.

3. Para datas únicas (exemplo: "hoje", "ontem"), o início e fim devem ser o mesmo dia.

4. Se for um intervalo maior (exemplo: "ano passado", "mês passado", "2023"), calcule o período completo (exemplo: "2023-01-01" até "2023-12-31").

Se identificar o período, responda:

{
  "success": true,
  "data": {
    "data_inicio": "YYYY-MM-DD",
    "data_fim": "YYYY-MM-DD"
  }
}

Se não conseguir identificar um período, responda:

{
  "success": false,
  "message": "Não é uma consulta de período."
}

Responda apenas o JSON puro, sem blocos de código.
`;
  }

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    }
  );

  const respostaGPT = response.data.choices[0].message.content;
  const respostaLimpa = respostaGPT.replace(/```json|```/g, "").trim();
  return JSON.parse(respostaLimpa);
}

async function calcularTotalPorIntervalo(dataInicio, dataFim) {
  const sheets = google.sheets({ version: "v4", auth: await auth.getClient() });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: "Lançamentos!A2:E",
  });

  const linhas = res.data.values || [];

  let total = 0;

  linhas.forEach((linha) => {
    const [data, valor] = linha;
    if (data >= dataInicio && data <= dataFim && !isNaN(parseFloat(valor))) {
      total += parseFloat(valor);
    }
  });

  return total;
}

async function salvarNoGoogleSheets(lancamento) {
  const sheets = google.sheets({ version: "v4", auth: await auth.getClient() });

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.SHEET_ID,
    range: "Lançamentos!A1",
    valueInputOption: "USER_ENTERED",
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

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const texto = msg.text.trim();

  // Se o usuário estiver respondendo forma de pagamento pendente
  if (estadoUsuario[chatId] && estadoUsuario[chatId].esperandoFormaPagamento) {
    const formaPagamento = texto.toLowerCase();
    const formasValidas = [
      "pix",
      "débito",
      "debito",
      "crédito",
      "credito",
      "dinheiro",
      "outro",
    ];

    if (!formasValidas.includes(formaPagamento)) {
      bot.sendMessage(
        chatId,
        "❌ Forma de pagamento inválida. Responda com: Pix, Débito, Crédito, Dinheiro ou Outro."
      );
      return;
    }

    const lancamento = estadoUsuario[chatId].lancamentoPendente;
    lancamento.forma_pagamento = formaPagamento;

    try {
      await salvarNoGoogleSheets(lancamento);
      bot.sendMessage(
        chatId,
        `✅ Lançamento concluído: R$${lancamento.valor} - ${lancamento.categoria_detalhada} - ${lancamento.forma_pagamento}`
      );
    } catch (error) {
      console.error(error);
      bot.sendMessage(chatId, "❌ Erro ao salvar o lançamento.");
    }

    delete estadoUsuario[chatId];
    return;
  }

  // Detectar intenção via GPT
  try {
    const intencao = await detectarIntencao(texto);

    if (intencao.tipo === "consulta") {
      const resultadoConsulta = await analisarMensagemComGPT(texto, "consulta");

      if (resultadoConsulta.success) {
        const { data_inicio, data_fim } = resultadoConsulta.data;
        const total = await calcularTotalPorIntervalo(data_inicio, data_fim);
        bot.sendMessage(
          chatId,
          `📊 Total de gastos entre ${data_inicio} e ${data_fim}: R$${total.toFixed(
            2
          )}`
        );
      } else {
        bot.sendMessage(
          chatId,
          resultadoConsulta.message ||
            "❌ Não consegui entender o período da consulta."
        );
      }
      return;
    }

    if (intencao.tipo === "lancamento") {
      const resultadoLancamento = await analisarMensagemComGPT(
        texto,
        "lancamento"
      );

      if (!resultadoLancamento.success) {
        bot.sendMessage(
          chatId,
          resultadoLancamento.message ||
            "❌ Não consegui entender o lançamento."
        );
        return;
      }

      const lancamento = resultadoLancamento.data;

      if (
        !lancamento.forma_pagamento ||
        lancamento.forma_pagamento.toLowerCase() === "outro"
      ) {
        bot.sendMessage(
          chatId,
          "🤖 Não consegui identificar a forma de pagamento. Por favor, responda com: Pix / Débito / Crédito / Dinheiro / Outro"
        );

        estadoUsuario[chatId] = {
          esperandoFormaPagamento: true,
          lancamentoPendente: lancamento,
        };
        return;
      }

      await salvarNoGoogleSheets(lancamento);
      bot.sendMessage(
        chatId,
        `✅ Lançamento feito: R$${lancamento.valor} - ${lancamento.categoria_detalhada} - ${lancamento.forma_pagamento}`
      );
      return;
    }

    console.log("Intenção não reconhecida:", intencao);

    bot.sendMessage(
      chatId,
      "❌ Desculpe, não consegui entender sua intenção. Por favor, envie um lançamento ou uma consulta."
    );
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "❌ Erro ao processar sua mensagem.");
  }
});
