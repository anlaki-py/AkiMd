
import React, { useState, useEffect, useCallback } from 'react';
import { X, PanelLeft, Plus, Terminal, Command, HardDrive, FolderOpen, RefreshCcw } from 'lucide-react';
import FileExplorer from './components/FileExplorer';
import NoteEditor from './components/NoteEditor';
import { VaultItem, VaultState } from './types';
import { INITIAL_VAULT_ITEMS } from './constants';

const App: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState<'idle' | 'syncing' | 'loading'>('idle');
  const [vaultHandle, setVaultHandle] = useState<FileSystemDirectoryHandle | null>(null);
  
  const [state, setState] = useState<VaultState>({
    items: INITIAL_VAULT_ITEMS,
    activeItemId: null,
    sidebarOpen: window.innerWidth > 1024,
    vaultName: 'aki-vault'
  });

  // Define activeNote to resolve "Cannot find name 'activeNote'" errors
  const activeNote = state.activeItemId ? state.items[state.activeItemId] : null;

  // Recursively scan the directory handle to build the internal vault state
  const scanDirectory = async (dirHandle: FileSystemDirectoryHandle, parentId: string = 'root'): Promise<Record<string, VaultItem>> => {
    const items: Record<string, VaultItem> = {};
    const childrenIds: string[] = [];

    for await (const entry of dirHandle.values()) {
      const id = `${parentId}/${entry.name}`;
      
      if (entry.kind === 'file') {
        if (entry.name.endsWith('.md')) {
          // Cast entry to FileSystemFileHandle to access getFile()
          const fileHandle = entry as FileSystemFileHandle;
          const file = await fileHandle.getFile();
          const content = await file.text();
          items[id] = {
            id,
            name: entry.name,
            type: 'markdown',
            parentId,
            content,
            lastModified: file.lastModified,
            handle: fileHandle
          };
          childrenIds.push(id);
        }
      } else if (entry.kind === 'directory') {
        // Cast entry to FileSystemDirectoryHandle for recursion
        const subDirHandle = entry as FileSystemDirectoryHandle;
        const subItems = await scanDirectory(subDirHandle, id);
        items[id] = {
          id,
          name: entry.name,
          type: 'folder',
          parentId,
          children: Object.keys(subItems).filter(key => subItems[key].parentId === id),
          lastModified: Date.now(),
          handle: subDirHandle
        };
        Object.assign(items, subItems);
        childrenIds.push(id);
      }
    }

    // Update the parent's children reference if it's the root we are building for
    if (parentId === 'root') {
      items['root'] = {
        ...INITIAL_VAULT_ITEMS['root'],
        children: childrenIds,
        handle: dirHandle
      };
    }

    return items;
  };

  const handleConnectVault = async () => {
    try {
      setStatus('loading');
      // Cast window to any to access showDirectoryPicker
      const handle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
        id: 'aki-vault-picker'
      });
      
      setVaultHandle(handle);
      const items = await scanDirectory(handle);
      
      setState(prev => ({
        ...prev,
        items,
        vaultName: handle.name,
        activeItemId: Object.keys(items).find(k => items[k].type === 'markdown') || null
      }));
      setStatus('idle');
    } catch (err) {
      console.error("Vault connection failed", err);
      setStatus('idle');
    }
  };

  const refreshVault = async () => {
    if (!vaultHandle) return;
    setStatus('loading');
    const items = await scanDirectory(vaultHandle);
    setState(prev => ({ ...prev, items }));
    setStatus('idle');
  };

  const handleUpdateNote = async (content: string) => {
    if (!state.activeItemId) return;
    const item = state.items[state.activeItemId];
    if (!item || !item.handle || item.type !== 'markdown') return;

    // Local state update
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

    // Real-time disk write
    try {
      setStatus('syncing');
      const fileHandle = item.handle as FileSystemFileHandle;
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      setTimeout(() => setStatus('idle'), 400);
    } catch (err) {
      console.error("Failed to write to disk", err);
      setStatus('idle');
    }
  };

  const handleCreateNote = async (parentId: string = 'root') => {
    if (!vaultHandle) return;
    const parent = state.items[parentId];
    if (!parent || !parent.handle) return;

    try {
      const fileName = `Untitled-${Date.now()}.md`;
      const dirHandle = parent.handle as FileSystemDirectoryHandle;
      await dirHandle.getFileHandle(fileName, { create: true });
      
      // Refresh to get the new state from disk
      await refreshVault();
      
      // Attempt to set the newly created file as active
      const newId = `${parentId}/${fileName}`;
      setState(prev => ({ ...prev, activeItemId: newId }));
    } catch (err) {
      console.error("Failed to create note", err);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (id === 'root') return;
    const item = state.items[id];
    if (!item || !item.parentId) return;
    const parent = state.items[item.parentId];
    if (!parent || !parent.handle) return;

    if (!confirm(`Permanently delete ${item.name} from disk?`)) return;

    try {
      const parentHandle = parent.handle as FileSystemDirectoryHandle;
      await parentHandle.removeEntry(item.name, { recursive: true });
      await refreshVault();
      setState(prev => ({ ...prev, activeItemId: null }));
    } catch (err) {
      console.error("Delete failed", err);
    }
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
               <span className="font-bold tracking-tighter text-base uppercase truncate">{state.vaultName}</span>
            </div>
            <button onClick={() => setState(s => ({...s, sidebarOpen: false}))} className="md:hidden p-2 text-zinc-500 hover:text-white">
              <X size={18} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {vaultHandle ? (
              <FileExplorer 
                items={state.items} 
                activeId={state.activeItemId}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onSelectItem={(id) => setState(p => ({ ...p, activeItemId: id }))}
                onNewFile={handleCreateNote}
                onNewFolder={() => {}} // Folder creation not implemented for brevity
                onRenameItem={() => {}} // FS Rename requires complex move logic
              />
            ) : (
              <div className="p-8 space-y-6">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 leading-relaxed">
                  Connect to your local aki-vault folder to begin processing documents.
                </p>
                <button 
                  onClick={handleConnectVault}
                  className="w-full py-4 bg-white text-black font-black text-[10px] uppercase tracking-widest hover:bg-zinc-200 transition-colors flex items-center justify-center space-x-2"
                >
                  <FolderOpen size={14} />
                  <span>Open Vault</span>
                </button>
              </div>
            )}
          </div>

          {vaultHandle && (
            <div className="p-4 border-t border-white/10 bg-zinc-950/20">
              <button 
                onClick={refreshVault}
                className="w-full flex items-center px-4 py-3 text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
              >
                <RefreshCcw size={12} className={`mr-3 ${status === 'loading' ? 'animate-spin' : ''}`} /> Sync Disk
              </button>
            </div>
          )}
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
               <span className="text-zinc-500">{status === 'syncing' ? 'Writing...' : 'Indexing...'}</span>
            </div>
            
            <button 
              disabled={!vaultHandle}
              onClick={() => handleCreateNote()}
              className="flex items-center px-6 h-10 bg-white text-black font-black text-[10px] uppercase tracking-[0.2em] hover:bg-zinc-200 transition-colors disabled:opacity-10"
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
              {vaultHandle ? (
                 <>
                  <HardDrive size={64} strokeWidth={1} />
                  <div className="text-center space-y-2">
                    <p className="text-[11px] font-black uppercase tracking-[0.6em]">Awaiting Instruction</p>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em]">Select a buffer from the sidebar</p>
                  </div>
                 </>
              ) : (
                <>
                  <Command size={64} strokeWidth={1} />
                  <div className="text-center space-y-2">
                    <p className="text-[11px] font-black uppercase tracking-[0.6em]">Kernel Halted</p>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em]">Connect a vault to initialize the environment</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
