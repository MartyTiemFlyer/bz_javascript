const pool = require('./db_pool');

async function attachSidebarData(req, res, next) {
  try {
    //console.log('>>> attachSidebarData called'); // временный лог
    const sectionsResult = await pool.query(`
      SELECT id, slug, title, icon
      FROM categories
      ORDER BY title
    `);

    const linksResult = await pool.query(`
      SELECT id, slug, title, category_id
      FROM pages
      ORDER BY title
    `);

    res.locals.sidebarSections = sectionsResult.rows.map(section => ({
      id: section.id,
      slug: section.slug,
      title: section.title,
      icon: section.icon,
      links: linksResult.rows
        .filter(link => link.category_id === section.id)
        .map(link => ({
          slug: link.slug,
          title: link.title
        }))
    }));
    //console.log('>>> sidebarSections set:', res.locals.sidebarSections.length); 

    next();
  } catch (err) {
    //console.error('>>> sidebar middleware error:', err);
    next(err);
  }
}

module.exports = attachSidebarData;