
import React, { useState, useRef, useEffect } from 'react';
import { Folder, FileText, ChevronRight, ChevronDown, Plus, Edit2, Search, X, FilePlus, FolderPlus } from 'lucide-react';
import { VaultItem } from '../types';

interface FileExplorerProps {
  items: Record<string, VaultItem>;
  activeId: string | null;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  onSelectItem: (id: string) => void;
  onNewFile: (parentId: string) => void;
  onNewFolder: (parentId: string) => void;
  onRenameItem: (id: string, newName: string) => void;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ 
  items, 
  activeId, 
  searchQuery, 
  setSearchQuery, 
  onSelectItem, 
  onNewFile, 
  onNewFolder,
  onRenameItem 
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const toggleFolder = (id: string) => {
    const next = new Set(expandedFolders);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedFolders(next);
  };

  const handleStartRename = (e: React.MouseEvent, item: VaultItem) => {
    e.stopPropagation();
    setEditingId(item.id);
    setEditValue(item.name);
  };

  const handleFinishRename = () => {
    if (editingId && editValue.trim()) {
      onRenameItem(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  const matchesSearch = (id: string): boolean => {
    if (!searchQuery) return true;
    const item = items[id];
    if (!item) return false;
    const query = searchQuery.toLowerCase();
    const nameMatches = item.name.toLowerCase().includes(query);
    if (nameMatches) return true;
    const contentMatches = item.type === 'markdown' && item.content?.toLowerCase().includes(query);
    if (contentMatches) return true;
    if (item.type === 'folder' && item.children) {
      return item.children.some(childId => matchesSearch(childId));
    }
    return false;
  };

  const highlightText = (text: string) => {
    if (!searchQuery) return text;
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <span key={i} className="bg-white text-black px-0.5">{part}</span>
      ) : part
    );
  };

  const renderItem = (id: string, depth: number = 0) => {
    const item = items[id];
    if (!item) return null;
    if (!matchesSearch(id)) return null;

    const isActive = activeId === id;
    const isExpanded = searchQuery ? true : expandedFolders.has(id);
    const isEditing = editingId === id;

    return (
      <div key={id} className="w-full">
        <div 
          className={`flex items-center group py-3 px-4 cursor-pointer border-l-2 transition-all
            ${isActive ? 'bg-zinc-900 border-white text-white' : 'border-transparent text-zinc-500 hover:bg-zinc-950 hover:text-zinc-300'}`}
          style={{ paddingLeft: `${depth * 16 + 16}px` }}
          onClick={() => {
            if (item.type === 'folder') toggleFolder(id);
            else onSelectItem(id);
          }}
        >
          <span className={`mr-3 w-4 h-4 flex items-center justify-center transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
            {item.type === 'folder' ? (
              <ChevronDown size={14} strokeWidth={3} />
            ) : (
              <div className={`w-1 h-1 ${isActive ? 'bg-white' : 'bg-zinc-800'}`} />
            )}
          </span>

          {isEditing ? (
            <input
              ref={editInputRef}
              className="bg-black text-white text-xs outline-none px-2 py-1 w-full border border-white/20 font-mono"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleFinishRename}
              onKeyDown={(e) => e.key === 'Enter' && handleFinishRename()}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <>
              <span className={`text-xs truncate flex-1 font-bold uppercase tracking-wider ${isActive ? 'text-white' : ''}`}>
                {highlightText(item.name)}
              </span>
              <div className={`flex items-center space-x-1 opacity-0 group-hover:opacity-100`}>
                <button 
                  onClick={(e) => handleStartRename(e, item)}
                  className="p-1.5 hover:bg-white hover:text-black transition-colors"
                  title="Rename"
                >
                  <Edit2 size={10} />
                </button>
                {item.type === 'folder' && (
                  <>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onNewFile(id); }}
                      className="p-1.5 hover:bg-white hover:text-black transition-colors"
                      title="New File"
                    >
                      <FilePlus size={12} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onNewFolder(id); }}
                      className="p-1.5 hover:bg-white hover:text-black transition-colors"
                      title="New Folder"
                    >
                      <FolderPlus size={12} />
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
        
        {item.type === 'folder' && isExpanded && item.children && (
          <div className="flex flex-col">
            {item.children.map(childId => renderItem(childId, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="py-0 select-none flex flex-col h-full">
      <div className="p-4 border-b border-white/10 sticky top-0 bg-black z-10 space-y-4">
        <div className="relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-white transition-colors">
            <Search size={14} />
          </div>
          <input 
            type="text"
            placeholder="SEARCH VAULT..."
            className="w-full bg-zinc-950 border border-white/10 text-white text-[10px] font-black uppercase tracking-[0.2em] pl-10 pr-10 py-3 focus:outline-none focus:border-white transition-all placeholder:text-zinc-800"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>
        
        <div className="flex border border-white/10">
          <button 
            onClick={() => onNewFile('root')}
            className="flex-1 flex items-center justify-center py-2 space-x-2 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:bg-white hover:text-black transition-all border-r border-white/10"
          >
            <FilePlus size={12} />
            <span>File</span>
          </button>
          <button 
            onClick={() => onNewFolder('root')}
            className="flex-1 flex items-center justify-center py-2 space-x-2 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:bg-white hover:text-black transition-all"
          >
            <FolderPlus size={12} />
            <span>Folder</span>
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex flex-col py-2">
          {renderItem('root')}
        </div>
        {searchQuery && Object.values(items).filter(i => i.id !== 'root' && matchesSearch(i.id)).length === 0 && (
          <div className="p-8 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-800">No matches found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileExplorer;
