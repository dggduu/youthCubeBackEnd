import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ASSETS_DIR = path.join(__dirname, '..', 'assets');

/**
 * GET /static/:page
 *   /static/intro      -> 返回 ../assets/intro.html
 */
router.get('/static/:page', (req, res) => {
  const { page } = req.params;

  if (page.includes('..') || page.includes('/')) {
    return res.status(400).send('Invalid page name');
  }

  const filePath = path.join(ASSETS_DIR, `${page}.html`);

  res.sendFile(filePath, (err) => {
    if (err) {
      console.warn(`Static page not found: ${page}.html`);
      res.status(404).send('页面未找到');
    }
  });
});

export default router;