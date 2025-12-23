import React, { useState, useEffect } from 'react';
import { Menu, X, Search, Settings, PanelLeft, Plus, FileText, Folder } from 'lucide-react';
import FileExplorer from './components/FileExplorer';
import NoteEditor from './components/NoteEditor';
import { VaultItem, VaultState } from './types';
import { INITIAL_VAULT_ITEMS } from './constants';

const STORAGE_KEY = 'aki_vault_state';

const App: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [state, setState] = useState<VaultState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse vault", e);
      }
    }
    return {
      items: INITIAL_VAULT_ITEMS,
      activeItemId: 'welcome-md',
      sidebarOpen: window.innerWidth > 768,
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768 && !state.sidebarOpen) {
        setState(prev => ({ ...prev, sidebarOpen: true }));
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [state.sidebarOpen]);

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

  const handleRenameItem = (id: string, newName: string) => {
    setState(prev => ({
      ...prev,
      items: {
        ...prev.items,
        [id]: { ...prev.items[id], name: newName, lastModified: Date.now() }
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
      const parent = prev.items[parentId];
      const updatedParent = {
        ...parent,
        children: [...(parent.children || []), id]
      };

      return {
        ...prev,
        items: {
          ...prev.items,
          [parentId]: updatedParent,
          [id]: newNote
        },
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
      const parent = prev.items[parentId];
      const updatedParent = {
        ...parent,
        children: [...(parent.children || []), id]
      };

      return {
        ...prev,
        items: {
          ...prev.items,
          [parentId]: updatedParent,
          [id]: newFolder
        }
      };
    });
  };

  const handleDeleteNote = (id: string) => {
    if (id === 'root') return;
    const itemToDelete = state.items[id];
    const confirmMsg = itemToDelete.type === 'folder' 
      ? `Delete folder "${itemToDelete.name}" and all its contents?` 
      : `Delete this note permanently?`;
      
    if (!confirm(confirmMsg)) return;

    setState(prev => {
      const newItems = { ...prev.items };
      
      const recursiveDelete = (itemId: string) => {
        const item = newItems[itemId];
        if (!item) return;
        if (item.type === 'folder' && item.children) {
          item.children.forEach(childId => recursiveDelete(childId));
        }
        delete newItems[itemId];
      };

      const item = prev.items[id];
      if (item.parentId && newItems[item.parentId]) {
        const parent = newItems[item.parentId];
        newItems[item.parentId] = {
          ...parent,
          children: parent.children?.filter(cid => cid !== id) || []
        };
      }

      recursiveDelete(id);
      
      return { 
        ...prev, 
        items: newItems, 
        activeItemId: prev.activeItemId === id ? 'welcome-md' : prev.activeItemId 
      };
    });
  };

  const toggleSidebar = () => setState(p => ({ ...p, sidebarOpen: !p.sidebarOpen }));

  return (
    <div className="flex h-screen w-screen bg-black text-white font-sans overflow-hidden select-none md:select-auto">
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`fixed inset-0 bg-black/90 backdrop-blur-none z-40 md:hidden transition-all duration-300
          ${state.sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} 
        onClick={toggleSidebar}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside 
        className={`fixed md:relative z-50 h-full bg-black border-r border-white/10 transition-all duration-300 ease-in-out flex flex-col overflow-hidden
          ${state.sidebarOpen 
            ? 'w-[85vw] md:w-72 translate-x-0' 
            : '-translate-x-full md:translate-x-0 md:w-0'
          }`}
      >
        <div className="flex flex-col h-full w-full overflow-hidden shrink-0">
          <div className="h-16 px-6 border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-4">
               <div className="w-8 h-8 bg-white flex items-center justify-center">
                  <span className="text-black font-black text-sm">A</span>
               </div>
               <span className="font-bold tracking-tighter text-2xl uppercase">aki.md</span>
            </div>
            <button 
              onClick={toggleSidebar} 
              className="md:hidden text-zinc-500 hover:text-white transition-colors p-2"
            >
               <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pb-10">
             <FileExplorer 
                items={state.items} 
                activeId={state.activeItemId}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onSelectItem={(id) => {
                  setState(p => ({ 
                    ...p, 
                    activeItemId: id, 
                    sidebarOpen: window.innerWidth < 768 ? false : p.sidebarOpen 
                  }));
                }}
                onNewFile={handleCreateNote}
                onNewFolder={handleCreateFolder}
                onRenameItem={handleRenameItem}
             />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-black relative h-full">
        {/* Top Header Controls */}
        <div className="h-16 flex items-center px-4 border-b border-white/10 bg-black z-20 shrink-0">
          <button 
            onClick={toggleSidebar}
            className={`p-3 transition-all border border-transparent ${state.sidebarOpen && window.innerWidth < 768 ? 'border-white/10 text-white' : 'text-zinc-500 hover:text-white'}`}
          >
            {state.sidebarOpen && window.innerWidth < 768 ? <X size={20} /> : <PanelLeft size={20} />}
          </button>
          
          <div className="flex-1 min-w-0 flex items-center justify-center">
            {activeNote && window.innerWidth < 768 && (
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 truncate px-4">
                  {activeNote.name.replace('.md', '')}
               </span>
            )}
          </div>

          <button 
            onClick={() => handleCreateNote()}
            className="flex items-center justify-center px-6 h-10 bg-white text-black font-black text-[11px] uppercase tracking-widest hover:bg-zinc-200 transition-all active:translate-y-px"
          >
            <Plus size={16} />
            <span className="hidden md:inline ml-2">New Note</span>
          </button>
        </div>

        {/* Editor Wrapper */}
        <div className="flex-1 overflow-hidden relative">
          {activeNote && activeNote.type === 'markdown' ? (
            <NoteEditor 
              key={activeNote.id}
              note={activeNote} 
              searchQuery={searchQuery}
              onUpdate={handleUpdateNote}
              onDelete={handleDeleteNote}
            />
          ) : activeNote && activeNote.type === 'folder' ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-900 space-y-8 px-10 text-center">
              <div className="w-24 h-24 border border-zinc-900 flex items-center justify-center">
                 <Folder size={40} className="text-zinc-800" />
              </div>
              <div className="space-y-3">
                <p className="text-zinc-700 font-black tracking-[0.5em] uppercase text-xs">Directory Selected</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-800 max-w-[240px] leading-relaxed">"{activeNote.name}"</p>
                <div className="flex justify-center space-x-4 pt-4">
                   <button onClick={() => handleCreateNote(activeNote.id)} className="px-4 py-2 border border-zinc-800 text-[9px] uppercase tracking-widest text-zinc-600 hover:border-white hover:text-white">New File</button>
                   <button onClick={() => handleDeleteNote(activeNote.id)} className="px-4 py-2 border border-zinc-800 text-[9px] uppercase tracking-widest text-red-900/50 hover:border-red-500 hover:text-red-500">Delete Folder</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-900 space-y-8 px-10 text-center">
              <div className="w-24 h-24 border border-zinc-900 flex items-center justify-center">
                 <FileText size={40} className="text-zinc-800" />
              </div>
              <div className="space-y-3">
                <p className="text-zinc-700 font-black tracking-[0.5em] uppercase text-xs">System Idle</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-800 max-w-[240px] leading-relaxed">Vault connection stable. Awaiting document selection to initialize workspace.</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;