#!/usr/bin/env node

import { Telegraf, Context } from "telegraf";
import { config, setupConfig } from "./config.js";
import { initDB, memory } from "./database.js";
import fs from "fs";
import path from "path";
import os from "os";
import axios from "axios";
import { fileURLToPath } from "url";
import { runShell, extractTextFromImage } from "./utils.js";
import { typhoonChat, summarizeHistory } from "./summarizer.js";
import { processTextTags, stripTags } from "./tagProcessor.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- Error Handling ----
process.on("unhandledRejection", (reason) => console.error("Unhandled Rejection:", reason));
process.on("uncaughtException", (err) => { console.error("Uncaught Exception:", err); process.exit(1); });

// ---- Prompt Builder ----
function buildSystemPrompt(): string {
    const longTerm = memory.getAllLongTerm() || "  (ยังไม่มีข้อมูล)";

    // Get 10 recent actions
    const recentActions = memory.getRecentActions(10);
    const recentActionsStr = recentActions.length > 0
        ? recentActions.map(a => `- [${a.timestamp}] ${a.action}: ${a.detail}`).join("\n")
        : "(ยังไม่มี)";

    // Get all pending tasks
    const pendingTasks = memory.getPendingTasks();
    const tasksStr = pendingTasks.length > 0
        ? pendingTasks.map(t => `- [${t.scheduled_at}] ${t.task_description}`).join("\n")
        : "(ไม่มีงานรออยู่)";

    const cwd = process.cwd();
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const nowStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

    // Detect platform
    const platform = os.platform();
    const isTermux = !!process.env.TERMUX_VERSION;
    let platformStr = "";
    if (platform === "win32") {
        platformStr = "Windows (PowerShell)";
    } else if (isTermux) {
        platformStr = "Android (Termux)";
    } else if (platform === "darwin") {
        platformStr = "macOS";
    } else {
        platformStr = "Linux";
    }

    // Try to find prompt.md in current directory first, then in package directory
    let promptPath = path.join(cwd, "prompt.md");
    if (!fs.existsSync(promptPath)) {
        promptPath = path.join(__dirname, "prompt.md");
    }
    
    // Get memory path
    const memoryPath = path.join(os.homedir(), ".karn", "memory.md");
    
    let prompt = fs.readFileSync(promptPath, "utf-8");
    return prompt
        .replace("{{platform}}", platformStr)
        .replace("{{longTermMemory}}", longTerm)
        .replace("{{lastAction}}", recentActionsStr)
        .replace("{{pendingTasks}}", tasksStr)
        .replace("{{currentTime}}", nowStr)
        .replace("{{cwd}}", cwd)
        .replace("{{memoryPath}}", memoryPath);
}

async function askAI(userPrompt: string): Promise<string> {
    const res = await typhoonChat([{ role: "user", content: userPrompt }]);
    return res.choices[0].message.content || "";
}

/**
 * Wraps an async operation with a typing indicator heartbeat
 */
async function withTyping<T>(ctx: Context, task: () => Promise<T>): Promise<T> {
    const chatId = ctx.chat?.id;
    if (!chatId) return await task();

    // Manual heartbeat to ensure visibility across all platforms
    const sendTyping = () => ctx.telegram.sendChatAction(chatId, "typing").catch(() => { });

    sendTyping(); // Send immediately
    const typingInterval = setInterval(sendTyping, 4000);

    try {
        const result = await task();
        if (result === undefined) {
            console.error(">>> [SYSTEM] Task returned undefined in withTyping");
        }
        return result;
    } finally {
        clearInterval(typingInterval);
    }
}

