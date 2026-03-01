import { Database } from "bun:sqlite";

const db = new Database("database.sqlite");

console.log("--- DEBUG STATUS ---");
const now = new Date();
const pad = (n: number) => n.toString().padStart(2, "0");
const nowStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
console.log("Current System Time:", nowStr);

const chatId = db.query("SELECT * FROM long_term_memory WHERE key = 'USER_CHAT_ID'").get();
console.log("USER_CHAT_ID in DB:", chatId);

console.log("\n--- SCHEDULED TASKS ---");
const tasks = db.query("SELECT * FROM scheduled_tasks").all();
console.table(tasks);

console.log("\n--- SENSORY MEMORY (Last 5) ---");
const chats = db.query("SELECT * FROM sensory_memory ORDER BY timestamp DESC LIMIT 5").all();
console.table(chats);
