import axios from "axios";
import { config } from "./config";

export async function typhoonChat(messages: any[], tools?: any[]): Promise<any> {
    const s = config.settings;
    const url = `${config.settings.TYPHOON_BASE_URL}/chat/completions`;

    const payload: any = {
        model: s.TYPHOON_MODEL,
        messages: messages,
        max_tokens: s.MAX_COMPLETION_TOKENS || 1024,
        temperature: s.TEMPERATURE ?? 0.6,
        top_p: s.TOP_P ?? 0.6
    };

    if (tools && tools.length > 0) {
        payload.tools = tools;
    }

    console.log(">>> Requesting Typhoon API...");

    try {
        const response = await axios.post(url, payload, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${config.TYPHOON_API_KEY}`
            }
        });

        console.log(`<<< Response Status: ${response.status}`);
        return response.data;
    } catch (e: any) {
        if (axios.isAxiosError(e) && e.response) {
            const errorBody = e.response.data;
            console.error("!!! API Error Body:", JSON.stringify(errorBody, null, 2));
            throw new Error(`Typhoon API Error: ${e.response.status} - ${JSON.stringify(errorBody)}`);
        }
        throw new Error(`Connection Error: ${e.message}`);
    }
}

export async function summarizeHistory(history: any[]): Promise<string> {
    console.log(">>> [SYSTEM] Context threshold reached. Generating summary...");
    const prompt = "Please summarize the preceding conversation history in Thai. Be concise but maintain key context, user preferences, and any pending tasks. This summary will be used to compress the conversation for the next round of chat.";

    const messages = [
        ...history,
        { role: "user", content: prompt }
    ];

    try {
        const res = await typhoonChat(messages);
        return res.choices[0].message.content || "No summary available.";
    } catch (e: any) {
        console.error("!!! Summarization Error:", e.message);
        return "Failed to summarize history.";
    }
}
