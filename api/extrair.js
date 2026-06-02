import axios from "axios";

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {

    //  AQUI (logo no início do handler)
    const GEMINI_KEY = process.env.GEMINI_KEY;

   const buffer = Buffer.from(await req.arrayBuffer());
   const base64 = buffer.toString("base64");

    const prompt = `
Extrai do documento e devolve APENAS JSON:

{
"nome": "",
"modelo": "",
"fabricante": "",
"ano": "",
"descricao": ""
}
`;

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

    const text =
      response.data.candidates[0].content.parts[0].text;

    const json = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);

    return res.status(200).json(json);

  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Erro na IA" });
  }
}
