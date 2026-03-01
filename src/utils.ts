import { memory } from "./database";
import os from "os";
import { spawn, exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import { config } from "./config";

const execAsync = promisify(exec);

// Detect if running on Bun or Node.js
const isBun = typeof Bun !== "undefined";

// Detect platform and shell
function getShellCommand(): string[] {
    const platform = os.platform();
    
    if (platform === "win32") {
        return ["powershell", "-NoProfile", "-NonInteractive", "-Command"];
    } else if (platform === "android" || process.env.TERMUX_VERSION) {
        // Termux on Android
        return ["sh", "-c"];
    } else {
        // Linux/macOS
        return ["sh", "-c"];
    }
}

export async function runShell(command: string): Promise<{ stdout: string; stderr: string; success: boolean }> {
    const shellCmd = getShellCommand();
    
    if (isBun) {
        // Use Bun.spawn
        const proc = Bun.spawn([...shellCmd, command], {
            stdout: "pipe", stderr: "pipe",
        });
        const stdout = await new Response(proc.stdout).text();
        const stderr = await new Response(proc.stderr).text();
        const exitCode = await proc.exited;
        memory.logAction("CMD", command.slice(0, 150));
        return { stdout: stdout.trim(), stderr: stderr.trim(), success: exitCode === 0 };
    } else {
        // Use Node.js child_process
        return new Promise((resolve) => {
            const proc = spawn(shellCmd[0], [...shellCmd.slice(1), command]);
            let stdout = "";
            let stderr = "";
            
            proc.stdout.on("data", (data) => stdout += data.toString());
            proc.stderr.on("data", (data) => stderr += data.toString());
            
            proc.on("close", (code) => {
                memory.logAction("CMD", command.slice(0, 150));
                resolve({
                    stdout: stdout.trim(),
                    stderr: stderr.trim(),
                    success: code === 0
                });
            });
        });
    }
}

// Get system info
export async function getSystemInfo(): Promise<string> {
    const platform = os.platform();
    const arch = os.arch();
    const release = os.release();
    const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
    const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
    const cpus = os.cpus();
    const isTermux = !!process.env.TERMUX_VERSION;
    const runtime = isBun ? "Bun" : "Node.js";
    
    let info = `
Runtime: ${runtime}
Platform: ${platform}${isTermux ? " (Termux)" : ""}
Architecture: ${arch}
OS Release: ${release}
CPU: ${cpus[0]?.model || "Unknown"} (${cpus.length} cores)
RAM Total: ${totalMem} GB
RAM Free: ${freeMem} GB
Home Directory: ${os.homedir()}
`.trim();

    // Add Android-specific info
    if (isTermux) {
        try {
            // Get storage info
            const dfResult = await execAsync("df -h ~ | tail -1 | awk '{print $2,$3,$4}'");
            const [total, used, avail] = dfResult.stdout.trim().split(' ');
            info += `\nStorage Total: ${total}`;
            info += `\nStorage Used: ${used}`;
            info += `\nStorage Available: ${avail}`;
            
            // Get battery info (requires termux-api)
            try {
                const batteryResult = await execAsync("termux-battery-status 2>/dev/null");
                const battery = JSON.parse(batteryResult.stdout);
                info += `\n\nBattery:`;
                info += `\n- Level: ${battery.percentage}%`;
                info += `\n- Status: ${battery.status}`;
                info += `\n- Temperature: ${battery.temperature}°C`;
                info += `\n- Health: ${battery.health}`;
            } catch (e) {
                info += `\n\nBattery: (Install termux-api: pkg install termux-api)`;
            }
            
            // Get Android version
            try {
                const androidVer = await execAsync("getprop ro.build.version.release");
                info += `\nAndroid Version: ${androidVer.stdout.trim()}`;
            } catch (e) {}
            
        } catch (e) {
            // Silently fail if commands not available
        }
    }
    
    return info;
}

// OCR - Extract text from image using Typhoon OCR API
export async function extractTextFromImage(imagePath: string): Promise<string> {
    try {
        if (!fs.existsSync(imagePath)) {
            return `[OCR ERROR] File not found: ${imagePath}`;
        }

        const url = "https://api.opentyphoon.ai/v1/ocr";
        const form = new FormData();
        
        form.append('file', fs.createReadStream(imagePath));
        form.append('model', 'typhoon-ocr');
        form.append('taskType', 'v1.5');
        form.append('maxTokens', '16384');
        form.append('temperature', '0.1');
        form.append('topP', '0.6');
        form.append('repetitionPenalty', '1.2');

        console.log('>>> Requesting Typhoon OCR API...');
        console.log('>>> Image path:', imagePath);
        console.log('>>> Parameters:', {
            model: 'typhoon-ocr',
            taskType: 'v1.5',
            maxTokens: '16384',
            temperature: '0.1',
            topP: '0.6',
            repetitionPenalty: '1.2'
        });

        const response = await axios.post(url, form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${config.TYPHOON_API_KEY}`
            }
        });

        console.log('<<< OCR Response Status:', response.status);

        if (response.status === 200) {
            const data = response.data;
            const extractedTexts: string[] = [];

            // Extract text from results array
            for (const result of data.results || []) {
                if (result.success && result.message?.choices?.[0]?.message?.content) {
                    const content = result.message.choices[0].message.content;
                    extractedTexts.push(content);
                } else if (!result.success) {
                    console.error(`OCR Error: ${result.filename}: ${result.error || 'Unknown error'}`);
                }
            }

            console.log('<<< Extracted texts:', extractedTexts.length, 'pages');
            return extractedTexts.length > 0 
                ? extractedTexts.join('\n\n--- Page Break ---\n\n')
                : '[OCR ERROR] No text extracted';
        } else {
            console.error('!!! OCR API Error: Status', response.status);
            console.error('!!! Response:', response.data);
            return `[OCR ERROR] API returned status ${response.status}`;
        }
    } catch (e: any) {
        console.error('!!! OCR Exception:', e.message);
        if (e.response) {
            console.error('!!! Response Status:', e.response.status);
            console.error('!!! Response Data:', JSON.stringify(e.response.data, null, 2));
        }
        return `[OCR ERROR] ${e.response?.data?.detail || e.message}`;
    }
}
