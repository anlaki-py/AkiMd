
export type FileType = 'markdown' | 'image' | 'pdf' | 'folder';

export interface VaultItem {
  id: string;
  name: string;
  type: FileType;
  content?: string;
  parentId?: string;
  children?: string[]; // IDs of children
  lastModified: number;
}

export interface VaultState {
  items: Record<string, VaultItem>;
  activeItemId: string | null;
  sidebarOpen: boolean;
}