// ---- Main Agent Loop ----
async function runAgent(userMessage: string, ctx: Context): Promise<void> {
    let history = memory.getRecentChats();
    const s = config.settings;
    const threshold = s?.HISTORY_THRESHOLD || 10;

    // Context compression: Summarize history if too long
    if (history.length >= threshold) {
        const summary = await withTyping(ctx, () => summarizeHistory(history));
        if (summary) {
            // Keep last 5 messages for context continuity
            const recentMessages = history.slice(-5);
            
            memory.clearHistory();
            memory.addChat({
                role: "system",
                content: `--- [บทสรุปการสนทนาก่อนหน้านี้] ---\n${summary}\n--- [สิ้นสุดบทสรุป] ---`
            });
            
            // Re-add recent messages
            recentMessages.forEach(msg => memory.addChat(msg));
            
            history = memory.getRecentChats();
        }
    }

    const messages: any[] = [
        { role: "system", content: buildSystemPrompt() },
        ...history,
        { role: "user", content: userMessage },
    ];

    let iter = 0;
    let savedUserMsg = false;

    while (iter < 10) {
        iter++;
        try {
            const data = await withTyping(ctx, () => typhoonChat(messages));

            if (!data || !data.choices || !data.choices[0]) {
                throw new Error("ได้รับข้อมูลที่ไม่ถูกต้องจาก Typhoon API");
            }

            const msg = data.choices[0].message;

            if (!savedUserMsg) {
                memory.addChat({ role: "user", content: userMessage });
                savedUserMsg = true;
            }
            memory.addChat(msg);
            messages.push(msg);

            if (msg.content) {
                const tagResults = await processTextTags(msg.content, ctx);
                const cleanReply = stripTags(msg.content).trim();

                if (tagResults.length > 0) {
                    // Check if all results are "success only" (no data to process)
                    const allSuccessOnly = tagResults.every(r => 
                        r.includes('[SCHEDULE SUCCESS]') || 
                        r.includes('[REMEMBER SUCCESS]') ||
                        r.includes('[DOC SUCCESS]') ||
                        r.includes('[FORGET SUCCESS]')
                    );
                    
                    // Show the "preparatory" message to the user if it exists and is meaningful
                    if (cleanReply && cleanReply.length > 1 && !cleanReply.match(/^[\[\]]+$/)) {
                        await ctx.reply(cleanReply);
                    }
                    
                    // If all results are success-only, stop here (don't send back to AI)
                    if (allSuccessOnly) {
                        break;
                    }

                    const resultMsg = {
                        role: "user",
                        content: `[Observation Results]:\n${tagResults.join("\n")}`
                    };
                    memory.addChat(resultMsg);
                    messages.push(resultMsg);
                    continue;
                }

                if (cleanReply && cleanReply.length > 1 && !cleanReply.match(/^[\[\]]+$/)) {
                    await ctx.reply(cleanReply);
                }
            }
            break;
        } catch (e: any) {
            console.error("--- Agent Error Details ---");
            console.error(e.message);
            
            // Check if it's a context window exceeded error
            if (e.message.includes('ContextWindowExceededError') || e.message.includes('max_tokens')) {
                console.log(">>> Context window exceeded, triggering summarization...");
                await ctx.reply("⏳ ประวัติการสนทนายาวเกินไป กำลังสรุป...");
                
                const summary = await withTyping(ctx, () => summarizeHistory(history));
                if (summary) {
                    // Keep last 5 messages for context continuity
                    const recentMessages = history.slice(-5);
                    
                    memory.clearHistory();
                    memory.addChat({
                        role: "system",
                        content: `--- [บทสรุปการสนทนาก่อนหน้านี้] ---\n${summary}\n--- [สิ้นสุดบทสรุป] ---`
                    });
                    
                    // Re-add recent messages
                    recentMessages.forEach(msg => memory.addChat(msg));
                    
                    await ctx.reply("✅ สรุปเสร็จแล้ว กรุณาส่งคำถามของคุณอีกครั้ง");
                }
                break;
            }
            
            await ctx.reply(`❌ Agent Error: ${e.message}`);
            break;
        }
    }
}

