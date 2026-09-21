const pool = require('./db_pool');

const scriptOneContent = `# Установка проекта 🚀

Это тестовая страница для проверки **разных возможностей** Markdown.

## Возможности

- Поддержка *курсива* и **жирного текста**
- Списки любой вложенности
  - Вложенный пункт 1
  - Вложенный пункт 2
- Эмодзи прямо в тексте: 🔥 ✅ ⚠️ 📌

## Нумерованный список

1. Установить Node.js
2. Клонировать репозиторий
3. Выполнить команду ниже

## Пример кода

Установка зависимостей делается так:

\`\`\`bash
npm install
npm run dev
\`\`\`

А вот пример конфигурации на JavaScript:

\`\`\`javascript
const app = require('express')();

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(3000);
\`\`\`

## Таблица

| Параметр | Тип     | По умолчанию |
|----------|---------|--------------|
| PORT     | number  | 3000         |
| DB_HOST  | string  | localhost    |

## Цитата

> ⚠️ Важно: не запускайте это в продакшене без переменных окружения.

## Ссылка

Подробнее в [документации Express](https://expressjs.com).

---

Конец тестовой страницы ✅
`;

async function seed() {
  const catResult = await pool.query(`
    INSERT INTO categories (slug, title, icon) VALUES
      ('scripts', 'Скрипты', '📜')
    RETURNING id, slug
  `);

  console.log('Вставлена категория:', catResult.rows);

  const scriptsCategory = catResult.rows[0];

  await pool.query(`
    INSERT INTO pages (category_id, slug, title, author, content) VALUES
      ($1, 'script-1', 'Скрипт 1', 'Иван Иванов', $2)
  `, [scriptsCategory.id, scriptOneContent]);

  console.log('Тестовая страница добавлена');
  process.exit(0);
}

seed().catch(err => {
  console.error('Ошибка при заполнении данных:', err);
  process.exit(1);
});