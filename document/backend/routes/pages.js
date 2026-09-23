//pages.js 
// страница управляет маршрутизацией для страниц базы знаний, таких как /scripts/script-1
const express = require('express');
const router = express.Router();
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt();
const pool = require('../db_pool');

// Отдельная страница: /scripts/script-1
router.get('/:category/:page', async (req, res) => {
  const { category, page } = req.params;

  try {
    const result = await pool.query(`
      SELECT pages.*, categories.title AS category_title, categories.slug AS category_slug
      FROM pages
      JOIN categories ON pages.category_id = categories.id
      WHERE categories.slug = $1 AND pages.slug = $2
    `, [category, page]);

    if (result.rows.length === 0) {
      return res.status(404).send('Страница не найдена');
    }

    const pageData = result.rows[0];
    const contentHtml = md.render(pageData.content);

    const breadcrumbs = [
      { title: 'База знаний', url: '/' },
      { title: pageData.category_title, url: `/${pageData.category_slug}` },
      { title: pageData.title, url: null }
    ];

    res.render('knowledge-page', {
      page_content: contentHtml,
      page_title: pageData.title,
      page_author: pageData.author,
      page_updated_at: pageData.updated_at,
      breadcrumbs
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера');
  }
});

// Список страниц внутри категории: /scripts
router.get('/:category', async (req, res) => {
  const { category } = req.params;

  try {
    const categoryResult = await pool.query('SELECT * FROM categories WHERE slug = $1', [category]);

    if (categoryResult.rows.length === 0) {
      return res.status(404).send('Категория не найдена');
    }

    const categoryData = categoryResult.rows[0];

    const pagesResult = await pool.query(
      'SELECT * FROM pages WHERE category_id = $1 ORDER BY title',
      [categoryData.id]
    );

    const breadcrumbs = [
      { title: 'База знаний', url: '/' },
      { title: categoryData.title, url: null }
    ];

    res.render('category-page', {
      category_title: categoryData.title,
      category_slug: categoryData.slug,
      pages: pagesResult.rows,
      breadcrumbs
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера');
  }
});

module.exports = router;