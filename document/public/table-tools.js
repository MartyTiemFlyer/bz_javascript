// public/table-tools.js
// Инструменты для таблиц на странице статьи.
(function () {
  "use strict";

  // ---------- Чтение данных ----------

  function cellText(cell) {
    var clone = cell.cloneNode(true);
    clone.querySelectorAll("br").forEach(function (br) {
      br.replaceWith("\n");
    });
    return clone.textContent
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/ *\n */g, "\n")
      .trim();
  }

  function readTable(table) {
    return Array.prototype.map.call(table.rows, function (tr) {
      return Array.prototype.map.call(tr.cells, cellText);
    });
  }

  // ---------- Копирование ----------

  function toTsv(rows) {
    return rows
      .map(function (row) {
        return row
          .map(function (value) {
            var v = value.replace(/[\t\r\n]+/g, " ");
            if (v.indexOf('"') !== -1) {
              v = '"' + v.replace(/"/g, '""') + '"';
            }
            return v;
          })
          .join("\t");
      })
      .join("\r\n");
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "0";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (e) {
        ok = false;
      }
      document.body.removeChild(ta);
      if (ok) resolve();
      else reject(new Error("copy failed"));
    });
  }

  function flash(btn, text) {
    var original = btn.getAttribute("data-label");
    btn.textContent = text;
    setTimeout(function () {
      btn.textContent = original;
    }, 1600);
  }

  // ---------- Excel ----------

  // «Явное» число: 45, -7, 3.14, 3,14, 45 000, 1 234 567,89
  // без ведущих нулей, не длиннее 15 цифр. Всё остальное остаётся текстом.
  function toCellValue(text) {
    var t = text.replace(/[\u00a0\u202f]/g, " ");
    var m = /^(-?)([1-9]\d{0,2}(?: \d{3})+|0|[1-9]\d*)(?:[.,](\d+))?$/.exec(t);

    if (!m || t.replace(/\D/g, "").length > 15) return { value: text };

    var grouped = m[2].indexOf(" ") !== -1;
    var dec = m[3] ? m[3].length : 0;
    var num = Number(m[1] + m[2].replace(/ /g, "") + (dec ? "." + m[3] : ""));
    var fmt =
      (grouped ? "#,##0" : "0") +
      (dec ? "." + new Array(dec + 1).join("0") : "");

    return { value: num, numFmt: fmt };
  }

  // Имя листа: без запрещённых символов, до 31 символа, уникальное
  function makeSheetName(raw, index, used) {
    var base = String(raw || "")
      .replace(/[\\\/\?\*\[\]:]/g, "")
      .replace(/^'+|'+$/g, "")
      .trim();
    if (!base) base = "Таблица " + index;
    base = base.slice(0, 31);

    var name = base;
    var n = 2;
    while (used[name.toLowerCase()]) {
      var suffix = " " + n++;
      name = base.slice(0, 31 - suffix.length) + suffix;
    }
    used[name.toLowerCase()] = true;
    return name;
  }

  // Для каждой таблицы находим ближайший заголовок над ней
  function collectSheets(article) {
    var nodes = article.querySelectorAll("h1,h2,h3,h4,h5,h6,table");
    var heading = "";
    var result = [];
    Array.prototype.forEach.call(nodes, function (node) {
      if (node.tagName === "TABLE") {
        result.push({ table: node, heading: heading });
      } else {
        heading = node.textContent.trim();
      }
    });
    return result;
  }

  function fileName() {
    var h1 = document.querySelector(".content h1");
    var base = (h1 && h1.textContent.trim()) || "table";
    base = base.replace(/[\\\/:*?"<>|]+/g, "").trim() || "table";
    return base + ".xlsx";
  }

  function download(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  async function exportExcel(article) {
    if (typeof ExcelJS === "undefined") {
      throw new Error("ExcelJS не загружен");
    }

    var wb = new ExcelJS.Workbook();
    var used = {};

    collectSheets(article).forEach(function (item, i) {
      var rows = readTable(item.table);
      if (!rows.length) return;

      var ws = wb.addWorksheet(makeSheetName(item.heading, i + 1, used));
      var colCount = 0;
      var widths = [];

      rows.forEach(function (row) {
        colCount = Math.max(colCount, row.length);
        var parsed = row.map(toCellValue);
        var excelRow = ws.addRow(
          parsed.map(function (p) {
            return p.value;
          }),
        );
        parsed.forEach(function (p, c) {
          if (p.numFmt) excelRow.getCell(c + 1).numFmt = p.numFmt;
        });
        row.forEach(function (value, c) {
          var longest = value.split("\n").reduce(function (m, line) {
            return Math.max(m, line.length);
          }, 0);
          widths[c] = Math.max(widths[c] || 0, longest);
        });
      });

      // ширина колонок по содержимому, в разумных пределах
      for (var c = 0; c < colCount; c++) {
        ws.getColumn(c + 1).width = Math.min(
          Math.max((widths[c] || 0) + 2, 8),
          60,
        );
      }

      // перенос текста и выравнивание сверху
      ws.eachRow(function (row) {
        row.eachCell({ includeEmpty: true }, function (cell) {
          cell.alignment = { vertical: "top", wrapText: true };
        });
      });

      // шапка: жирная, с фоном; закрепляем первую строку
      ws.getRow(1).eachCell({ includeEmpty: true }, function (cell) {
        cell.font = { bold: true };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFEEF2F9" },
        };
      });
      ws.views = [{ state: "frozen", ySplit: 1 }];
    });

    var buffer = await wb.xlsx.writeBuffer();
    download(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      fileName(),
    );
  }

  // ---------- Инициализация ----------

  function init() {
    var article = document.querySelector(".markdown");
    if (!article) return;

    var tables = Array.prototype.slice.call(article.querySelectorAll("table"));
    console.log("[table-tools] найдено таблиц:", tables.length);
    if (!tables.length) return;

    // Кнопки «Копировать» над таблицами
    tables.forEach(function (table) {
      var bar = document.createElement("div");
      bar.className = "table-tools no-print";

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy-table-button";
      btn.setAttribute("data-label", "📋 Копировать таблицу");
      btn.textContent = "📋 Копировать таблицу";

      btn.addEventListener("click", function () {
        copyText(toTsv(readTable(table)))
          .then(function () {
            flash(btn, "✅ Скопировано");
          })
          .catch(function () {
            flash(btn, "⚠️ Не удалось");
          });
      });

      bar.appendChild(btn);
      table.parentNode.insertBefore(bar, table);
    });

    // Кнопка «Скачать Excel» в шапке страницы
    var xlsxBtn = document.getElementById("xlsx-btn");
    if (xlsxBtn) {
      var xlsxLabel = xlsxBtn.querySelector(".menu-label");
      xlsxBtn.hidden = false;
      xlsxLabel.setAttribute("data-label", xlsxLabel.textContent);

      xlsxBtn.addEventListener("click", function () {
        xlsxBtn.disabled = true;
        exportExcel(article)
          .catch(function (err) {
            console.error("[table-tools]", err);
            flash(xlsxLabel, "⚠️ Не удалось");
          })
          .then(function () {
            xlsxBtn.disabled = false;
          });
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
