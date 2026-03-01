import { Context } from "telegraf";
import fs from "fs";
import { memory } from "./database";
import { runShell } from "./utils";

export const TOOLS = [
    {
        type: "function",
        function: {
            name: "run_powershell",
            description: "Run PowerShell command",
            parameters: {
                type: "object",
                properties: {
                    command: { type: "string" }
                },
                required: ["command"],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "remember",
            description: "Save user information or preferences to long-term memory",
            parameters: {
                type: "object",
                properties: {
                    key: { type: "string" },
                    value: { type: "string" }
                },
                required: ["key", "value"],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "forget",
            description: "Remove a fact from long-term memory",
            parameters: {
                type: "object",
                properties: {
                    key: { type: "string" }
                },
                required: ["key"],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "schedule_task",
            description: "Schedule a task or reminder at a specific time",
            parameters: {
                type: "object",
                properties: {
                    at: { type: "string", description: "Time to trigger (YYYY-MM-DD HH:mm:ss)" },
                    msg: { type: "string" }
                },
                required: ["at", "msg"],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "send_file",
            description: "Send a file to the user",
            parameters: {
                type: "object",
                properties: {
                    path: { type: "string", description: "Path to the file on disk" }
                },
                required: ["path"],
                additionalProperties: false
            }
        }
    }
];

export async function executeTool(name: string, args: any, ctx: Context): Promise<string> {
    console.log(`[TOOL] ${name}:`, args);
    try {
        if (name === "run_powershell") {
            const res = await runShell(args.command);
            return res.stdout || res.stderr || "Executed.";
        } else if (name === "remember") {
            memory.setInfo(args.key, args.value);
            return "Saved.";
        } else if (name === "forget") {
            memory.forget(args.key);
            return "Forgotten.";
        } else if (name === "schedule_task") {
            memory.addTask(args.at, args.msg);
            return "Scheduled.";
        } else if (name === "send_file") {
            if (fs.existsSync(args.path)) {
                await ctx.replyWithDocument({ source: args.path });
                return "File sent.";
            }
            return "File not found.";
        }
        return "Unknown";
    } catch (e: any) {
        return `Error: ${e.message}`;
    }
}
