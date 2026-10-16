// search.js 
// страница управляет маршрутизацией для поиска по базе знаний, таких как /search?q=текст
const express = require('express');
const router = express.Router();
const pool = require('../db_pool');

// Подсветка 
const HL_START = '[[[HL]]]';
const HL_END = '[[[/HL]]]';

// заменяет опасные символы на безопасные HTML-коды
function escapeHtml(str) { 
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildSnippet(raw) {
  if (!raw) return '';
  return escapeHtml(raw)
    .split(HL_START).join('<mark>')
    .split(HL_END).join('</mark>');
}

// превращает ввод пользователя в запрос
function buildTsQuery(input) {
  const terms = input
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  return terms.map(t => `${t}:*`).join(' & ');
}

// ---------- Очистка Markdown (на стороне PostgreSQL) ----------
// Каждое правило: [регулярка, замена, флаги] Применяются по порядку.
const MD_CLEAN_RULES = [
  // ![alt](url) и [текст](url) -> оставляем только текст
  [String.raw`!?\[([^]]*)\]\([^)]*\)`, String.raw`\1`, 'g'],
  // ограждения кода ```js -> пробел
  ['```[a-zA-Z0-9_-]*', ' ', 'g'],
  // маркеры в начале строки: #, >, -, *, +, 1.  1)
  [String.raw`^[ \t]*(#{1,6}|>+|[-*+]|[0-9]+[.)])[ \t]+`, '', 'gn'],
  // горизонтальные линии и разделители таблиц ---
  ['-{3,}', ' ', 'g'],
  // вертикальные черты таблиц
  ['[|]', ' ', 'g'],
  // **жирный**, *курсив*, `код`, ~~зачёркнутый~~
  ['[*`~]+', '', 'g'],
  ['__', '', 'g'],
  // схлопываем пробелы и переводы строк
  ['[[:space:]]+', ' ', 'g'],
];

// функция для очистки Markdown в SQL-запросе
function stripMarkdownSql(column) {
  return MD_CLEAN_RULES.reduce(
    (expr, [pattern, replacement, flags]) =>
      `regexp_replace(${expr}, '${pattern}', '${replacement}', '${flags}')`,
    column
  );
}

// ---------- Маршрут ----------
// Поиск по базе знаний. Результаты выводятся на страницу search-results.ejs
router.get('/', async (req, res) => {
  const query = (req.query.q || '').trim();
  const tsQuery = buildTsQuery(query);

  if (!tsQuery) {
    return res.render('search-results', { query, results: [] });
  }

  try {
    const result = await pool.query(`
      WITH found AS (
        SELECT
          pages.slug,
          pages.title,
          pages.content,
          categories.slug AS category_slug,
          categories.title AS category_title,
          ts_rank(
            to_tsvector('russian', pages.title || ' ' || pages.content),
            to_tsquery('russian', $1)
          ) AS rank
        FROM pages
        JOIN categories ON categories.id = pages.category_id
        WHERE to_tsvector('russian', pages.title || ' ' || pages.content)
              @@ to_tsquery('russian', $1)
        ORDER BY rank DESC
        LIMIT 30
      )
      SELECT
        slug,
        title,
        category_slug,
        category_title,
        rank,
        ts_headline(
          'russian',
          ${stripMarkdownSql('content')},
          to_tsquery('russian', $1),
          'StartSel=${HL_START}, StopSel=${HL_END}, MaxWords=25, MinWords=10, ShortWord=2, MaxFragments=2, FragmentDelimiter=" … "'
        ) AS snippet
      FROM found
      ORDER BY rank DESC
    `, [tsQuery]);

    const results = result.rows.map(row => ({
      ...row,
      snippet: buildSnippet(row.snippet),
    }));

    res.render('search-results', { query, results });
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка поиска');
  }
});

module.exports = router;