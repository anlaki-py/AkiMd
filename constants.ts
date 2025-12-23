
import { VaultItem } from './types';

// The root is strictly for the aki-vault directory
export const INITIAL_VAULT_ITEMS: Record<string, VaultItem> = {
  'root': {
    id: 'root',
    name: 'aki-vault',
    type: 'folder',
    children: [],
    lastModified: Date.now(),
  }
};
