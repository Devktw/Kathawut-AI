import { Context } from "telegraf";
import fs from "fs";
import path from "path";
import { memory } from "./database";
import { runShell, getSystemInfo, extractTextFromImage } from "./utils";

function resolvePath(p: string): string {
    const isTermux = !!process.env.TERMUX_VERSION || process.env.PREFIX?.includes("termux");
    let homeDir = process.env.HOME || process.env.USERPROFILE || "";

    // In Termux, HOME might not be set perfectly or we can enforce the standard path
    if (isTermux && !homeDir) {
        homeDir = "/data/data/com.termux/files/home";
    }

    if (p.startsWith("~/") || p.startsWith("~\\")) {
        return path.join(homeDir, p.slice(2));
    } else if (p === "~") {
        return homeDir;
    }

    // Explicit rewrite common absolute android paths to termux symlinks if in termux
    // Because NodeJS fs module cannot natively access /storage/emulated/0 directly without termux symlinks
    if (isTermux && p.startsWith("/storage/emulated/0")) {
        // e.g., /storage/emulated/0/Download -> ~/storage/downloads
        const suffix = p.replace("/storage/emulated/0", "");
        return path.join(homeDir, "storage", "shared", suffix);
    }

    return p;
}

export async function processTextTags(content: string, ctx: Context): Promise<string[]> {
    const results: string[] = [];

    console.log(`\n>>> [TAG PROCESSOR] Processing content (${content.length} chars)`);
    console.log(`>>> First 300 chars: ${content.substring(0, 300)}...`);

    // 1. [SCHEDULE: YYYY-MM-DD HH:MM:SS | message] or [SCHEDULE: EVERY X MINUTES | message]
    const scheduleRegex = /\[SCHEDULE:\s*([\d\-\: ]+|EVERY\s+\d+\s+(?:MINUTE|MINUTES|HOUR|HOURS))\s*\|\s*([^\]]+)\]/gi;
    let match;
    while ((match = scheduleRegex.exec(content)) !== null) {
        const timeSpec = match[1].trim();
        const msg = match[2].trim();
        
        // Check if it's a recurring schedule
        const recurringMatch = timeSpec.match(/EVERY\s+(\d+)\s+(MINUTE|MINUTES|HOUR|HOURS)/i);
        if (recurringMatch) {
            const amount = parseInt(recurringMatch[1]);
            const unit = recurringMatch[2].toLowerCase();
            const minutes = unit.startsWith('hour') ? amount * 60 : amount;
            
            // Calculate first occurrence (now + interval)
            const now = new Date();
            now.setMinutes(now.getMinutes() + minutes);
            const pad = (n: number) => n.toString().padStart(2, "0");
            const firstTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
            
            memory.addTask(firstTime, msg, minutes);
            results.push(`[SCHEDULE SUCCESS] Recurring task set: every ${amount} ${unit} starting at ${firstTime}`);
            console.log(`>>> [RECURRING SCHEDULE] every ${minutes} minutes, msg=${msg}`);
        } else {
            // Regular one-time schedule
            memory.addTask(timeSpec, msg);
            results.push(`[SCHEDULE SUCCESS] Task set for ${timeSpec}`);
            console.log(`>>> [SCHEDULE TAG FOUND] at=${timeSpec}, msg=${msg}`);
        }
    }

    // 2. [CMD: command] - Use lazy matching to handle paths with spaces
    const cmdRegex = /\[CMD:\s*(.+?)\]/gs;
    while ((match = cmdRegex.exec(content)) !== null) {
        const cmd = match[1].trim();
        console.log(`>>> [CMD TAG FOUND] Command: "${cmd}"`);
        const res = await runShell(cmd);
        let output = res.success ? res.stdout : `Error: ${res.stderr}`;
        if (output.length > 1000) {
            output = output.substring(0, 1000) + "... (Output truncated)";
        }
        console.log(`<<< [CMD RESULT] Success: ${res.success}, Output length: ${output.length}`);
        results.push(`[CMD RESULT for "${cmd}"]: ${output}`);
    }

    // 3. [REMEMBER: key = value]
    const remRegex = /\[REMEMBER:\s*([^=\]]+)=([^\]]+)\]/g;
    while ((match = remRegex.exec(content)) !== null) {
        const key = match[1].trim();
        const val = match[2].trim();
        memory.setInfo(key, val);
        results.push(`[REMEMBER SUCCESS] ${key} is now ${val}`);
    }

    // 4. [FORGET: key]
    const forgetRegex = /\[FORGET:\s*([^\]]+)\]/g;
    while ((match = forgetRegex.exec(content)) !== null) {
        const key = match[1].trim();
        memory.forget(key);
        results.push(`[FORGET SUCCESS] Removed ${key}`);
    }

    // 4.5. [FORGET_DOC: name]
    const forgetDocRegex = /\[FORGET_DOC:\s*([^\]]+)\]/g;
    while ((match = forgetDocRegex.exec(content)) !== null) {
        const name = match[1].trim();
        memory.forgetDoc(name);
        results.push(`[FORGET_DOC SUCCESS] Removed documentation: ${name}`);
    }

    // 5. [SEND_FILE: path]
    const sendRegex = /\[SEND_FILE:\s*([^\]]+)\]/g;
    while ((match = sendRegex.exec(content)) !== null) {
        const filePath = resolvePath(match[1].trim());
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            if (stats.size > 0) {
                await ctx.replyWithDocument({ source: filePath });
                results.push(`[SEND_FILE SUCCESS] Sent ${filePath}`);
            } else {
                results.push(`[SEND_FILE ERROR] File "${filePath}" is empty. Cannot send.`);
            }
        } else {
            results.push(`[SEND_FILE ERROR] File not found: ${filePath}`);
        }
    }

    // 6. [DOC: name] content [/DOC] (Multi-line documentation)
    const docRegex = /\[DOC:\s*([^\]]+)\]([\s\S]*?)\[\/DOC\]/g;
    while ((match = docRegex.exec(content)) !== null) {
        const name = match[1].trim();
        const body = match[2].trim();
        memory.setDoc(name, body);
        results.push(`[DOC SUCCESS] Saved documentation: ${name}`);
    }

    // 7. [SYSINFO] - Get system information
    const sysinfoRegex = /\[SYSINFO\]/g;
    while ((match = sysinfoRegex.exec(content)) !== null) {
        const info = await getSystemInfo();
        results.push(`[SYSINFO]\n${info}`);
    }

    // 8. [READ_FILE: path] - Read file content
    const readFileRegex = /\[READ_FILE:\s*(.+?)\]/gs;
    while ((match = readFileRegex.exec(content)) !== null) {
        const filePath = resolvePath(match[1].trim());
        console.log(`>>> [READ_FILE TAG FOUND] Path: "${filePath}"`);
        try {
            if (fs.existsSync(filePath)) {
                const fileContent = fs.readFileSync(filePath, "utf-8");
                const preview = fileContent.length > 2000 ? fileContent.substring(0, 2000) + "... (truncated)" : fileContent;
                console.log(`<<< [READ_FILE SUCCESS] Read ${fileContent.length} chars from ${filePath}`);
                results.push(`[READ_FILE SUCCESS] ${filePath}:\n${preview}`);
            } else {
                console.log(`<<< [READ_FILE ERROR] File not found: ${filePath}`);
                results.push(`[READ_FILE ERROR] File not found: ${filePath}`);
            }
        } catch (e: any) {
            console.log(`<<< [READ_FILE ERROR] ${e.message}`);
            results.push(`[READ_FILE ERROR] ${e.message}`);
        }
    }

    // 9. [WRITE_FILE: path | content] - Write to file
    const writeFileRegex = /\[WRITE_FILE:\s*(.+?)\|(.+?)\]/gs;
    while ((match = writeFileRegex.exec(content)) !== null) {
        const filePath = resolvePath(match[1].trim());
        const fileContent = match[2].trim();
        console.log(`>>> [WRITE_FILE TAG FOUND] Path: "${filePath}", Content length: ${fileContent.length}`);
        try {
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(filePath, fileContent, "utf-8");
            console.log(`<<< [WRITE_FILE SUCCESS] Written ${fileContent.length} chars to ${filePath}`);
            results.push(`[WRITE_FILE SUCCESS] Written to ${filePath}`);
        } catch (e: any) {
            console.log(`<<< [WRITE_FILE ERROR] ${e.message}`);
            results.push(`[WRITE_FILE ERROR] ${e.message}`);
        }
    }

    // 10. [LIST_DIR: path] - List directory contents
    const listDirRegex = /\[LIST_DIR:\s*(.+?)\]/gs;
    while ((match = listDirRegex.exec(content)) !== null) {
        const dirPath = resolvePath(match[1].trim());
        console.log(`>>> [LIST_DIR TAG FOUND] Path: "${dirPath}"`);
        try {
            if (fs.existsSync(dirPath)) {
                const files = fs.readdirSync(dirPath);
                const fileList = files.slice(0, 50).join("\n");
                const more = files.length > 50 ? `\n... and ${files.length - 50} more` : "";
                console.log(`<<< [LIST_DIR SUCCESS] Found ${files.length} items in ${dirPath}`);
                results.push(`[LIST_DIR SUCCESS] ${dirPath}:\n${fileList}${more}`);
            } else {
                console.log(`<<< [LIST_DIR ERROR] Directory not found: ${dirPath}`);
                results.push(`[LIST_DIR ERROR] Directory not found: ${dirPath}`);
            }
        } catch (e: any) {
            console.log(`<<< [LIST_DIR ERROR] ${e.message}`);
            results.push(`[LIST_DIR ERROR] ${e.message}`);
        }
    }

    // 11. [DELETE_FILE: path] - Delete file
    const deleteFileRegex = /\[DELETE_FILE:\s*(.+?)\]/gs;
    while ((match = deleteFileRegex.exec(content)) !== null) {
        const filePath = resolvePath(match[1].trim());
        console.log(`>>> [DELETE_FILE TAG FOUND] Path: "${filePath}"`);
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`<<< [DELETE_FILE SUCCESS] Deleted ${filePath}`);
                results.push(`[DELETE_FILE SUCCESS] Deleted ${filePath}`);
            } else {
                console.log(`<<< [DELETE_FILE ERROR] File not found: ${filePath}`);
                results.push(`[DELETE_FILE ERROR] File not found: ${filePath}`);
            }
        } catch (e: any) {
            console.log(`<<< [DELETE_FILE ERROR] ${e.message}`);
            results.push(`[DELETE_FILE ERROR] ${e.message}`);
        }
    }

    // 12. [OCR: path] - Extract text from image
    const ocrRegex = /\[OCR:\s*(.+?)\]/gs;
    while ((match = ocrRegex.exec(content)) !== null) {
        const imagePath = resolvePath(match[1].trim());
        console.log(`>>> [OCR TAG FOUND] Path: "${imagePath}"`);
        const extractedText = await extractTextFromImage(imagePath);
        console.log(`<<< [OCR RESULT] Extracted ${extractedText.length} chars`);
        results.push(`[OCR RESULT from ${imagePath}]:\n${extractedText}`);
    }

    console.log(`<<< [TAG PROCESSOR] Found ${results.length} tag results\n`);
    return results;
}

export function stripTags(content: string): string {
    return content
        .replace(/\[SCHEDULE:[^\]]+\]/g, "")
        .replace(/\[CMD:[^\]]+\]/g, "")
        .replace(/\[REMEMBER:[^\]]+\]/g, "")
        .replace(/\[FORGET:[^\]]+\]/g, "")
        .replace(/\[FORGET_DOC:[^\]]+\]/g, "")
        .replace(/\[SEND_FILE:[^\]]+\]/g, "")
        .replace(/\[DOC:[^\]]+\][\s\S]*?\[\/DOC\]/g, "")
        .replace(/\[SYSINFO\]/g, "")
        .replace(/\[READ_FILE:[^\]]+\]/g, "")
        .replace(/\[WRITE_FILE:[^\]]+\]/g, "")
        .replace(/\[LIST_DIR:[^\]]+\]/g, "")
        .replace(/\[DELETE_FILE:[^\]]+\]/g, "")
        .replace(/\[OCR:[^\]]+\]/g, "")
        .replace(/\[EVENT\][^ \n]*/g, "") // Strip fake logs
        .replace(/\[STATUS\][^ \n]*/g, "") // Strip fake logs
        .replace(/\n{3,}/g, "\n\n") // collapse extra blank lines
        .trim();
}