// ---- Cron ----
async function startCron(bot: Telegraf<Context>) {
    setInterval(async () => {
        const tasks = memory.getDueTasks();
        for (const t of tasks) {
            const chatId = memory.getInfo("USER_CHAT_ID")?.value;
            if (chatId) {
                try {
                    // Create a mock context for cron tasks
                    const mockCtx = {
                        chat: { id: parseInt(chatId) },
                        reply: async (text: string) => {
                            await bot.telegram.sendMessage(chatId, text);
                        },
                        telegram: bot.telegram
                    } as any;
                    
                    // Process tags FIRST to get raw results (this executes the commands)
                    const tagResults = await processTextTags(t.task_description, mockCtx);
                    
                    // Strip tags from the original message to get clean reminder text
                    const cleanMessage = stripTags(t.task_description);
                    
                    // Send to AI for natural language interpretation
                    // AI only sees the results, NOT the tags (so it won't re-execute them)
                    if (tagResults.length > 0) {
                        const resultText = tagResults.join("\n");
                        const aiPrompt = `[REMINDER TRIGGERED]\nTask: ${cleanMessage}\n\nResults:\n${resultText}\n\nกรุณาสรุปผลลัพธ์ให้ผู้ใช้ฟังแบบเป็นธรรมชาติ ไม่ต้องแสดงข้อมูลดิบ`;
                        await runAgent(aiPrompt, mockCtx);
                    } else {
                        // No tags, just send the reminder text through AI
                        await runAgent(`[REMINDER] ${cleanMessage}`, mockCtx);
                    }
                    
                    memory.completeTask(t.id);
                } catch (e) {
                    console.error("Cron Error", e);
                }
            }
        }
    }, 30000);
}

// ---- Main ----
async function main() {
    try {
        await setupConfig();
        await initDB();
        
        // Check if config is complete
        if (!config.TELEGRAM_BOT_TOKEN || !config.TYPHOON_API_KEY) {
            console.error("❌ Configuration incomplete. Please run setup again.");
            process.exit(1);
        }
        
        const bot = new Telegraf(config.TELEGRAM_BOT_TOKEN);

    bot.command("new", async (ctx) => {
        const pendingCount = memory.getPendingTasks().length;
        memory.clearHistory();
        memory.clearAllTasks();
        await ctx.reply(`🧹 ล้างประวัติและงานที่ตั้งไว้แล้ว (ลบ ${pendingCount} งาน)`);
    });

    bot.on("text", async (ctx) => {
        memory.setInfo("USER_CHAT_ID", ctx.chat.id.toString());
        await runAgent(ctx.message.text, ctx);
    });

    bot.on("photo", async (ctx) => {
        memory.setInfo("USER_CHAT_ID", ctx.chat.id.toString());
        try {
            const photo = ctx.message.photo[ctx.message.photo.length - 1];
            const file = await ctx.telegram.getFile(photo.file_id);
            const fileUrl = `https://api.telegram.org/file/bot${config.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
            
            // Download image
            const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
            const tempPath = path.join(os.tmpdir(), `telegram_${Date.now()}.jpg`);
            fs.writeFileSync(tempPath, response.data);
            
            // Extract text using OCR
            await ctx.reply("🔍 กำลังวิเคราะห์รูปภาพ...");
            const extractedText = await extractTextFromImage(tempPath);
            
            // Clean up temp file
            fs.unlinkSync(tempPath);
            
            // Send to AI with context
            const caption = ctx.message.caption || "วิเคราะห์รูปนี้";
            const userMessage = `[ผู้ใช้ส่งรูปภาพมาพร้อมคำบรรยาย: "${caption}"]\n\n[ข้อความที่อ่านได้จากรูป]:\n${extractedText}\n\n[คำแนะนำ]: ตอบคำถามของผู้ใช้โดยอ้างอิงข้อมูลจากรูปที่ส่งมา ให้ตอบแบบเป็นธรรมชาติ เช่น "จากรูปที่ส่งมา..." หรือ "ในรูปเห็นว่า..."`;
            await runAgent(userMessage, ctx);
        } catch (e: any) {
            await ctx.reply(`❌ ไม่สามารถอ่านรูปได้: ${e.message}`);
        }
    });

    bot.launch();
    console.log("🤖 KARN Ready.");
    startCron(bot);
    } catch (error: any) {
        console.error("❌ Failed to start KARN:", error.message);
        process.exit(1);
    }
}

main().catch(console.error);
