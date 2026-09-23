const app = require('./backend/express_setting');
const path = require('path');
require('dotenv').config();
const pagesRouter = require('./backend/routes/pages');
const initTables = require('./backend/doc_db_init');
initTables().catch(err => console.error('Error creating tables:', err));
const pool = require('./backend/db_pool');
const ejs = require('ejs');
const attachSidebarData = require('./backend/sidebar_data');
const editRouter = require('./backend/routes/edit');
const searchRouter = require('./backend/routes/search');


// Настройка вьюшек (если ещё не сделано в express_setting.js)
app.set('views', path.join(__dirname, 'public'));
app.set('view engine', 'ejs');

// Подключаем сайдбар-данные ко всем страницам
app.use(attachSidebarData);
app.use('/search', searchRouter);

// Главная страница
app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY title');

    res.render('index', {
      categories: result.rows
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



app.use('/edit', editRouter); // editRouter для редактирования страниц базы знаний
// Страницы базы знаний: /scripts/script-1, /documents/installation и т.д.
app.use('/', pagesRouter);

// Подключение и лог
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`-----document/index.js-----`);
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});