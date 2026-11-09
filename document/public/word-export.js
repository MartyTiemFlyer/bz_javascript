// public/word-export.js
// Скрипт для кнопки "Скачать Word" на странице знаний
(function () {
  "use strict";

  var btn = document.getElementById("word-btn");
  var article = document.querySelector(".markdown");
  if (!btn || !article) return;

  var label = btn.querySelector(".menu-label");

  function pageTitle() {
    var h1 = document.querySelector(".content h1");
    return (h1 && h1.textContent.trim()) || "page";
  }

  // Копия статьи, подготовленная для Word
  function buildHtml() {
    var clone = article.cloneNode(true);

    // убираем интерфейс сайта
    clone
      .querySelectorAll(".table-tools, .no-print, script")
      .forEach(function (n) {
        n.remove();
      });

    // таблицы: Word берёт оформление из inline-стилей
    clone.querySelectorAll("table").forEach(function (t) {
      t.setAttribute("style", "border-collapse:collapse;");
    });
    clone.querySelectorAll("th, td").forEach(function (c) {
      c.setAttribute("style", "border:1px solid #9ca3af;padding:4px 8px;");
    });
    clone.querySelectorAll("th").forEach(function (c) {
      c.setAttribute(
        "style",
        "border:1px solid #9ca3af;padding:4px 8px;background-color:#d8edff;font-weight:bold;",
      );
    });

    // код: моноширинный шрифт и фон
    clone.querySelectorAll("pre").forEach(function (p) {
      p.setAttribute(
        "style",
        "font-family:Consolas,Courier New,monospace;font-size:10pt;background-color:#f1f1f1;",
      );
    });

    var html = "<h1>" + escapeHtml(pageTitle()) + "</h1>" + clone.innerHTML;
    return { html: html, root: clone };
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
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

  async function exportWord() {
    var built = buildHtml();
    var title = pageTitle();

    // Картинки: относительные адреса превращаем в полные, сервер их скачает
    built.root.querySelectorAll("img").forEach(function (img) {
      img.setAttribute(
        "src",
        new URL(img.getAttribute("src"), location.href).href,
      );
    });

    var resp = await fetch("/export/docx", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title, html: built.root.innerHTML }),
    });
    if (!resp.ok) throw new Error("Сервер вернул " + resp.status);

    var blob = await resp.blob();
    var name = title.replace(/[\\\/:*?"<>|]+/g, "").trim() || "page";
    download(blob, name + ".docx");
  }

  btn.addEventListener("click", function () {
    btn.disabled = true;
    var original = label.textContent;
    label.textContent = "Готовлю файл…";
    exportWord()
      .catch(function (err) {
        console.error("[word-export]", err);
        label.textContent = "⚠️ Не удалось";
        setTimeout(function () {
          label.textContent = original;
        }, 2000);
        return;
      })
      .then(function () {
        if (label.textContent === "Готовлю файл…") label.textContent = original;
        btn.disabled = false;
      });
  });
})();
