const app = require('./backend/express_setting');
const path = require('path');
require('dotenv').config();
const pagesRouter = require('./backend/routes/pages');
const initTables = require('./backend/doc_db_init');
initTables().catch(err => console.error('Error creating tables:', err));
const pool = require('./backend/db_pool');
const ejs = require('ejs');

// Главная страница
app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY title');

    ejs.renderFile(path.join(__dirname, 'public', 'index.ejs'), {
      categories: result.rows
    }, (err, finalHtml) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Ошибка шаблона');
      }
      res.send(finalHtml);
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера');
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Страница с задачами (maintask)
app.get('/maintask', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'maintask.html'));
});

// Страницы базы знаний: /scripts/script-1, /documents/installation и т.д.
app.use('/', pagesRouter);

// Подключение и лог
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`-----document/index.js-----`);
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});