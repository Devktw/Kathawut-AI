import { Database } from "bun:sqlite";
const db = new Database("database.sqlite");
const tasks = db.query("SELECT * FROM scheduled_tasks").all();
console.log(JSON.stringify(tasks, null, 2));
