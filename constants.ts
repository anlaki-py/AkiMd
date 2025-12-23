
import { VaultItem } from './types';

export const INITIAL_VAULT_ITEMS: Record<string, VaultItem> = {
  'root': {
    id: 'root',
    name: 'aki-vault',
    type: 'folder',
    children: ['welcome-md', 'projects-folder', 'journal-folder'],
    lastModified: Date.now(),
  },
  'welcome-md': {
    id: 'welcome-md',
    name: 'Welcome.md',
    type: 'markdown',
    parentId: 'root',
    content: `# Welcome to aki.md\n\nThis is your professional Obsidian-style workspace.\n\n## Features\n- **Professional Theme**: True black and white interface.\n- **Mobile First**: Fully responsive sidebar and editor.\n- **Offline First**: All data stays in your browser's local storage.\n\nStart typing to edit, or use the sidebar to navigate your vault.`,
    lastModified: Date.now(),
  },
  'projects-folder': {
    id: 'projects-folder',
    name: 'Projects',
    type: 'folder',
    parentId: 'root',
    children: ['project-a-md'],
    lastModified: Date.now(),
  },
  'project-a-md': {
    id: 'project-a-md',
    name: 'Project Alpha.md',
    type: 'markdown',
    parentId: 'projects-folder',
    content: `# Project Alpha\n\n- [ ] Design UI\n- [ ] Optimize for Mobile\n- [ ] Verify local storage persistence`,
    lastModified: Date.now(),
  },
  'journal-folder': {
    id: 'journal-folder',
    name: 'Journal',
    type: 'folder',
    parentId: 'root',
    children: [],
    lastModified: Date.now(),
  },
};
