const pool = require('./db_pool');

async function initTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(100) UNIQUE NOT NULL,
      title VARCHAR(255) NOT NULL,
      icon VARCHAR(10)
    )
  `);
  console.log('--- doc_db_init --- ');
  console.log('doc_db_init: Table "categories" is ready');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pages (
      id SERIAL PRIMARY KEY,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      slug VARCHAR(100) NOT NULL,
      title VARCHAR(255) NOT NULL,
      author VARCHAR(255),
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (category_id, slug)
    )
  `);
  console.log('db_init: Table "pages" is ready');

  await pool.query(`
  CREATE INDEX IF NOT EXISTS idx_pages_search
  ON pages
  USING GIN (to_tsvector('russian', title || ' ' || content))
`);
console.log('doc_db_init: Search index is ready');

await pool.query(`
  CREATE TABLE IF NOT EXISTS attachments (
    id SERIAL PRIMARY KEY,
    page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) UNIQUE NOT NULL,
    size INTEGER NOT NULL,
    uploaded_at TIMESTAMP DEFAULT NOW()
  )
`);
console.log('doc_db_init: Table "attachments" is ready');

}

module.exports = initTables;