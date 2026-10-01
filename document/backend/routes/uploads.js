const express = require('express');
const router = express.Router();
const upload = require('../upload');
const pool = require('../db_pool');

// Загрузка файла, привязанного к странице
router.post('/:page_id', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не получен' });
    }

    const { page_id } = req.params;

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

module.exports = router;