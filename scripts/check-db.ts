import pg from "pg";
const url = process.env.DATABASE_URL!;
const client = new pg.Client({ connectionString: url });
await client.connect();
const r = await client.query(`SELECT id, slug, type, parent_id, title FROM nodes LIMIT 20`);
console.log(r.rows);
const cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='nodes' ORDER BY ordinal_position`);
console.log("COLS", cols.rows.map(c=>c.column_name));
await client.end();
