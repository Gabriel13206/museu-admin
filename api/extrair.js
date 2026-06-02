import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 📦 ler ficheiro enviado
    const chunks = [];

    for await (const chunk of req) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);
    const base64 = buffer.toString("base64");

    // 🔑 chave do Vercel
    const GEMINI_KEY = process.env.GEMINI_KEY || process.env.KEY;

    if (!GEMINI_KEY) {
      return res.status(500).json({ error: "Falta GEMINI_KEY / KEY no Vercel" });
    }

    // 🧠 prompt mais forte (melhor resposta da IA)
    const prompt = `
Tu és um sistema de extração de dados.

Analisa o documento e devolve APENAS JSON válido:

{
  "nome": "",
  "modelo": "",
  "fabricante": "",
  "ano": "",
  "descricao": ""
}

Não escrevas texto extra. Não uses markdown. Apenas JSON.
`;

    // 🤖 chamada Gemini
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: "application/pdf",
                  data: base64
                }
              }
            ]
          }
        ]
      }
    );

    let text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text) {
      return res.status(500).json({
        error: "Resposta vazia da IA"
      });
    }

    // 🧹 limpar markdown da IA
    text = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // 🔥 extrair JSON com segurança
    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
      return res.status(500).json({
        error: "IA não devolveu JSON válido",
        raw: text
      });
    }

    const json = JSON.parse(match[0]);

    return res.status(200).json(json);

  } catch (err) {
    console.log("ERRO API:", err.response?.data || err.message);

    return res.status(500).json({
      error: "Erro na IA"
    });
  }
}
