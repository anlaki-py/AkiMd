
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Use process.cwd() to ensure we look for the vault relative to where the command is run
const VAULT_ROOT = path.resolve(process.cwd(), 'aki-vault');

const app = express();
const PORT = 3001;
const HOST = '0.0.0.0'; // Bind to all interfaces for maximum compatibility on Linux

app.use(cors());
app.use(bodyParser.json());

// Request Logger for debugging 404s
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Ensure vault exists and has at least one file
async function ensureVault() {
  try {
    await fs.access(VAULT_ROOT);
  } catch {
    console.log(`Creating initial vault directory at: ${VAULT_ROOT}`);
    await fs.mkdir(VAULT_ROOT, { recursive: true });
  }
  
  const files = await fs.readdir(VAULT_ROOT);
  if (files.length === 0) {
    await fs.writeFile(
      path.join(VAULT_ROOT, 'Welcome.md'), 
      '# Welcome to Aki\n\nThis is your professional workspace on Linux.\n\n- Files are stored in `./aki-vault/` \n- Edits are synced in real-time.'
    );
  }
}

async function scanDir(dirPath, relativePath = '') {
  const items = {};
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  
  const id = relativePath || 'root';
  const name = relativePath ? path.basename(relativePath) : 'aki-vault';
  
  items[id] = {
    id,
    name: name,
    type: 'folder',
    parentId: relativePath ? (path.dirname(relativePath) === '.' ? 'root' : path.dirname(relativePath)) : null,
    children: [],
    lastModified: (await fs.stat(dirPath)).mtimeMs
  };

  for (const entry of entries) {
    const entryRelativePath = relativePath ? path.join(relativePath, entry.name) : entry.name;
    const entryFullPath = path.join(VAULT_ROOT, entryRelativePath);

    if (entry.isDirectory()) {
      items[id].children.push(entryRelativePath);
      const subItems = await scanDir(entryFullPath, entryRelativePath);
      Object.assign(items, subItems);
    } else if (entry.name.endsWith('.md')) {
      const stats = await fs.stat(entryFullPath);
      const content = await fs.readFile(entryFullPath, 'utf-8');
      items[id].children.push(entryRelativePath);
      items[entryRelativePath] = {
        id: entryRelativePath,
        name: entry.name,
        type: 'markdown',
        parentId: id,
        content,
        lastModified: stats.mtimeMs
      };
    }
  }
  return items;
}

// API Routes
app.get('/api/vault', async (req, res) => {
  try {
    await ensureVault();
    const vault = await scanDir(VAULT_ROOT);
    res.json(vault);
  } catch (err) {
    console.error('Vault scan error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/save', async (req, res) => {
  const { id, content } = req.body;
  try {
    const fullPath = path.join(VAULT_ROOT, id);
    await fs.writeFile(fullPath, content, 'utf-8');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/create', async (req, res) => {
  const { parentId, name, type } = req.body;
  try {
    const relativePath = parentId === 'root' ? name : path.join(parentId, name);
    const fullPath = path.join(VAULT_ROOT, relativePath);
    
    if (type === 'folder') {
      await fs.mkdir(fullPath, { recursive: true });
    } else {
      await fs.writeFile(fullPath, '', 'utf-8');
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/delete', async (req, res) => {
  const { id } = req.body;
  try {
    const fullPath = path.join(VAULT_ROOT, id);
    await fs.rm(fullPath, { recursive: true, force: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback for debugging
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found on Aki Backend` });
});

app.listen(PORT, HOST, () => {
  console.log('------------------------------------');
  console.log(`AKI ENGINE ACTIVE: http://localhost:${PORT}`);
  console.log(`VAULT LOCATION: ${VAULT_ROOT}`);
  console.log('------------------------------------');
});
