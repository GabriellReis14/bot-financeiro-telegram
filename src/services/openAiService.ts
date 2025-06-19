import axios from "axios";
import { getToday } from "../utils/dateUtils";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

async function callOpenAI(prompt: string): Promise<string> {
  const response = await axios.post(
    OPENAI_URL,
    {
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    }
  );
  const content = response.data.choices[0].message.content;
  return content.replace(/```json|```/g, "").trim();
}

export async function detectIntent(
  text: string
): Promise<IntentDetectionResponse> {
  const today = getToday();
  const prompt = `
    Hoje é ${today}.

    Classifique a intenção da frase abaixo:

    "${text}"

    Se for uma pergunta ou afirmação relacionada a finanças, gastos ou despesas pessoais, identifique como:

    - "expense" para lançamento de gasto
    - "query" para consultas de totais de gastos ou períodos
    - "other" para qualquer outro tipo de frase (ex: frases que não tem relação com finanças)

    Responda apenas o JSON puro, sem bloco de código, sem formatação condicional:

    { "type": "expense" }  
    ou  
    { "type": "query" }  
    ou  
    { "type": "other" }
    `;

  return JSON.parse(await callOpenAI(prompt));
}

export async function analyzeExpense(
  text: string
): Promise<ExpenseAnalysisResponse> {
  const today = getToday();
  const prompt = `
    Hoje é ${today}.

    Classifique a seguinte frase de gasto:

    "${text}"

    Se for um gasto, retorne:

    {
      "success": true,
      "data": {
        "amount": (number),
        "payment_method": (pix, débito, crédito, dinheiro, outro),
        "macro_category": (ex: Despesa Fixa, Variável, Lazer),
        "detailed_category": (ex: Mercado, Restaurante, etc),
        "date": (YYYY-MM-DD)
      }
    }

    Se a frase não for um gasto, retorne:

    {
      "success": false,
      "message": "A frase não contém informações de um gasto."
    }

    Responda apenas o JSON puro, sem bloco de código, sem formatação condicional.
    `;

  return JSON.parse(await callOpenAI(prompt));
}

export async function analyzeQuery(
  text: string
): Promise<QueryAnalysisResponse> {
  const today = getToday();
  const prompt = `
    Hoje é ${today}.

    Analise a frase e determine o intervalo de datas relacionado a gastos.

    "${text}"

    Considere datas como: "hoje", "ontem", "mês passado", "2023", "últimos 3 meses", etc.

    Se identificar um período, retorne:

    {
      "success": true,
      "data": {
        "start_date": "YYYY-MM-DD",
        "end_date": "YYYY-MM-DD"
      }
    }

    Se a frase não for uma consulta de período, retorne:

    {
      "success": false,
      "message": "Frase não corresponde a uma consulta de período."
    }

    Responda apenas o JSON puro, sem bloco de código, sem formatação condicional:
    `;

  return JSON.parse(await callOpenAI(prompt));
}
