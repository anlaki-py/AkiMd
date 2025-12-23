
import { VaultItem } from './types';

export const INITIAL_VAULT_ITEMS: Record<string, VaultItem> = {
  'root': {
    id: 'root',
    name: 'aki-vault',
    type: 'folder',
    children: ['getting-started-md'],
    lastModified: Date.now(),
  },
  'getting-started-md': {
    id: 'getting-started-md',
    name: 'Getting Started.md',
    type: 'markdown',
    parentId: 'root',
    content: `# Aki.md Workspace\n\nWelcome to your local markdown vault. This environment is designed for high-performance note-taking with a professional, minimalist aesthetic.\n\n### Quick Start\n- **Cmd/Ctrl + N**: New Note\n- **Cmd/Ctrl + K**: Search Vault\n- **Cmd/Ctrl + S**: Manual Sync\n\nYour data is persisted in the browser's local storage. Use the **Backup** feature in the sidebar to export your vault as a JSON archive for portability.`,
    lastModified: Date.now(),
  }
};
