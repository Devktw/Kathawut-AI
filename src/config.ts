import fs from "fs";
import path from "path";
import readline from "readline";
import os from "os";

// Use home directory for config files
const KARN_DIR = path.join(os.homedir(), ".karn");
if (!fs.existsSync(KARN_DIR)) {
    fs.mkdirSync(KARN_DIR, { recursive: true });
}

const ENV_PATH = path.join(KARN_DIR, ".env");
const SETTINGS_PATH = path.join(KARN_DIR, "settings.json");

// Load .env from KARN_DIR (do this dynamically, not at import time)
let envLoaded = false;
function loadEnv() {
    if (!envLoaded) {
        const dotenv = require("dotenv");
        dotenv.config({ path: ENV_PATH });
        envLoaded = true;
    }
}

const C = {
    reset: "\x1b[0m",
    b: "\x1b[1m",
    dim: "\x1b[2m",
    cyan: "\x1b[36m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    magenta: "\x1b[35m",
    blue: "\x1b[34m",
};

async function askQuestion(query: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => rl.question(`${C.cyan}${query}${C.reset}`, (ans) => {
        rl.close();
        resolve(ans);
    }));
}

export async function setupConfig() {
    const banner = `
${C.magenta}${C.b}     __  __   ____   ____    __   __ ${C.reset}
${C.magenta}${C.b}    |  |/  | |    | |    \\  |  \\ |  |${C.reset}
${C.magenta}${C.b}    |     /  |____| |  _  | |   \\|  |${C.reset}
${C.magenta}${C.b}    |  |\\  \\ |    | | | \\ | |  |\\   |${C.reset}
${C.magenta}${C.b}    |__| \\__||____| |_|  \\_||__| \\__|${C.reset}
${C.blue}${C.b}    --- [ KARN AI SETUP SYSTEM ] --- ${C.reset}
    `;

    if (!fs.existsSync(ENV_PATH) || !fs.existsSync(SETTINGS_PATH)) {
        console.log(banner);
    }

    if (!fs.existsSync(ENV_PATH)) {
        console.log(`\n${C.yellow}${C.b}🚀 [1/2] บันทึกรหัสความลับ (Secret Keys)${C.reset}`);
        console.log(`${C.dim}----------------------------------------${C.reset}`);
        const typhoonKey = await askQuestion("🔑 ระบุ TYPHOON_API_KEY: ");
        const telegramToken = await askQuestion("🤖 ระบุ TELEGRAM_BOT_TOKEN: ");

        const envContent = `TYPHOON_API_KEY=${typhoonKey}\nTELEGRAM_BOT_TOKEN=${telegramToken}\n`;
        fs.writeFileSync(ENV_PATH, envContent);
        console.log(`\n${C.green}✅ บันทึก API Keys เรียบร้อยใน .env${C.reset}`);
    }

    if (!fs.existsSync(SETTINGS_PATH)) {
        console.log(`\n${C.yellow}${C.b}🧠 [2/2] ตั้งค่าสมองและพารามิเตอร์ (AI Engine)${C.reset}`);
        console.log(`${C.dim}----------------------------------------${C.reset}`);
        const baseUrl = await askQuestion("🌐 Base URL (เช่น https://api.opentyphoon.ai/v1 ");
        const modelName = await askQuestion("🤖 ชื่อโมเดล (เช่น typhoon-v2.5-30b-a3b-instruct ");

        const settings = {
            TYPHOON_BASE_URL: baseUrl,
            TYPHOON_MODEL: modelName,
            MAX_COMPLETION_TOKENS: 30000,
            TEMPERATURE: 0.5,
            TOP_P: 0.85,
            TOP_K: 30,
            REPETITION_PENALTY: 1.1,
            FREQUENCY_PENALTY: 0.0,
            PRESENCE_PENALTY: 0.0,
            STOP: ["[CMD:", "[SEND_FILE:"]
        };
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
        console.log(`\n${C.green}✅ บันทึกค่าที่ใช้บ่อย (Settings) เรียบร้อยใน settings.json${C.reset}\n`);
    }

    // Reload environment variables from the correct path
    loadEnv();
}

export const config = {
    get TYPHOON_API_KEY() {
        loadEnv();
        return process.env.TYPHOON_API_KEY || "";
    },
    get TELEGRAM_BOT_TOKEN() {
        loadEnv();
        return process.env.TELEGRAM_BOT_TOKEN || "";
    },

    get settings() {
        if (fs.existsSync(SETTINGS_PATH)) {
            try {
                return JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8"));
            } catch (e) {
                console.error("Error reading settings.json");
            }
        }
        return null;
    }
};
