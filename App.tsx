
import React, { useState, useEffect, useCallback } from 'react';
import { X, PanelLeft, Plus, Terminal, Command, HardDrive, FolderOpen, RefreshCcw, Activity } from 'lucide-react';
import FileExplorer from './components/FileExplorer';
import NoteEditor from './components/NoteEditor';
import { VaultItem, VaultState } from './types';
import { INITIAL_VAULT_ITEMS } from './constants';

const App: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState<'idle' | 'syncing' | 'loading' | 'error'>('idle');
  const [vaultHandle, setVaultHandle] = useState<FileSystemDirectoryHandle | null>(null);
  
  const [state, setState] = useState<VaultState>({
    items: INITIAL_VAULT_ITEMS,
    activeItemId: null,
    sidebarOpen: window.innerWidth > 1024,
    vaultName: 'aki-vault'
  });

  const activeNote = state.activeItemId ? state.items[state.activeItemId] : null;

  // Optimized recursive scan for Linux directory structures
  const scanDirectory = async (dirHandle: FileSystemDirectoryHandle, parentId: string = 'root'): Promise<Record<string, VaultItem>> => {
    const items: Record<string, VaultItem> = {};
    const childrenIds: string[] = [];

    try {
      for await (const entry of dirHandle.values()) {
        const id = `${parentId}/${entry.name}`;
        
        if (entry.kind === 'file') {
          if (entry.name.endsWith('.md')) {
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

      if (parentId === 'root') {
        items['root'] = {
          ...INITIAL_VAULT_ITEMS['root'],
          children: childrenIds,
          handle: dirHandle
        };
      }
    } catch (err) {
      console.error("Directory scan interrupted", err);
      setStatus('error');
    }

    return items;
  };

  const handleConnectVault = async () => {
    if (!('showDirectoryPicker' in window)) {
      alert("Your browser does not support the File System Access API. Please use a Chromium-based browser on Linux (Chrome/Edge/Brave).");
      return;
    }

    try {
      setStatus('loading');
      const handle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
        id: 'aki-vault-linux'
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
      console.error("Vault access denied or cancelled", err);
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

    try {
      setStatus('syncing');
      const fileHandle = item.handle as FileSystemFileHandle;
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      setTimeout(() => setStatus('idle'), 300);
    } catch (err) {
      console.error("Disk write failure", err);
      setStatus('error');
    }
  };

  const handleCreateNote = async (parentId: string = 'root') => {
    if (!vaultHandle) return;
    const parent = state.items[parentId];
    const targetHandle = (parent?.handle || vaultHandle) as FileSystemDirectoryHandle;

    try {
      const fileName = `note-${Date.now().toString().slice(-6)}.md`;
      const newFileHandle = await targetHandle.getFileHandle(fileName, { create: true });
      await refreshVault();
      
      const newId = parentId === 'root' ? `root/${fileName}` : `${parentId}/${fileName}`;
      setState(prev => ({ ...prev, activeItemId: newId }));
    } catch (err) {
      console.error("Creation failed", err);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (id === 'root') return;
    const item = state.items[id];
    if (!item || !item.parentId) return;
    const parent = state.items[item.parentId];
    if (!parent || !parent.handle) return;

    if (!confirm(`Confirm PERMANENT DELETION of: ${item.name}`)) return;

    try {
      const parentHandle = parent.handle as FileSystemDirectoryHandle;
      await parentHandle.removeEntry(item.name, { recursive: true });
      await refreshVault();
      setState(prev => ({ ...prev, activeItemId: null }));
    } catch (err) {
      console.error("Deletion failed", err);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-black text-white font-sans overflow-hidden selection:bg-white selection:text-black">
      {/* Sidebar Overlay for Mobile */}
      {!state.sidebarOpen && (
        <button 
          onClick={() => setState(p => ({...p, sidebarOpen: true}))}
          className="fixed left-4 bottom-4 z-50 p-4 bg-white text-black md:hidden"
        >
          <PanelLeft size={20} />
        </button>
      )}

      <aside 
        className={`fixed md:relative z-50 h-full bg-black border-r border-white/10 transition-all duration-300 ease-in-out
          ${state.sidebarOpen ? 'w-[85vw] md:w-80 translate-x-0' : '-translate-x-full md:w-0'}`}
      >
        <div className="flex flex-col h-full w-full overflow-hidden">
          <div className="h-20 px-6 border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-4">
               <div className="w-8 h-8 bg-white flex items-center justify-center">
                  <span className="text-black font-black text-xs">AKI</span>
               </div>
               <div className="flex flex-col">
                 <span className="font-black tracking-tighter text-sm uppercase leading-none">{state.vaultName}</span>
                 <span className="text-[8px] font-bold text-zinc-600 tracking-widest mt-1 uppercase">Local Mount</span>
               </div>
            </div>
            <button onClick={() => setState(s => ({...s, sidebarOpen: false}))} className="p-2 text-zinc-500 hover:text-white transition-colors">
              <X size={20} />
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
                onNewFolder={() => {}} 
                onRenameItem={() => {}} 
              />
            ) : (
              <div className="p-10 space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-zinc-800">
                    <Activity size={14} />
                    <span className="text-[9px] font-black uppercase tracking-[0.3em]">System Offline</span>
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-500 leading-relaxed">
                    Aki requires manual mounting to access your local filesystem on Linux.
                  </p>
                </div>
                <button 
                  onClick={handleConnectVault}
                  className="w-full py-5 bg-white text-black font-black text-[10px] uppercase tracking-[0.3em] hover:bg-zinc-200 transition-all flex items-center justify-center space-x-3 group"
                >
                  <FolderOpen size={16} className="group-hover:scale-110 transition-transform" />
                  <span>Mount System Vault</span>
                </button>
              </div>
            )}
          </div>

          {vaultHandle && (
            <div className="p-6 border-t border-white/10 bg-zinc-950/40">
              <button 
                onClick={refreshVault}
                className="w-full flex items-center justify-center px-4 py-4 text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500 border border-white/5 hover:border-white/20 hover:text-white transition-all"
              >
                <RefreshCcw size={12} className={`mr-4 ${status === 'loading' ? 'animate-spin' : ''}`} /> Index Local Files
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-black relative">
        <div className="h-20 flex items-center px-8 border-b border-white/10 bg-black z-40 shrink-0">
          <div className="flex-1 flex items-center space-x-6 overflow-hidden">
            <div className="flex items-center text-[10px] font-black text-zinc-700 uppercase tracking-[0.4em] space-x-3">
               <Terminal size={14} className="text-zinc-800" />
               <span className="truncate">fs://{state.vaultName}{activeNote ? `/${activeNote.name}` : ''}</span>
            </div>
          </div>

          <div className="flex items-center space-x-8">
            <div className={`flex items-center space-x-3 transition-all duration-300 ${status === 'idle' ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}>
               <div className={`w-1.5 h-1.5 bg-white ${status === 'syncing' ? 'animate-ping' : 'animate-pulse'}`} />
               <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400">
                 {status === 'syncing' ? 'Writing...' : status === 'loading' ? 'Indexing...' : status === 'error' ? 'FS Error' : ''}
               </span>
            </div>
            
            <button 
              disabled={!vaultHandle}
              onClick={() => handleCreateNote()}
              className="flex items-center px-8 h-12 bg-white text-black font-black text-[10px] uppercase tracking-[0.3em] hover:bg-zinc-200 transition-all disabled:opacity-5 disabled:grayscale"
            >
              <Plus size={16} className="mr-3" /> Note
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
            <div className="h-full flex flex-col items-center justify-center space-y-12">
              <div className="relative">
                <HardDrive size={80} strokeWidth={0.5} className="text-zinc-900" />
                {vaultHandle && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white/5 animate-ping rounded-full" />}
              </div>
              <div className="text-center space-y-4">
                <p className="text-[12px] font-black uppercase tracking-[0.8em] text-zinc-800">
                  {vaultHandle ? 'Kernel Awaiting Input' : 'System Halted'}
                </p>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600 max-w-xs mx-auto leading-relaxed">
                  {vaultHandle 
                    ? 'Select a document buffer from the directory tree to initialize the workspace.' 
                    : 'Mount your local Linux aki-vault directory to establish a filesystem link.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
