const express = require('express');
const router = express.Router();
const pool = require('../db_pool');

router.get('/', async (req, res) => {
  const query = (req.query.q || '').trim();

  if (!query) {
    return res.render('search-results', { query: '', results: [] });
  }

  try {
    const result = await pool.query(`
      SELECT
        pages.slug,
        pages.title,
        categories.slug AS category_slug,
        categories.title AS category_title,
        ts_rank(
          to_tsvector('russian', pages.title || ' ' || pages.content),
          plainto_tsquery('russian', $1)
        ) AS rank
      FROM pages
      JOIN categories ON categories.id = pages.category_id
      WHERE to_tsvector('russian', pages.title || ' ' || pages.content)
            @@ plainto_tsquery('russian', $1)
      ORDER BY rank DESC
      LIMIT 30
    `, [query]);

    res.render('search-results', { query, results: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка поиска');
  }
});

module.exports = router;