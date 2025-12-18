import express from 'express';
import db from '../database.js';

const router = express.Router();

// GET /sitemap.xml - Dynamic sitemap
router.get('/sitemap.xml', async (req, res) => {
    try {
        await db.read();

        const baseUrl = process.env.BASE_URL || 'https://school-21.uz';
        const currentDate = new Date().toISOString().split('T')[0];

        // Static pages
        const staticPages = [
            { loc: '/', changefreq: 'daily', priority: '1.0' },
            { loc: '/about.html', changefreq: 'monthly', priority: '0.8' },
            { loc: '/news.html', changefreq: 'daily', priority: '0.9' },
            { loc: '/schedule.html', changefreq: 'weekly', priority: '0.8' },
            { loc: '/team.html', changefreq: 'monthly', priority: '0.8' },
            { loc: '/faq.html', changefreq: 'monthly', priority: '0.7' }
        ];

        // Dynamic news pages
        const newsPages = (db.data.news || [])
            .filter(n => n.status === 'published')
            .map(n => ({
                loc: `/news.html?id=${n.id}`,
                lastmod: n.updatedAt ? new Date(n.updatedAt).toISOString().split('T')[0] : currentDate,
                changefreq: 'monthly',
                priority: '0.6'
            }));

        // Teachers page
        const teachersPages = (db.data.teachers || []).length > 0 ? [{
            loc: '/team.html',
            changefreq: 'monthly',
            priority: '0.7'
        }] : [];

        const allPages = [...staticPages, ...newsPages, ...teachersPages];

        // Build XML
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

        allPages.forEach(page => {
            xml += '  <url>\n';
            xml += `    <loc>${baseUrl}${page.loc}</loc>\n`;
            if (page.lastmod) {
                xml += `    <lastmod>${page.lastmod}</lastmod>\n`;
            }
            xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
            xml += `    <priority>${page.priority}</priority>\n`;
            xml += '  </url>\n';
        });

        xml += '</urlset>';

        res.header('Content-Type', 'application/xml');
        res.send(xml);
    } catch (error) {
        console.error('Sitemap generation error:', error);
        res.status(500).send('Error generating sitemap');
    }
});

// GET /robots.txt - Dynamic robots.txt
router.get('/robots.txt', (req, res) => {
    const baseUrl = process.env.BASE_URL || 'https://21idum.uz';

    const robotsTxt = `# Robots.txt for 21-IDUM School
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/admin/
Disallow: /login
Disallow: /api/auth/

# Crawl-delay for polite bots
Crawl-delay: 1

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml

# Popular search engines
User-agent: Googlebot
Allow: /

User-agent: Yandex
Allow: /

User-agent: Bingbot
Allow: /
`;

    res.header('Content-Type', 'text/plain');
    res.send(robotsTxt);
});

export default router;
