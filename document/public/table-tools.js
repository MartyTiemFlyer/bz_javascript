// public/table-tools.js
// Инструменты для таблиц на странице статьи.

// кнопка «Копировать» над каждой таблицей.
(function () {
  'use strict';

  // ---------- Чтение данных ----------
  
  // Текст одной ячейки: <br> -> перенос строки, лишние пробелы убираем
  function cellText(cell) {
    var clone = cell.cloneNode(true);
    clone.querySelectorAll('br').forEach(function (br) {
      br.replaceWith('\n');
    });
    return clone.textContent
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .trim();
  }

  // Таблица -> массив строк, строка -> массив текстов ячеек
  function readTable(table) {
    return Array.prototype.map.call(table.rows, function (tr) {
      return Array.prototype.map.call(tr.cells, cellText);
    });
  }

  // ---------- Копирование ----------

  // Ячейки через табуляцию, строки через перенос.
  // Табуляции и переносы внутри ячеек заменяем пробелом.
  // Ячейку с кавычкой оборачиваем в кавычки.
  function toTsv(rows) {
    return rows.map(function (row) {
      return row.map(function (value) {
        var v = value.replace(/[\t\r\n]+/g, ' ');
        if (v.indexOf('"') !== -1) {
          v = '"' + v.replace(/"/g, '""') + '"';
        }
        return v;
      }).join('\t');
    }).join('\r\n');
  }

  // HTTPS и localhost: современный способ. Обычный http://: запасной.
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '0';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      if (ok) resolve(); else reject(new Error('copy failed'));
    });
  }

  // ---------- Кнопки над таблицами ----------

  function flash(btn, text) {
    var original = btn.getAttribute('data-label');
    btn.textContent = text;
    setTimeout(function () { btn.textContent = original; }, 1600);
  }

  function init() {
    var article = document.querySelector('.markdown');
    if (!article) {
      console.warn('[table-tools] не найден .markdown');
      return;
    }

    var tables = Array.prototype.slice.call(article.querySelectorAll('table'));
    console.log('[table-tools] найдено таблиц:', tables.length);
    if (!tables.length) return;

    tables.forEach(function (table) {
      var bar = document.createElement('div');
      bar.className = 'table-tools no-print';

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'copy-table-button';
      btn.setAttribute('data-label', '📋 Копировать таблицу');
      btn.textContent = '📋 Копировать таблицу';

      btn.addEventListener('click', function () {
        copyText(toTsv(readTable(table)))
          .then(function () { flash(btn, '✅ Скопировано'); })
          .catch(function () { flash(btn, '⚠️ Не удалось'); });
      });

      bar.appendChild(btn);
      table.parentNode.insertBefore(bar, table);
    });
  }

  // Ждём, пока страница загрузится, где бы ни стоял <script>
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();