const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt();
const pool = require('../db_pool');


const TEMPLATE_PATH = path.join(__dirname, '..', '..', 'public', 'knowledge-page.ejs');

router.get('/:category/:page', async (req, res) => {
  const { category, page } = req.params;

  try {
    const result = await pool.query(`
      SELECT pages.*
      FROM pages
      JOIN categories ON pages.category_id = categories.id
      WHERE categories.slug = $1 AND pages.slug = $2
    `, [category, page]);

    if (result.rows.length === 0) {
      return res.status(404).send('Страница не найдена');
    }

    const pageData = result.rows[0];
    const contentHtml = md.render(pageData.content);

    ejs.renderFile(TEMPLATE_PATH, { page_content: contentHtml }, (err, finalHtml) => {
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


// Список страниц внутри категории
const CATEGORY_TEMPLATE_PATH = path.join(__dirname, '..', '..', 'public', 'category-page.ejs');

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

    ejs.renderFile(CATEGORY_TEMPLATE_PATH, {
      category_title: categoryData.title,
      category_slug: categoryData.slug,
      pages: pagesResult.rows
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

module.exports = router;
