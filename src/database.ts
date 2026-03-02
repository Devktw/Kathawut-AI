import fs from "fs";
import path from "path";
import os from "os";
import initSqlJs from "sql.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use home directory for data files
const KARN_DIR = path.join(os.homedir(), ".karn");
if (!fs.existsSync(KARN_DIR)) {
    fs.mkdirSync(KARN_DIR, { recursive: true });
}

const DB_PATH = path.join(KARN_DIR, "database.sqlite");

// Initialize database with sql.js (works everywhere)
let db: any;
let SQL: any;

async function initializeDB() {
    // Find wasm file location
    const wasmPath = path.join(__dirname, "../node_modules/sql.js/dist/sql-wasm.wasm");
    
    SQL = await initSqlJs({
        locateFile: (file: string) => {
            // Try multiple locations
            const locations = [
                path.join(__dirname, file),
                path.join(__dirname, "../node_modules/sql.js/dist", file),
                path.join(process.cwd(), "node_modules/sql.js/dist", file),
            ];
            
            for (const loc of locations) {
                if (fs.existsSync(loc)) {
                    return loc;
                }
            }
            
            // Fallback to default
            return file;
        }
    });
    
    // Load existing database or create new one
    if (fs.existsSync(DB_PATH)) {
        const buffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(buffer);
    } else {
        db = new SQL.Database();
    }
}

// Save database after modifications
function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
    }
}

const MEMORY_FILE = path.join(KARN_DIR, "memory.md");

// Helper functions for sql.js
function runQuery(sql: string, params: any[] = []) {
    db.run(sql, params);
    saveDatabase();
}

function getQuery(sql: string, params: any[] = []): any {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const result = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return result;
}

