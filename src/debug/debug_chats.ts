import { Database } from "bun:sqlite";
import path from "path";
const db = new Database(path.join(process.cwd(), "..", "..", "database.sqlite"));
const rows = db.query("SELECT * FROM sensory_memory ORDER BY timestamp DESC LIMIT 5").all();
rows.forEach((r: any) => {
    console.log(`--- ${r.timestamp} ---`);
    console.log(r.data);
});
