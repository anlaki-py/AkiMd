
export type FileType = 'markdown' | 'image' | 'pdf' | 'folder';

export interface VaultItem {
  id: string;
  name: string;
  type: FileType;
  content?: string;
  parentId?: string;
  children?: string[];
  lastModified: number;
  tags?: string[];
  isPinned?: boolean;
}

export interface VaultState {
  items: Record<string, VaultItem>;
  activeItemId: string | null;
  sidebarOpen: boolean;
  lastBackup?: number;
}
