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

        const prompt = `You are an AI that reads exam results and extracts course information.

Extract the following information from the marksheet/result image:
- Course/Subject names
- Credits for each course
- Grades for each course

Convert letter grades to numeric points using this scale:
AA = 10, AB = 9, BB = 8, BC = 7, DD = 6, FF = 0

Return ONLY valid JSON in this exact format (no markdown, no explanation):

{
  "courses": [
    { "name": "Course Name", "credits": 4, "grade": 10 }
  ]
}

Important:
- "grade" must be a number (10, 9, 8, 7, 6, or 0)
- "credits" must be a number
- If credits are not visible, use 4 as default
- Return ONLY the JSON object, nothing else`;

        const response = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: prompt
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: imageBase64
                            }
                        }
                    ]
                }
            ],
            max_tokens: 1000,
            temperature: 0.1
        });

        const jsonText = response.choices[0].message.content.trim();
        
        // Remove markdown code blocks if present
        let cleanJson = jsonText;
        if (cleanJson.startsWith("```json")) {
            cleanJson = cleanJson.replace(/```json\n?/g, "").replace(/```\n?/g, "");
        } else if (cleanJson.startsWith("```")) {
            cleanJson = cleanJson.replace(/```\n?/g, "");
        }
        
        // Validate JSON before sending
        try {
            JSON.parse(cleanJson);
        } catch (e) {
            console.error("Invalid JSON from AI:", cleanJson);
            return res.status(500).json({ 
                error: "AI returned invalid JSON", 
                rawResponse: cleanJson 
            });
        }

        return res.status(200).json({ result: cleanJson });

    } catch (err) {
        console.error("AI ERROR:", err);
        return res.status(500).json({ 
            error: "Server error", 
            details: err.message 
        });
    }
}
