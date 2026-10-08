// uploads.js - Роуты для загрузки и удаления файлов, привязанных к страницам
const express = require('express');
const router = express.Router();
const upload = require('../upload');
const pool = require('../db_pool');
const fs = require('fs');
const path = require('path');

// Middleware для обработки одиночной загрузки файла с проверкой размера
function uploadSingle(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Файл больше 20 МБ' });
    }
    return res.status(400).json({ error: err.message || 'Не удалось загрузить файл' });
  });
}

// Загрузка файла, привязанного к странице
router.post('/:page_id', uploadSingle, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не получен' });
    }

    // для новой страницы клиент присылает "new", страницы ещё нет, поэтому NULL
    const page_id = req.params.page_id === 'new' ? null : req.params.page_id;

    // Исправляем кодировку имени файла (multer декодирует как latin1)
    const originalFilename = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

    await pool.query(`
      INSERT INTO attachments (page_id, original_filename, stored_filename, size)
      VALUES ($1, $2, $3, $4)
    `, [page_id, originalFilename, req.file.filename, req.file.size]);

    res.json({
      url: `/uploads/${req.file.filename}`,
      filename: originalFilename
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка загрузки файла' });
  }
});


// Удаление файла — из базы, и с диска
router.post('/:attachment_id/delete', async (req, res) => {
  const { attachment_id } = req.params;

  try {
    const result = await pool.query(
      'SELECT stored_filename FROM attachments WHERE id = $1',
      [attachment_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Файл не найден' });
    }

    const { stored_filename } = result.rows[0];
    const filePath = path.join(__dirname, '..', '..', 'uploads', stored_filename);

    await pool.query('DELETE FROM attachments WHERE id = $1', [attachment_id]);

    fs.unlink(filePath, (err) => {
      if (err) console.error('Не удалось удалить файл с диска:', err);
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка удаления файла' });
  }
});

module.exports = router;