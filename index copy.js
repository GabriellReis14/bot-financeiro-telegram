require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const { google } = require("googleapis");

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

const estadoUsuario = {}; // Para guardar o estado por chatId

async function calcularTotalPorIntervalo(dataInicio, dataFim) {
  const auth = new google.auth.GoogleAuth({
    keyFile: "credentials-google.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

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

      Se você perceber que a frase não é um gasto, responda com um JSON assim:
      {
        "success": false,
        "message": "Desculpe, não consegui identificar um gasto nessa frase."
      }

      Responda em JSON com os seguintes campos:
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

      Responda apenas o JSON puro, sem blocos de código, sem comentários, sem formatação adicional.
      `;
  } else if (tipoAnalise === "consulta") {
    prompt = `
      Hoje é ${today}.

      Sua tarefa é analisar a frase a seguir e determinar o intervalo de datas que o usuário deseja consultar os gastos.

      Frase: "${texto}"

      Instruções:

      1. Se a frase for sobre "hoje", "ontem", "amanhã", ou qualquer outro dia único → retorne o mesmo valor para data_inicio e data_fim.

      2. Se for "este mês", "mês passado", "ano passado", "últimos 3 meses", "último semestre", etc → calcule o intervalo corretamente.

      3. Se for uma frase ambígua ou que não fale de período → retorne success: false.

      Formato de resposta:

      Se conseguir identificar:

      {
        "success": true,
        "data": {
          "data_inicio": "YYYY-MM-DD",
          "data_fim": "YYYY-MM-DD"
        }
      }

      Se não identificar:

      {
        "success": false,
        "message": "Não é uma consulta de período."
      }

      Responda apenas o JSON puro, sem blocos de código, sem comentários, sem formatação adicional.
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
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    }
  );

  const respostaGPT = response.data.choices[0].message.content;
  const respostaLimpa = respostaGPT.replace(/```json|```/g, "").trim();
  return JSON.parse(respostaLimpa);
}

// async function analisarMensagemComGPT(texto) {
//   const today = new Date().toISOString().split("T")[0]; // Exemplo: "2025-06-18"

//   if (
//     /quanto.*(gastei|gastos|gasto|total).*?(mês|mes|ano|semestre|hoje|ontem|passado|último|ultima)/i.test(
//       texto
//     )
//   ) {
//     const totalHoje = await calcularTotalPorIntervalo(today);
//     bot.sendMessage(
//       chatId,
//       `📊 Seu gasto total hoje (${hoje}) foi: R$${totalHoje.toFixed(2)}`
//     );
//     return;
//   }

//   const prompt = `
//     Hoje é ${today}.

//     Classifique a seguinte frase de gasto:

//     Frase: "${texto}"

//     Quando o texto mencionar "hoje", use a data: "${today}"
//     Use a data de hoje como referência se caso falar "ontem", "amanhã" ou "hoje".

//     Se você perceber que a frase não é um gasto, responda com um JSON assim:
//     {
//       success: false,
//       message: "Desculpe mas não consegui identificar um gasto nessa frase."
//     }

//     Responda em JSON com os seguintes campos:
//     {
//       success: true,
//       data: {
//         valor: (número),
//         forma_pagamento: (pix, débito, crédito, dinheiro, outro)
//         categoria_macro: (Despesa Fixa, Variável, Lazer, etc)
//         categoria_detalhada: (exemplo: Mercado, Restaurante, Transporte, etc)
//         data: (exemplo: "2025-06-18")
//       }
//     }

//     Responda apenas o JSON puro, sem blocos de código, sem comentários, sem formatação adicional.
//     `;

//   const response = await axios.post(
//     "https://api.openai.com/v1/chat/completions",
//     {
//       model: "gpt-4o",
//       messages: [{ role: "user", content: prompt }],
//     },
//     {
//       headers: {
//         Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
//       },
//     }
//   );

//   const respostaGPT = response.data.choices[0].message.content;
//   return JSON.parse(respostaGPT);
// }

async function salvarNoGoogleSheets(lancamento) {
  const auth = new google.auth.GoogleAuth({
    keyFile: "credentials-google.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

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

  if (
    /(quanto|total).*(gastei|gastos|gasto|total).*?(mês|ano|semestre|hoje|ontem|passado|último|ultima)/i.test(
      texto
    )
  ) {
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
        resultadoConsulta.message || "❌ Não entendi a consulta."
      );
    }
    return;
  }

  // Verifica se o usuário está respondendo a uma pergunta pendente
  if (estadoUsuario[chatId] && estadoUsuario[chatId].esperandoFormaPagamento) {
    const formaPagamento = texto.toLowerCase();

    // Opcional: validar a resposta
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

    // Atualiza o lançamento pendente
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

    // Limpa o estado
    delete estadoUsuario[chatId];
    return;
  }

  // Fluxo normal de análise
  try {
    const analise = await analisarMensagemComGPT(texto, "lancamento");

    if (!analise.success) {
      bot.sendMessage(
        chatId,
        analise.message || "Não consegui entender a frase. Tente novamente."
      );
      return;
    }

    // Se não conseguir identificar a forma de pagamento ou vier como "outro"
    if (
      !analise.data.forma_pagamento ||
      analise.data.forma_pagamento.toLowerCase() === "outro"
    ) {
      bot.sendMessage(
        chatId,
        "🤖 Não consegui identificar a forma de pagamento. Por favor, responda com uma das opções: Pix / Débito / Crédito / Dinheiro / Outro"
      );

      // Salva o lançamento pendente
      estadoUsuario[chatId] = {
        esperandoFormaPagamento: true,
        lancamentoPendente: analise,
      };
      return;
    }

    // Se tudo OK, salva direto
    await salvarNoGoogleSheets(analise.data);
    bot.sendMessage(
      chatId,
      `✅ Lançamento feito: R$${analise.data.valor} - ${analise.data.categoria_detalhada} - ${analise.data.forma_pagamento}`
    );
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "❌ Erro ao processar a mensagem.");
  }
});

// bot.on('message', async (msg) => {
//   const chatId = msg.chat.id;
//   const texto = msg.text;

//   try {
//     const analise = await analisarMensagemComGPT(texto);

//     await salvarNoGoogleSheets(analise);
//     bot.sendMessage(chatId, `✅ Lançamento feito: R$${analise.valor} - ${analise.categoria_detalhada} - ${analise.forma_pagamento}`);
//   } catch (error) {
//     console.error(error);
//     bot.sendMessage(chatId, '❌ Erro ao processar a mensagem.');
//   }
// });
