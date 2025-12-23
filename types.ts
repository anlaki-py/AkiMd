
export type FileType = 'markdown' | 'image' | 'pdf' | 'folder';

export interface VaultItem {
  id: string; // The relative path from the vault root
  name: string;
  type: FileType;
  content?: string;
  parentId?: string;
  children?: string[];
  lastModified: number;
}

export interface VaultState {
  items: Record<string, VaultItem>;
  activeItemId: string | null;
  sidebarOpen: boolean;
  vaultName: string;
}
