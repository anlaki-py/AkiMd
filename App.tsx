
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, PanelLeft, Plus, Download, Upload, Terminal, Command, HardDrive } from 'lucide-react';
import FileExplorer from './components/FileExplorer';
import NoteEditor from './components/NoteEditor';
import { VaultItem, VaultState } from './types';
import { INITIAL_VAULT_ITEMS } from './constants';

const STORAGE_KEY = 'aki_vault_v1_production';

const App: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving'>('idle');
  
  const [state, setState] = useState<VaultState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Vault corrupted, initializing fresh", e);
      }
    }
    return {
      items: INITIAL_VAULT_ITEMS,
      activeItemId: 'getting-started-md',
      sidebarOpen: window.innerWidth > 1024,
    };
  });

  const persistState = useCallback((newState: VaultState) => {
    setStatus('saving');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    setTimeout(() => setStatus('idle'), 600);
  }, []);

  useEffect(() => {
    persistState(state);
  }, [state, persistState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="SEARCH"]') as HTMLInputElement;
        searchInput?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        handleCreateNote();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        persistState(state);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state]);

  const activeNote = state.activeItemId ? state.items[state.activeItemId] : null;

  const handleUpdateNote = (content: string) => {
    if (!state.activeItemId) return;
    setState(prev => ({
      ...prev,
      items: {
        ...prev.items,
        [state.activeItemId!]: {
          ...prev.items[state.activeItemId!],
          content,
          lastModified: Date.now(),
        }
      }
    }));
  };

  const handleCreateNote = (parentId: string = 'root') => {
    const id = `note-${Date.now()}`;
    const newNote: VaultItem = {
      id,
      name: 'Untitled.md',
      type: 'markdown',
      parentId,
      content: '',
      lastModified: Date.now(),
    };

    setState(prev => {
      const parent = prev.items[parentId] || prev.items['root'];
      const updatedParent = { ...parent, children: [...(parent.children || []), id] };
      return {
        ...prev,
        items: { ...prev.items, [parent.id]: updatedParent, [id]: newNote },
        activeItemId: id,
        sidebarOpen: window.innerWidth < 768 ? false : prev.sidebarOpen
      };
    });
  };

  const handleCreateFolder = (parentId: string = 'root') => {
    const id = `folder-${Date.now()}`;
    const newFolder: VaultItem = {
      id,
      name: 'New Folder',
      type: 'folder',
      parentId,
      children: [],
      lastModified: Date.now(),
    };
    setState(prev => {
      const parent = prev.items[parentId] || prev.items['root'];
      return {
        ...prev,
        items: {
          ...prev.items,
          [parent.id]: { ...parent, children: [...(parent.children || []), id] },
          [id]: newFolder
        }
      };
    });
  };

  const handleDeleteItem = (id: string) => {
    if (id === 'root') return;
    if (!confirm('Permanently delete this item?')) return;

    setState(prev => {
      const newItems = { ...prev.items };
      const recursiveDelete = (itemId: string) => {
        const item = newItems[itemId];
        if (item?.children) item.children.forEach(recursiveDelete);
        delete newItems[itemId];
      };
      const item = prev.items[id];
      if (item.parentId && newItems[item.parentId]) {
        newItems[item.parentId].children = newItems[item.parentId].children?.filter(c => c !== id);
      }
      recursiveDelete(id);
      return { ...prev, items: newItems, activeItemId: null };
    });
  };

  const handleExportVault = () => {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aki-vault-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportVault = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target?.result as string);
        if (imported.items && imported.items.root) {
          setState(imported);
        }
      } catch (err) {
        alert('Invalid Vault Archive.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex h-screen w-screen bg-black text-white font-sans overflow-hidden">
      <aside 
        className={`fixed md:relative z-50 h-full bg-black border-r border-white/10 transition-all duration-200
          ${state.sidebarOpen ? 'w-[85vw] md:w-72 translate-x-0' : '-translate-x-full md:w-0'}`}
      >
        <div className="flex flex-col h-full w-full">
          <div className="h-16 px-6 border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
               <div className="w-6 h-6 bg-white flex items-center justify-center">
                  <span className="text-black font-black text-[10px]">AKI</span>
               </div>
               <span className="font-bold tracking-tighter text-base uppercase">Vault</span>
            </div>
            <button onClick={() => setState(s => ({...s, sidebarOpen: false}))} className="md:hidden p-2 text-zinc-500 hover:text-white">
              <X size={18} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
             <FileExplorer 
                items={state.items} 
                activeId={state.activeItemId}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onSelectItem={(id) => setState(p => ({ ...p, activeItemId: id }))}
                onNewFile={handleCreateNote}
                onNewFolder={handleCreateFolder}
                onRenameItem={(id, name) => setState(prev => ({
                  ...prev,
                  items: { ...prev.items, [id]: { ...prev.items[id], name, lastModified: Date.now() } }
                }))}
             />
          </div>

          <div className="p-4 border-t border-white/10 bg-zinc-950/20 space-y-1">
            <button onClick={handleExportVault} className="w-full flex items-center px-4 py-3 text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-white hover:bg-white/5 transition-all">
              <Download size={12} className="mr-3" /> Export Vault
            </button>
            <label className="w-full flex items-center px-4 py-3 text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-white hover:bg-white/5 cursor-pointer transition-all">
              <Upload size={12} className="mr-3" /> Import Archive
              <input type="file" className="hidden" onChange={handleImportVault} accept=".json" />
            </label>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-black relative">
        <div className="h-16 flex items-center px-6 border-b border-white/10 bg-black z-40 shrink-0">
          <button 
            onClick={() => setState(p => ({...p, sidebarOpen: !p.sidebarOpen}))}
            className="p-2 text-zinc-500 hover:text-white transition-colors mr-4"
          >
            <PanelLeft size={20} />
          </button>
          
          <div className="flex-1 flex items-center space-x-4 overflow-hidden">
            <div className="hidden sm:flex items-center text-[10px] font-bold text-zinc-600 uppercase tracking-widest space-x-2">
               <Terminal size={12} />
               <span className="truncate">/ workspace / {activeNote?.name || 'idle'}</span>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className={`flex items-center space-x-2 text-[9px] font-black uppercase tracking-widest transition-opacity duration-300 ${status === 'idle' ? 'opacity-0' : 'opacity-100'}`}>
               <div className="w-1 h-1 bg-white animate-pulse" />
               <span className="text-zinc-500">Auto-Sync</span>
            </div>
            
            <button 
              onClick={() => handleCreateNote()}
              className="flex items-center px-6 h-10 bg-white text-black font-black text-[10px] uppercase tracking-[0.2em] hover:bg-zinc-200 transition-colors"
            >
              <Plus size={14} className="mr-2" /> New Note
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {activeNote && activeNote.type === 'markdown' ? (
            <NoteEditor 
              key={activeNote.id}
              note={activeNote} 
              onUpdate={handleUpdateNote}
              onDelete={handleDeleteItem}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center space-y-8 opacity-10">
              <HardDrive size={64} strokeWidth={1} />
              <div className="text-center space-y-2">
                <p className="text-[11px] font-black uppercase tracking-[0.6em]">System Standby</p>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em]">Select an object from the directory</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
