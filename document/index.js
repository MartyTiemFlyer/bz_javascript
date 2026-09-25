// index.js - основной файл для запуска сервера Express и настройки маршрутов.
const path = require('path');
require('dotenv').config();
const app = require('./backend/express_setting');
const pagesRouter = require('./backend/routes/pages');
const initTables = require('./backend/doc_db_init');
initTables().catch(err => console.error('Error creating tables:', err));
const pool = require('./backend/db_pool');
const ejs = require('ejs');
const attachSidebarData = require('./backend/sidebar_data');
//const editRouter = require('./backend/routes/edit');
const searchRouter = require('./backend/routes/search');
const attachAuthStatus = require('./backend/middleware/attach_auth_status');


// Настройка вьюшек 
app.set('views', path.join(__dirname, 'public'));
app.set('view engine', 'ejs');

// Подключаем ко всем страницам данные для боковой панели и статус аутентификации
app.use(attachSidebarData);
app.use(attachAuthStatus);  
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

// Подключение маршрутов аутентификации и middleware для защиты маршрутов редактирования
const authRouter = require('./backend/routes/auth');
const requireAuth = require('./backend/middleware/require_auth');
const editRouter = require('./backend/routes/edit');

app.use('/', authRouter);
app.use('/', pagesRouter);

app.use('/edit', requireAuth, editRouter);  // editRouter для редактирования страниц базы знаний
app.use('/', pagesRouter); // Страницы базы знаний: /scripts/script-1, /documents/installation и т.д.

// Подключение и лог
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`-----document/index.js-----`);
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

