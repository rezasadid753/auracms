import express from 'express';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Ensure data directory exists for the database
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database setup
const db = new Database(path.join(dataDir, 'database.sqlite'));

try { db.exec("ALTER TABLE messages ADD COLUMN email_or_phone TEXT"); } catch (e) {}

try { db.exec("ALTER TABLE sections ADD COLUMN title_fa TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE sections ADD COLUMN description_fa TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE section_items ADD COLUMN title_fa TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE section_items ADD COLUMN description_fa TEXT"); } catch (e) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, link TEXT NOT NULL, icon TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS profiles (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, title TEXT NOT NULL, icon TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email_or_phone TEXT, text TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS files (id INTEGER PRIMARY KEY AUTOINCREMENT, message_id INTEGER, filename TEXT NOT NULL, original_name TEXT NOT NULL, size INTEGER NOT NULL, share_id TEXT, share_password TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(message_id) REFERENCES messages(id));
  CREATE TABLE IF NOT EXISTS file_clicks (id INTEGER PRIMARY KEY AUTOINCREMENT, file_id INTEGER NOT NULL, ip TEXT, clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(file_id) REFERENCES files(id));

  CREATE TABLE IF NOT EXISTS sections (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT, title_fa TEXT, description_fa TEXT, sort_order INTEGER DEFAULT 0);
  CREATE TABLE IF NOT EXISTS section_items (id INTEGER PRIMARY KEY AUTOINCREMENT, section_id INTEGER, title TEXT NOT NULL, description TEXT, title_fa TEXT, description_fa TEXT, url TEXT NOT NULL, type TEXT NOT NULL, sort_order INTEGER DEFAULT 0, FOREIGN KEY(section_id) REFERENCES sections(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS section_item_clicks (id INTEGER PRIMARY KEY AUTOINCREMENT, item_id INTEGER NOT NULL, ip TEXT, clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(item_id) REFERENCES section_items(id) ON DELETE CASCADE);
  
  CREATE TABLE IF NOT EXISTS public_uploads (id INTEGER PRIMARY KEY AUTOINCREMENT, filename TEXT NOT NULL, original_name TEXT NOT NULL, description TEXT, size INTEGER NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS public_upload_clicks (id INTEGER PRIMARY KEY AUTOINCREMENT, upload_id INTEGER NOT NULL, ip TEXT, clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(upload_id) REFERENCES public_uploads(id) ON DELETE CASCADE);
  
  CREATE TABLE IF NOT EXISTS admin_files (id INTEGER PRIMARY KEY AUTOINCREMENT, filename TEXT NOT NULL, original_name TEXT NOT NULL, size INTEGER NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS file_shares (id INTEGER PRIMARY KEY AUTOINCREMENT, file_id INTEGER, share_id TEXT NOT NULL UNIQUE, password TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(file_id) REFERENCES admin_files(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS share_clicks (id INTEGER PRIMARY KEY AUTOINCREMENT, share_id TEXT NOT NULL, ip TEXT, clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(share_id) REFERENCES file_shares(share_id) ON DELETE CASCADE);
  
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
`);

// Initialize default settings if empty
const defaultSettings = [
  { key: 'identity_name', value: 'Your Name' },
  { key: 'identity_name_fa', value: 'نام شما' },
  { key: 'identity_profession', value: 'Your Profession' },
  { key: 'identity_profession_fa', value: 'حرفه شما' },
  { key: 'identity_image', value: 'https://picsum.photos/seed/portfolio/200/200' },
  { key: 'language_mode', value: 'en' },
  { key: 'timezone', value: 'UTC' }
];
const existingSettings = db.prepare('SELECT COUNT(*) as count FROM settings').get() as any;
if (existingSettings.count === 0) {
  const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
  defaultSettings.forEach(s => insertSetting.run(s.key, s.value));
}

app.use(express.json());

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 1024 * 1024 * 1024 } });

// --- Rate Limiter (Brute-force protection) ---
const failedAttempts = new Map<string, { count: number, lockUntil: number }>();

const rateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown');
  const record = failedAttempts.get(ip);
  
  if (record && record.lockUntil > Date.now()) {
    const remaining = Math.ceil((record.lockUntil - Date.now()) / 1000 / 60);
    return res.status(429).json({ error: `Too many attempts. Try again in ${remaining} minutes.` });
  }
  
  // Clean up expired locks
  if (record && record.lockUntil <= Date.now()) {
    failedAttempts.delete(ip);
  }
  
  next();
};

const recordFailedAttempt = (ip: string) => {
  const record = failedAttempts.get(ip) || { count: 0, lockUntil: 0 };
  record.count += 1;
  if (record.count >= 5) {
    record.lockUntil = Date.now() + 15 * 60 * 1000; // Lock for 15 minutes after 5 failed attempts
  }
  failedAttempts.set(ip, record);
};

const clearFailedAttempt = (ip: string) => {
  failedAttempts.delete(ip);
};

// --- API Routes ---

// Settings
app.get('/api/settings', (req, res) => {
  const rows = db.prepare('SELECT * FROM settings').all();
  const settings = rows.reduce((acc: any, row: any) => ({ ...acc, [row.key]: row.value }), {});
  console.log('Returning settings:', settings);
  res.json(settings);
});

app.post('/api/settings', (req, res) => {
  console.log('Received settings update:', req.body);
  const { identity_name, identity_name_fa, identity_profession, identity_profession_fa, identity_image, language_mode, timezone } = req.body;
  const updateSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  
  if (identity_name !== undefined) {
    console.log('Saving identity_name:', identity_name);
    updateSetting.run('identity_name', identity_name);
  }
  if (identity_name_fa !== undefined) {
    console.log('Saving identity_name_fa:', identity_name_fa);
    updateSetting.run('identity_name_fa', identity_name_fa);
  }
  if (identity_profession !== undefined) {
    console.log('Saving identity_profession:', identity_profession);
    updateSetting.run('identity_profession', identity_profession);
  }
  if (identity_profession_fa !== undefined) {
    console.log('Saving identity_profession_fa:', identity_profession_fa);
    updateSetting.run('identity_profession_fa', identity_profession_fa);
  }
  if (identity_image !== undefined) updateSetting.run('identity_image', identity_image);
  if (language_mode !== undefined) updateSetting.run('language_mode', language_mode);
  if (timezone !== undefined) {
    console.log('Saving timezone:', timezone);
    updateSetting.run('timezone', timezone);
  }
  
  res.json({ success: true });
});

app.post('/api/verify-upload-password', rateLimiter, (req, res) => {
  const { password } = req.body;
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown');
  
  if (password === '2323') {
    clearFailedAttempt(ip);
    res.json({ success: true });
  } else {
    recordFailedAttempt(ip);
    res.status(403).json({ error: 'Invalid password' });
  }
});

app.post('/api/admin/login', rateLimiter, (req, res) => {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown');
  if (req.body.password === '1212') {
    clearFailedAttempt(ip);
    res.json({ success: true });
  } else {
    recordFailedAttempt(ip);
    res.status(401).json({ error: 'Incorrect password' });
  }
});

// Projects & Profiles (Legacy)
app.get('/api/projects', (req, res) => res.json(db.prepare('SELECT * FROM projects').all()));
app.post('/api/projects', (req, res) => {
  const info = db.prepare('INSERT INTO projects (title, link, icon) VALUES (?, ?, ?)').run(req.body.title, req.body.link, req.body.icon);
  res.json({ id: info.lastInsertRowid });
});
app.delete('/api/projects/:id', (req, res) => { db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id); res.json({ success: true }); });

app.get('/api/profiles', (req, res) => res.json(db.prepare('SELECT * FROM profiles').all()));
app.post('/api/profiles', (req, res) => {
  const info = db.prepare('INSERT INTO profiles (name, title, icon) VALUES (?, ?, ?)').run(req.body.name, req.body.title, req.body.icon);
  res.json({ id: info.lastInsertRowid });
});
app.delete('/api/profiles/:id', (req, res) => { db.prepare('DELETE FROM profiles WHERE id = ?').run(req.params.id); res.json({ success: true }); });

// Dynamic Sections
app.get('/api/sections', (req, res) => {
  const sections = db.prepare('SELECT * FROM sections ORDER BY sort_order ASC, id ASC').all();
  const items = db.prepare('SELECT * FROM section_items ORDER BY sort_order ASC, id ASC').all();
  const clicks = db.prepare('SELECT item_id, COUNT(*) as count FROM section_item_clicks GROUP BY item_id').all();
  
  const itemsWithClicks = items.map((i: any) => ({
    ...i,
    clicks: clicks.find((c: any) => c.item_id === i.id)?.count || 0
  }));

  res.json(sections.map((s: any) => ({ ...s, items: itemsWithClicks.filter((i: any) => i.section_id === s.id) })));
});
app.post('/api/sections', (req, res) => {
  const info = db.prepare('INSERT INTO sections (title, description, title_fa, description_fa) VALUES (?, ?, ?, ?)').run(req.body.title, req.body.description || null, req.body.title_fa || null, req.body.description_fa || null);
  res.json({ id: info.lastInsertRowid });
});
app.delete('/api/sections/:id', (req, res) => {
  db.prepare('DELETE FROM sections WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});
app.put('/api/sections/:id', (req, res) => {
  db.prepare('UPDATE sections SET title = ?, description = ?, title_fa = ?, description_fa = ? WHERE id = ?').run(req.body.title, req.body.description || null, req.body.title_fa || null, req.body.description_fa || null, req.params.id);
  res.json({ success: true });
});
app.post('/api/section-items', (req, res) => {
  const { section_id, title, description, title_fa, description_fa, url, type } = req.body;
  const info = db.prepare('INSERT INTO section_items (section_id, title, description, title_fa, description_fa, url, type) VALUES (?, ?, ?, ?, ?, ?, ?)').run(section_id, title, description || null, title_fa || null, description_fa || null, url, type);
  res.json({ id: info.lastInsertRowid });
});
app.delete('/api/section-items/:id', (req, res) => {
  db.prepare('DELETE FROM section_items WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});
app.put('/api/section-items/:id', (req, res) => {
  const { title, description, title_fa, description_fa, url, type } = req.body;
  db.prepare('UPDATE section_items SET title = ?, description = ?, title_fa = ?, description_fa = ?, url = ?, type = ? WHERE id = ?')
    .run(title, description || null, title_fa || null, description_fa || null, url, type, req.params.id);
  res.json({ success: true });
});

app.get('/api/go/:id', (req, res) => {
  const item = db.prepare('SELECT url FROM section_items WHERE id = ?').get(req.params.id) as any;
  if (item) {
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown');
    db.prepare('INSERT INTO section_item_clicks (item_id, ip) VALUES (?, ?)').run(req.params.id, ip);
    
    let targetUrl = item.url;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }
    res.redirect(targetUrl);
  } else {
    res.status(404).send('Link not found');
  }
});

app.get('/api/section-items/:id/clicks', (req, res) => {
  res.json(db.prepare('SELECT * FROM section_item_clicks WHERE item_id = ? ORDER BY clicked_at DESC').all(req.params.id));
});

app.delete('/api/section-items/:id/clicks', (req, res) => {
  db.prepare('DELETE FROM section_item_clicks WHERE item_id = ?').run(req.params.id);
  res.json({ success: true });
});

// Public Uploads (Links Section)
app.get('/api/public-uploads', (req, res) => {
  const uploads = db.prepare('SELECT * FROM public_uploads ORDER BY created_at DESC').all();
  const clicks = db.prepare('SELECT upload_id, COUNT(*) as count FROM public_upload_clicks GROUP BY upload_id').all();
  res.json(uploads.map((u: any) => ({
    ...u,
    clicks: clicks.find((c: any) => c.upload_id === u.id)?.count || 0
  })));
});
app.post('/api/public-uploads', upload.single('file'), rateLimiter, (req, res) => {
  const { password, description } = req.body;
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown');
  
  if (password !== '2323') {
    recordFailedAttempt(ip);
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(403).json({ error: 'Invalid password' });
  }
  
  clearFailedAttempt(ip);
  if (!req.file) return res.status(400).json({ error: 'No file provided' });
  const info = db.prepare('INSERT INTO public_uploads (filename, original_name, description, size) VALUES (?, ?, ?, ?)').run(req.file.filename, req.file.originalname, description || null, req.file.size);
  res.json({ success: true, id: info.lastInsertRowid });
});

app.delete('/api/public-uploads/:id', (req, res) => {
  const file = db.prepare('SELECT filename FROM public_uploads WHERE id = ?').get(req.params.id) as any;
  if (file) {
    try { fs.unlinkSync(path.join(uploadsDir, file.filename)); } catch(e) {}
    db.prepare('DELETE FROM public_uploads WHERE id = ?').run(req.params.id);
  }
  res.json({ success: true });
});

app.get('/api/public-uploads/:id/download', (req, res) => {
  const upload = db.prepare('SELECT * FROM public_uploads WHERE id = ?').get(req.params.id) as any;
  if (upload) {
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown');
    db.prepare('INSERT INTO public_upload_clicks (upload_id, ip) VALUES (?, ?)').run(req.params.id, ip);
    const filePath = path.join(uploadsDir, upload.filename);
    if (fs.existsSync(filePath)) res.download(filePath, upload.original_name);
    else res.status(404).send('File not found on disk');
  } else {
    res.status(404).send('Upload not found');
  }
});

app.get('/api/public-uploads/:id/clicks', (req, res) => {
  res.json(db.prepare('SELECT * FROM public_upload_clicks WHERE upload_id = ? ORDER BY clicked_at DESC').all(req.params.id));
});

app.delete('/api/public-uploads/:id/clicks', (req, res) => {
  db.prepare('DELETE FROM public_upload_clicks WHERE upload_id = ?').run(req.params.id);
  res.json({ success: true });
});

// Contact Messages
app.post('/api/messages', upload.single('file'), rateLimiter, (req, res) => {
  const { name, emailOrPhone, text, password } = req.body;
  const file = req.file;
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown');

  if (file && (file.size / (1024 * 1024)) > 500) {
    if (password !== '2323') {
      recordFailedAttempt(ip);
      fs.unlinkSync(file.path);
      return res.status(403).json({ error: 'Invalid password for large file.' });
    }
    clearFailedAttempt(ip);
  }

  const info = db.prepare('INSERT INTO messages (name, email_or_phone, text) VALUES (?, ?, ?)').run(name, emailOrPhone || null, text || null);
  if (file) {
    db.prepare('INSERT INTO files (message_id, filename, original_name, size) VALUES (?, ?, ?, ?)').run(info.lastInsertRowid, file.filename, file.originalname, file.size);
  }
  res.json({ success: true });
});

app.get('/api/admin/messages', (req, res) => {
  res.json(db.prepare(`
    SELECT m.*, f.id as file_id, f.original_name, f.size, f.share_id, f.share_password, f.filename
    FROM messages m LEFT JOIN files f ON m.id = f.message_id ORDER BY m.created_at DESC
  `).all());
});

app.delete('/api/messages/:id', (req, res) => {
  const file = db.prepare('SELECT filename FROM files WHERE message_id = ?').get(req.params.id) as any;
  if (file) {
    try { fs.unlinkSync(path.join(uploadsDir, file.filename)); } catch(e) {}
    db.prepare('DELETE FROM files WHERE message_id = ?').run(req.params.id);
  }
  db.prepare('DELETE FROM messages WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Admin File Manager
app.get('/api/admin/files', (req, res) => {
  const files = db.prepare('SELECT * FROM admin_files ORDER BY created_at DESC').all();
  const shares = db.prepare('SELECT * FROM file_shares').all();
  const clicks = db.prepare('SELECT share_id, COUNT(*) as count FROM share_clicks GROUP BY share_id').all();
  
  const sharesWithClicks = shares.map((s: any) => ({
    ...s, clicks: clicks.find((c: any) => c.share_id === s.share_id)?.count || 0
  }));

  res.json(files.map((f: any) => ({ ...f, shares: sharesWithClicks.filter(s => s.file_id === f.id) })));
});
app.post('/api/admin/files', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const info = db.prepare('INSERT INTO admin_files (filename, original_name, size) VALUES (?, ?, ?)').run(req.file.filename, req.file.originalname, req.file.size);
  res.json({ success: true, id: info.lastInsertRowid });
});
app.delete('/api/admin/files/:id', (req, res) => {
  const file = db.prepare('SELECT filename FROM admin_files WHERE id = ?').get(req.params.id) as any;
  if (file) {
    try { fs.unlinkSync(path.join(uploadsDir, file.filename)); } catch(e) {}
    db.prepare('DELETE FROM admin_files WHERE id = ?').run(req.params.id);
  }
  res.json({ success: true });
});

// Admin File Shares
app.post('/api/admin/files/:id/shares', (req, res) => {
  const shareId = crypto.randomBytes(6).toString('hex');
  db.prepare('INSERT INTO file_shares (file_id, share_id, password) VALUES (?, ?, ?)').run(req.params.id, shareId, req.body.password || null);
  res.json({ share_id: shareId });
});
app.delete('/api/admin/shares/:share_id', (req, res) => {
  db.prepare('DELETE FROM file_shares WHERE share_id = ?').run(req.params.share_id);
  res.json({ success: true });
});
app.get('/api/admin/shares/:share_id/clicks', (req, res) => {
  res.json(db.prepare('SELECT * FROM share_clicks WHERE share_id = ? ORDER BY clicked_at DESC').all(req.params.share_id));
});
app.delete('/api/admin/shares/:share_id/clicks', (req, res) => {
  db.prepare('DELETE FROM share_clicks WHERE share_id = ?').run(req.params.share_id);
  res.json({ success: true });
});

// Legacy Share Link generation (for messages)
app.post('/api/admin/files/:id/share', (req, res) => {
  const shareId = crypto.randomBytes(8).toString('hex');
  db.prepare('UPDATE files SET share_id = ?, share_password = ? WHERE id = ?').run(shareId, req.body.password || null, req.params.id);
  res.json({ share_id: shareId });
});
app.get('/api/admin/files/:id/clicks', (req, res) => {
  res.json(db.prepare('SELECT * FROM file_clicks WHERE file_id = ? ORDER BY clicked_at DESC').all(req.params.id));
});

// Direct Download (for public uploads & admin direct links)
app.get('/api/download/:filename', (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename);
  if (fs.existsSync(filePath)) res.download(filePath);
  else res.status(404).send('Not found');
});

// Shared Link Download
app.get('/api/share/:share_id', rateLimiter, (req, res) => {
  const { share_id } = req.params;
  const { password } = req.query;
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown');

  // Check new file_shares table
  const share = db.prepare('SELECT fs.*, af.filename, af.original_name FROM file_shares fs JOIN admin_files af ON fs.file_id = af.id WHERE fs.share_id = ?').get(share_id) as any;
  if (share) {
    if (share.password && share.password !== password) {
      recordFailedAttempt(ip);
      return res.status(401).send('Invalid password');
    }
    clearFailedAttempt(ip);
    db.prepare('INSERT INTO share_clicks (share_id, ip) VALUES (?, ?)').run(share_id, ip);
    return res.download(path.join(uploadsDir, share.filename), share.original_name);
  }

  // Check legacy files table
  const oldFile = db.prepare('SELECT * FROM files WHERE share_id = ?').get(share_id) as any;
  if (oldFile) {
    if (oldFile.share_password && oldFile.share_password !== password) {
      recordFailedAttempt(ip);
      return res.status(401).send('Invalid password');
    }
    clearFailedAttempt(ip);
    db.prepare('INSERT INTO file_clicks (file_id, ip) VALUES (?, ?)').run(oldFile.id, ip);
    return res.download(path.join(uploadsDir, oldFile.filename), oldFile.original_name);
  }

  res.status(404).send('File not found');
});

// Add HEAD endpoint for password checking
app.head('/api/share/:share_id', rateLimiter, (req, res) => {
  const { share_id } = req.params;
  const { password } = req.query;
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown');

  const share = db.prepare('SELECT password FROM file_shares WHERE share_id = ?').get(share_id) as any;
  if (share) {
    if (share.password && share.password !== password) {
      recordFailedAttempt(ip);
      return res.status(401).end();
    }
    clearFailedAttempt(ip);
    return res.status(200).end();
  }

  const oldFile = db.prepare('SELECT share_password FROM files WHERE share_id = ?').get(share_id) as any;
  if (oldFile) {
    if (oldFile.share_password && oldFile.share_password !== password) {
      recordFailedAttempt(ip);
      return res.status(401).end();
    }
    clearFailedAttempt(ip);
    return res.status(200).end();
  }

  res.status(404).end();
});

// Vite integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true, allowedHosts: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
  }
  app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://localhost:${PORT}`));
}

startServer();
