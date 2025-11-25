// analyze-result.js (for Node.js serverless function)

import OpenAI from "openai";

export default async function handler(req, res) {
    try {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Method Not Allowed" });
        }

        const { imageBase64 } = req.body;
        if (!imageBase64) {
            return res.status(400).json({ error: "Image missing." });
        }

        const client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        const prompt = `
You are an AI that reads exam results.
Extract this EXACT JSON:

{
  "courses": [
    { "name": "", "credits": number, "grade": number }
  ]
}

GRADE must be 10/9/8/7/6/0 ONLY.
If credits not visible, guess reasonably.
Return ONLY JSON, nothing else.
`;

        const response = await client.responses.create({
            model: "gpt-4o-mini",
            input: [
                {
                    role: "user",
                    content: [
                        { type: "input_text", text: prompt },
                        { type: "input_image", image_url: imageBase64 }
                    ]
                }
            ]
        });

        const jsonText = response.output_text;

        return res.status(200).json({ result: jsonText });

    } catch (err) {
        console.error("AI ERROR:", err);
        return res.status(500).json({ error: "Server error", details: err.message });
    }
}
