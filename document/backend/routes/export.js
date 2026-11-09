// backend/routes/export.js
// Маршрут для экспорта в Word (docx)
const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const HTMLtoDOCX = require('html-to-docx').default || require('html-to-docx');
const router = express.Router();

// Папка с загрузками: backend/routes -> корень проекта/uploads (проверьте под свою структуру)
const UPLOADS_DIR = path.resolve(__dirname, '..', '..', 'uploads');
const MAX_HTML = 5 * 1024 * 1024;
const MAX_IMAGE = 5 * 1024 * 1024;
const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif'
};

let requestCounter = 0;
function log(id, ...args) {
  console.log('[export]', new Date().toISOString(), id ? '#' + id : '', ...args);
}

// Лог при подключении модуля: сразу видно, если папка картинок не найдена
fs.access(UPLOADS_DIR)
  .then(() => log(null, 'маршрут /export/docx подключён, папка картинок:', UPLOADS_DIR))
  .catch(() => log(null, 'ВНИМАНИЕ: папка картинок не найдена:', UPLOADS_DIR));

// ---------- Очистка HTML ----------

function stripDangerous(html) {
  return html
    .replace(/<(script|iframe|object|embed|style|link|meta|base)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(script|iframe|object|embed|style|link|meta|base)\b[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

// ---------- Картинки: только локальные, читаем с диска ----------

async function loadLocalImage(src) {
  // уже встроенные картинки допустимых типов оставляем как есть
  if (/^data:image\/(png|jpeg|gif);base64,[a-z0-9+/=]+$/i.test(src)) {
    return { data: src };
  }

  var url;
  try { url = new URL(src, 'http://local'); } catch (e) { return { reason: 'некорректный адрес' }; }

  var rel;
  try { rel = decodeURIComponent(url.pathname); } catch (e) { return { reason: 'некорректная кодировка' }; }

  if (rel.indexOf('/uploads/') !== 0) return { reason: 'не из /uploads/' };

  var ext = path.extname(rel).toLowerCase();
  if (!MIME[ext]) return { reason: 'тип ' + (ext || 'без расширения') + ' не разрешён' };

  var file = path.resolve(UPLOADS_DIR, rel.slice('/uploads/'.length));
  if (file.indexOf(UPLOADS_DIR + path.sep) !== 0) return { reason: 'выход за пределы папки' };

  try {
    var stat = await fs.stat(file);
    if (!stat.isFile()) return { reason: 'не файл' };
    if (stat.size > MAX_IMAGE) return { reason: 'больше 5 МБ' };
    var buf = await fs.readFile(file);
    return { data: 'data:' + MIME[ext] + ';base64,' + buf.toString('base64') };
  } catch (e) {
    return { reason: 'файл не найден' };
  }
}

async function localizeImages(html, id) {
  var tags = Array.from(new Set(html.match(/<img\b[^>]*>/gi) || []));
  var stats = { found: tags.length, kept: 0, dropped: 0 };

  for (var i = 0; i < tags.length; i++) {
    var tag = tags[i];
    var m = /\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(tag);
    var src = m ? (m[1] !== undefined ? m[1] : m[2]).replace(/&amp;/g, '&') : '';

    var res = src ? await loadLocalImage(src) : { reason: 'нет src' };

    var replacement = '';
    if (res.data) {
      replacement = tag.replace(/\ssrc\s*=\s*(?:"[^"]*"|'[^']*')/i, ' src="' + res.data + '"');
      stats.kept++;
    } else {
      stats.dropped++;
      log(id, 'картинка удалена:', res.reason, '|', src.slice(0, 120));
    }
    html = html.split(tag).join(replacement);
  }
    // конец функции localizeImages:
  return { html: html, stats: stats };
}

// ---------- Маршрут ----------

router.post('/docx', async (req, res) => {
  var id = ++requestCounter;
  var started = Date.now();

  try {
    var title = String(req.body.title || 'page').slice(0, 200);
    var html = String(req.body.html || '');

    log(id, 'запрос от', req.ip, '| заголовок:', title, '| html:', html.length, 'байт');

    if (!html || html.length > MAX_HTML) {
      log(id, 'отклонён: пустой или больше лимита');
      return res.status(400).send('Пустой или слишком большой документ');
    }

    var cleaned = stripDangerous(html);
    var prepared = await localizeImages(cleaned, id);
    log(id, 'картинки: найдено', prepared.stats.found,
        '| оставлено', prepared.stats.kept, '| удалено', prepared.stats.dropped);

    var safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    var buffer = await HTMLtoDOCX(
      '<h1>' + safeTitle + '</h1>' + prepared.html,
      null,
      { table: { row: { cantSplit: true } }, font: 'Arial' }
    );

    var fileName = title.replace(/[\\\/:*?"<>|]+/g, '').trim() || 'page';
    res.setHeader('Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition',
      "attachment; filename*=UTF-8''" + encodeURIComponent(fileName) + '.docx');
    res.send(buffer);

    log(id, 'готово:', buffer.length, 'байт за', Date.now() - started, 'мс');
  } catch (err) {
    log(id, 'ОШИБКА:', err && err.stack ? err.stack : err);
    res.status(500).send('Не удалось создать файл');
  }
});

module.exports = router;