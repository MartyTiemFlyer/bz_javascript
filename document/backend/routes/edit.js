const express = require("express");
const router = express.Router();
const pool = require("../db_pool");

// ===== КАТЕГОРИИ =====

// Форма создания категории
router.get("/category/new", (req, res) => {
  res.render("edit-category", {
    mode: "create",
    category: { slug: "", title: "", icon: "" },
  });
});

// Сохранение новой категории
router.post("/category/new", async (req, res) => {
  const { slug, title, icon } = req.body;
  try {
    await pool.query(
      "INSERT INTO categories (slug, title, icon) VALUES ($1, $2, $3)",
      [slug, title, icon],
    );
    res.redirect(`/${slug}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Ошибка сохранения категории");
  }
});

// Форма редактирования категории
router.get("/category/:slug", async (req, res) => {
  const { slug } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM categories WHERE slug = $1",
      [slug],
    );
    if (result.rows.length === 0) {
      return res.status(404).send("Категория не найдена");
    }
    res.render("edit-category", {
      mode: "edit",
      category: result.rows[0],
      error: req.query.error || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Ошибка сервера");
  }
});

// Сохранение изменений категории
router.post("/category/:slug", async (req, res) => {
  const { slug } = req.params;
  const { title, icon } = req.body;
  try {
    await pool.query(
      "UPDATE categories SET title = $1, icon = $2 WHERE slug = $3",
      [title, icon, slug],
    );
    res.redirect(`/${slug}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Ошибка сохранения категории");
  }
});

// ===== СТРАНИЦЫ =====

// Форма создания страницы
router.get("/page/new", async (req, res) => {
  const categoriesResult = await pool.query(
    "SELECT id, slug, title FROM categories ORDER BY title",
  );
  res.render("edit-page", {
    mode: "create",
    page: { slug: "", title: "", author: "", content: "", category_id: null },
    categories: categoriesResult.rows,
    current_category_slug: null,
  });
});

// Сохранение новой страницы
router.post("/page/new", async (req, res) => {
  const { slug, title, author, content, category_id } = req.body;
  try {
    await pool.query(
      `
      INSERT INTO pages (category_id, slug, title, author, content)
      VALUES ($1, $2, $3, $4, $5)
    `,
      [category_id, slug, title, author, content],
    );

    const categoryResult = await pool.query(
      "SELECT slug FROM categories WHERE id = $1",
      [category_id],
    );
    res.redirect(`/${categoryResult.rows[0].slug}/${slug}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Ошибка сохранения страницы");
  }
});

// Форма редактирования страницы
router.get('/page/:category/:slug', async (req, res) => {
  const { category, slug } = req.params;
  try {
    const result = await pool.query(`
      SELECT pages.*
      FROM pages
      JOIN categories ON pages.category_id = categories.id
      WHERE categories.slug = $1 AND pages.slug = $2
    `, [category, slug]);

    if (result.rows.length === 0) {
      return res.status(404).send('Страница не найдена');
    }

    const categoriesResult = await pool.query('SELECT id, slug, title FROM categories ORDER BY title');

    res.render('edit-page', {
      mode: 'edit',
      page: result.rows[0],
      categories: categoriesResult.rows,
      current_category_slug: category,
      error: req.query.error || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера');
  }
});

// Сохранение изменений страницы
router.post("/page/:category/:slug", async (req, res) => {
  const { category, slug } = req.params;
  const { title, author, content, category_id } = req.body;
  try {
    await pool.query(
      `
      UPDATE pages
      SET title = $1, author = $2, content = $3, category_id = $4, updated_at = NOW()
      WHERE category_id = (SELECT id FROM categories WHERE slug = $5) AND slug = $6`,
      [title, author, content, category_id, category, slug],
    );

    const newCategoryResult = await pool.query(
      "SELECT slug FROM categories WHERE id = $1",
      [category_id],
    );
    res.redirect(`/${newCategoryResult.rows[0].slug}/${slug}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Ошибка сохранения страницы: 500");
  }
});

// Удаление страницы
router.post('/page/:category/:slug/delete', async (req, res) => {
  const { category, slug } = req.params;
  try {
    await pool.query(`
      DELETE FROM pages
      WHERE category_id = (SELECT id FROM categories WHERE slug = $1) AND slug = $2
    `, [category, slug]);

    res.redirect(`/${category}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка удаления страницы');
  }
});

// Удаление категории
router.post('/category/:slug/delete', async (req, res) => {
  const { slug } = req.params;
  try {
    const categoryResult = await pool.query('SELECT id FROM categories WHERE slug = $1', [slug]);

    if (categoryResult.rows.length === 0) {
      return res.status(404).send('Категория не найдена');
    }

    const categoryId = categoryResult.rows[0].id;

    const pagesCountResult = await pool.query(
      'SELECT COUNT(*) FROM pages WHERE category_id = $1',
      [categoryId]
    );
    const pagesCount = parseInt(pagesCountResult.rows[0].count, 10);

    if (pagesCount > 0) {
      return res.redirect(`/edit/category/${slug}?error=has_pages`);
    }

    await pool.query('DELETE FROM categories WHERE id = $1', [categoryId]);
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка удаления категории');
  }
});

module.exports = router;
