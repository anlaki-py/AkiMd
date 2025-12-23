
import React, { useState, useEffect, useCallback } from 'react';
import { X, PanelLeft, Plus, Terminal, Command, HardDrive, RefreshCcw, ShieldAlert, Wifi, WifiOff } from 'lucide-react';
import FileExplorer from './components/FileExplorer';
import NoteEditor from './components/NoteEditor';
import { VaultItem, VaultState } from './types';
import { INITIAL_VAULT_ITEMS } from './constants';

const App: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState<'idle' | 'syncing' | 'loading' | 'error'>('loading');
  const [backendActive, setBackendActive] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  
  const [state, setState] = useState<VaultState>({
    items: INITIAL_VAULT_ITEMS,
    activeItemId: null,
    sidebarOpen: window.innerWidth > 1024,
    vaultName: 'aki-vault'
  });

  const activeNote = state.activeItemId ? state.items[state.activeItemId] : null;

  const fetchVault = useCallback(async () => {
    setStatus('loading');
    setErrorDetail(null);
    try {
      const response = await fetch('/api/vault');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      const items = await response.json();
      
      setState(prev => ({
        ...prev,
        items,
        activeItemId: prev.activeItemId && items[prev.activeItemId] 
          ? prev.activeItemId 
          : (Object.keys(items).find(k => items[k].type === 'markdown') || null)
      }));
      setBackendActive(true);
      setStatus('idle');
    } catch (err: any) {
      console.error('Fetch error:', err);
      setBackendActive(false);
      setStatus('error');
      setErrorDetail(err.message || 'Check if server.js is running on port 3001');
    }
  }, []);

  useEffect(() => {
    fetchVault();
  }, [fetchVault]);

  const handleUpdateNote = async (content: string) => {
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

    try {
      setStatus('syncing');
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: state.activeItemId, content })
      });
      if (!response.ok) throw new Error('Save failed');
      setTimeout(() => setStatus('idle'), 300);
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  const handleCreateNote = async (parentId: string = 'root') => {
    const name = `note-${Date.now().toString().slice(-4)}.md`;
    try {
      setStatus('loading');
      await fetch('/api/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId, name, type: 'file' })
      });
      await fetchVault();
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  const handleCreateFolder = async (parentId: string = 'root') => {
    const name = `folder-${Date.now().toString().slice(-4)}`;
    try {
      setStatus('loading');
      await fetch('/api/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId, name, type: 'folder' })
      });
      await fetchVault();
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (id === 'root') return;
    if (!confirm(`Permanently delete from Linux drive?`)) return;

    try {
      setStatus('loading');
      await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      setState(prev => ({ ...prev, activeItemId: null }));
      await fetchVault();
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  return (
    <div className="flex h-screen w-screen bg-black text-white font-sans overflow-hidden selection:bg-white selection:text-black">
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
                 <div className="flex items-center space-x-2 mt-1">
                   {backendActive ? <Wifi size={10} className="text-green-500" /> : <WifiOff size={10} className="text-red-500" />}
                   <span className={`text-[8px] font-bold tracking-widest uppercase ${backendActive ? 'text-zinc-600' : 'text-red-600'}`}>
                     {backendActive ? 'Engine Connected' : 'Engine Link Severed'}
                   </span>
                 </div>
               </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {backendActive ? (
              <FileExplorer 
                items={state.items} 
                activeId={state.activeItemId}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onSelectItem={(id) => setState(p => ({ ...p, activeItemId: id }))}
                onNewFile={handleCreateNote}
                onNewFolder={handleCreateFolder} 
                onRenameItem={() => {}} 
              />
            ) : (
              <div className="p-10 space-y-6">
                <ShieldAlert size={32} className="text-red-900" />
                <div className="space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-500 leading-relaxed">
                    Connection sequence failed. The Aki Node backend is unreachable.
                  </p>
                  {errorDetail && (
                    <div className="bg-zinc-950 p-4 border border-white/5 font-mono text-[9px] text-zinc-600 uppercase">
                      Error_Log: {errorDetail}
                    </div>
                  )}
                  <p className="text-[9px] text-zinc-700 italic">
                    Run `npm start` in your project root.
                  </p>
                </div>
                <button 
                  onClick={fetchVault}
                  className="w-full py-4 bg-white text-black font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center space-x-3 hover:bg-zinc-200 transition-colors"
                >
                  <RefreshCcw size={14} className={status === 'loading' ? 'animate-spin' : ''} />
                  <span>Retry Connection</span>
                </button>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-white/10 bg-zinc-950/40">
            <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-zinc-800">
              <span>Environment: Linux</span>
              <span>Buffer: 3001</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-black relative">
        <div className="h-20 flex items-center px-8 border-b border-white/10 bg-black z-40 shrink-0">
          <button 
            onClick={() => setState(p => ({...p, sidebarOpen: !p.sidebarOpen}))}
            className="p-2 text-zinc-500 hover:text-white transition-colors mr-6"
          >
            <PanelLeft size={20} />
          </button>
          
          <div className="flex-1 flex items-center space-x-6 overflow-hidden">
            <div className="flex items-center text-[10px] font-black text-zinc-700 uppercase tracking-[0.4em] space-x-3">
               <Terminal size={14} className="text-zinc-800" />
               <span className="truncate">fs://{state.vaultName}{activeNote ? `/${activeNote.id}` : ''}</span>
            </div>
          </div>

          <div className="flex items-center space-x-8">
            <div className={`flex items-center space-x-3 transition-all duration-300 ${status === 'idle' ? 'opacity-0' : 'opacity-100'}`}>
               <div className={`w-1.5 h-1.5 bg-white ${status === 'syncing' ? 'animate-ping' : 'animate-pulse'}`} />
               <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400">
                 {status === 'syncing' ? 'Disk Write' : status === 'loading' ? 'Indexing' : 'Error'}
               </span>
            </div>
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
                <Command size={80} strokeWidth={0.5} className="text-zinc-900" />
                {!backendActive && <div className="absolute inset-0 border border-red-900/20 animate-pulse scale-150 rounded-full" />}
              </div>
              <div className="text-center space-y-4">
                <p className="text-[12px] font-black uppercase tracking-[0.8em] text-zinc-800">
                  {backendActive ? 'Awaiting Instruction' : 'System Offline'}
                </p>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600 max-w-xs mx-auto leading-relaxed">
                  {backendActive 
                    ? 'Select a document buffer from the local vault to initialize the render engine.' 
                    : 'The connection to the Aki Node.js process was terminated. Verify your Linux environment status.'}
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