function allQuery(sql: string, params: any[] = []): any[] {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results: any[] = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

// Initialize Layers
export async function initDB() {
    await initializeDB();
    
    // Create initial memory.md if not exists (do this first)
    try {
        if (!fs.existsSync(MEMORY_FILE)) {
            fs.writeFileSync(MEMORY_FILE, "# User Memory & Preferences\n\nThis file is managed by KARN AI. You can edit it manually to update your preferences.\n\n## Data\n");
            console.log("✅ Created memory.md");
        }
    } catch (e) {
        console.error("❌ Failed to create memory.md:", e);
    }
    
    // Migrate or drop old sensory_memory if needed
    try {
        allQuery("SELECT data FROM sensory_memory LIMIT 1");
    } catch (e) {
        runQuery("DROP TABLE IF EXISTS sensory_memory");
    }

    runQuery(`CREATE TABLE IF NOT EXISTS sensory_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    runQuery(`CREATE TABLE IF NOT EXISTS working_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT,
        detail TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    runQuery(`CREATE TABLE IF NOT EXISTS long_term_memory (
        key TEXT PRIMARY KEY,
        value TEXT
    )`);

    runQuery(`CREATE TABLE IF NOT EXISTS raw_docs (
        name TEXT PRIMARY KEY,
        content TEXT
    )`);

    runQuery(`CREATE TABLE IF NOT EXISTS scheduled_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scheduled_at DATETIME,
        task_description TEXT,
        status TEXT DEFAULT 'pending',
        recurrence_minutes INTEGER DEFAULT NULL
    )`);

    // Migrate existing scheduled_tasks table to add recurrence_minutes if missing
    try {
        // Check if recurrence_minutes column exists
        const tableInfo = allQuery("PRAGMA table_info(scheduled_tasks)");
        const hasRecurrence = tableInfo.some((col: any) => col.name === 'recurrence_minutes');
        
        if (!hasRecurrence) {
            console.log("🔄 Migrating scheduled_tasks table...");
            runQuery("ALTER TABLE scheduled_tasks ADD COLUMN recurrence_minutes INTEGER DEFAULT NULL");
            console.log("✅ Migration completed: added recurrence_minutes column");
        }
    } catch (e) {
        console.error("❌ Migration error:", e);
    }

    // Create initial memory.md if not exists
    if (!fs.existsSync(MEMORY_FILE)) {
        try {
            fs.writeFileSync(MEMORY_FILE, "# User Memory & Preferences\n\nThis file is managed by KARN AI. You can edit it manually to update your preferences.\n\n## Data\n");
            console.log("✅ Created memory.md");
        } catch (e: any) {
            console.error("❌ Failed to create memory.md:", e.message);
        }
    }
    
    // Sync to file to ensure it's up to date
    syncToFile();
}

function syncToFile() {
    let content = "# User Memory & Preferences\n\nThis file is managed by KARN AI. You can edit it manually to update your preferences.\n\n## Data\n";

    // 1. Key-Value Data
    const data = allQuery("SELECT key, value FROM long_term_memory");
    data.forEach((item: any) => {
        content += `- **${item.key}**: ${item.value}\n`;
    });

    // 2. Raw Documentation / Notes
    const docs = allQuery("SELECT name, content FROM raw_docs");
    if (docs.length > 0) {
        content += "\n## Documentation & Notes\n";
        docs.forEach((doc: any) => {
            content += `\n### ${doc.name}\n${doc.content}\n`;
        });
    }

    fs.writeFileSync(MEMORY_FILE, content);
}

export const memory = {
    // Sensory Memory
    addChat: (message: { role: string, content?: string | null, tool_calls?: any[], tool_call_id?: string }) => {
        runQuery("INSERT INTO sensory_memory (data) VALUES (?)", [JSON.stringify(message)]);
    },
    getRecentChats: () => {
        const rows = allQuery("SELECT data FROM sensory_memory ORDER BY timestamp ASC");
        return rows.map((r: any) => JSON.parse(r.data));
    },
    clearHistory: () => {
        runQuery("DELETE FROM sensory_memory");
    },

    // Working Memory
    logAction: (action: string, detail: string) => {
        runQuery("INSERT INTO working_memory (action, detail) VALUES (?, ?)", [action, detail]);
    },
    getLastAction: () => {
        return getQuery("SELECT * FROM working_memory ORDER BY timestamp DESC LIMIT 1");
    },
    getRecentActions: (limit: number = 10) => {
        return allQuery("SELECT * FROM working_memory ORDER BY timestamp DESC LIMIT ?", [limit]);
    },

    // Raw Docs / Documentation
    setDoc: (name: string, content: string) => {
        runQuery("INSERT OR REPLACE INTO raw_docs (name, content) VALUES (?, ?)", [name, content]);
        syncToFile();
    },
    forgetDoc: (name: string) => {
        runQuery("DELETE FROM raw_docs WHERE name = ?", [name]);
        syncToFile();
    },

    // Long-term Memory
    setInfo: (key: string, value: string) => {
        runQuery("INSERT OR REPLACE INTO long_term_memory (key, value) VALUES (?, ?)", [key, value]);
        syncToFile();
    },
    getInfo: (key: string) => {
        return getQuery("SELECT value FROM long_term_memory WHERE key = ?", [key]);
    },
    getAllLongTerm: () => {
        if (fs.existsSync(MEMORY_FILE)) {
            return fs.readFileSync(MEMORY_FILE, "utf-8");
        }
        return "(ยังไม่มีข้อมูลความจำ)";
    },
    forget: (key: string) => {
        runQuery("DELETE FROM long_term_memory WHERE key = ?", [key]);
        syncToFile();
    },

    // Scheduling Memory
    addTask: (at: string, desc: string, recurrenceMinutes?: number) => {
        if (recurrenceMinutes) {
            runQuery("INSERT INTO scheduled_tasks (scheduled_at, task_description, recurrence_minutes) VALUES (?, ?, ?)", [at, desc, recurrenceMinutes]);
        } else {
            runQuery("INSERT INTO scheduled_tasks (scheduled_at, task_description) VALUES (?, ?)", [at, desc]);
        }
    },
    getDueTasks: () => {
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, "0");
        const nowStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        return allQuery("SELECT * FROM scheduled_tasks WHERE status = 'pending' AND scheduled_at <= ?", [nowStr]);
    },
    getPendingTasks: () => {
        return allQuery("SELECT * FROM scheduled_tasks WHERE status = 'pending' ORDER BY scheduled_at ASC");
    },
    completeTask: (id: number) => {
        // Check if task has recurrence
        const task = getQuery("SELECT * FROM scheduled_tasks WHERE id = ?", [id]);
        if (task && task.recurrence_minutes) {
            // Calculate next occurrence
            const currentTime = new Date(task.scheduled_at);
            currentTime.setMinutes(currentTime.getMinutes() + task.recurrence_minutes);
            const pad = (n: number) => n.toString().padStart(2, "0");
            const nextTime = `${currentTime.getFullYear()}-${pad(currentTime.getMonth() + 1)}-${pad(currentTime.getDate())} ${pad(currentTime.getHours())}:${pad(currentTime.getMinutes())}:${pad(currentTime.getSeconds())}`;
            
            // Create new recurring task
            runQuery("INSERT INTO scheduled_tasks (scheduled_at, task_description, recurrence_minutes) VALUES (?, ?, ?)", 
                [nextTime, task.task_description, task.recurrence_minutes]);
        }
        // Mark current task as completed
        runQuery("UPDATE scheduled_tasks SET status = 'completed' WHERE id = ?", [id]);
    },
    clearAllTasks: () => {
        runQuery("DELETE FROM scheduled_tasks WHERE status = 'pending'");
    },
    cancelTask: (id: number) => {
        // Get task info (check both pending and completed tasks)
        let task = getQuery("SELECT * FROM scheduled_tasks WHERE id = ?", [id]);
        
        // If task not found by ID, it might have been completed and recreated
        // Try to find a pending task with similar description
        if (!task) {
            console.log(`>>> [CANCEL] Task ID ${id} not found, searching by recent tasks...`);
            // Get the most recent completed task to find its description
            const recentCompleted = getQuery("SELECT * FROM scheduled_tasks WHERE id <= ? ORDER BY id DESC LIMIT 1", [id]);
            if (recentCompleted && recentCompleted.recurrence_minutes) {
                task = recentCompleted;
                console.log(`>>> [CANCEL] Found related task: ${task.task_description}`);
            }
        }
        
        if (!task) {
            console.log(`>>> [CANCEL ERROR] Cannot find task or related tasks for ID ${id}`);
            return;
        }
        
        if (task.recurrence_minutes) {
            // For recurring tasks, cancel all future instances with same description
            const deleted = runQuery("DELETE FROM scheduled_tasks WHERE task_description = ? AND status = 'pending'", [task.task_description]);
            console.log(`>>> [CANCEL RECURRING] Cancelled all pending instances of: ${task.task_description}`);
        } else {
            // For one-time tasks, just cancel this specific task
            runQuery("DELETE FROM scheduled_tasks WHERE id = ? AND status = 'pending'", [id]);
            console.log(`>>> [CANCEL ONE-TIME] Cancelled task ID ${id}`);
        }
    }
};
