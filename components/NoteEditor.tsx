
import React, { useState, useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { VaultItem } from '../types';

interface NoteEditorProps {
  note: VaultItem;
  onUpdate: (content: string) => void;
  onDelete: (id: string) => void;
}

const NoteEditor: React.FC<NoteEditorProps> = ({ note, onUpdate, onDelete }) => {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (mode === 'edit') textareaRef.current?.focus();
  }, [note.id, mode]);

  const renderMarkdown = (text: string) => {
    if (!text) return <div className="text-center py-20 text-zinc-900 uppercase font-black tracking-widest text-[10px]">Null Pointer: Empty Buffer</div>;
    
    return text.split('\n').map((line, i) => {
      if (line.startsWith('# ')) return <h1 key={i} className="text-3xl font-black mb-8 mt-10 uppercase tracking-tighter border-b border-white/10 pb-4">{line.slice(2)}</h1>;
      if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-black mb-6 mt-8 uppercase tracking-widest border-l-4 border-white pl-6">{line.slice(3)}</h2>;
      if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-black mb-4 mt-6 uppercase tracking-[0.2em] text-zinc-300">{line.slice(4)}</h3>;
      if (line.startsWith('- ')) return <div key={i} className="flex space-x-3 mb-3 text-zinc-400 font-light"><span className="text-white">●</span><span>{line.slice(2)}</span></div>;
      if (line.trim() === '') return <div key={i} className="h-6" />;
      return <p key={i} className="mb-6 leading-[1.8] text-zinc-400 text-lg font-light tracking-tight">{line}</p>;
    });
  };

  return (
    <div className="flex flex-col h-full bg-black">
      <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-black z-20 shrink-0">
        <div className="flex bg-zinc-950 p-1 border border-white/10">
          <button 
            onClick={() => setMode('edit')} 
            className={`px-8 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'edit' ? 'bg-white text-black' : 'text-zinc-600 hover:text-white'}`}
          >
            Source
          </button>
          <button 
            onClick={() => setMode('preview')} 
            className={`px-8 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'preview' ? 'bg-white text-black' : 'text-zinc-600 hover:text-white'}`}
          >
            Render
          </button>
        </div>

        <button 
          onClick={() => onDelete(note.id)} 
          className="p-3 text-zinc-800 hover:text-red-600 transition-colors"
          title="Delete Buffer"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-black">
        <div className="max-w-4xl mx-auto px-8 py-16 md:px-24 md:py-28">
          {mode === 'edit' ? (
            <textarea
              ref={textareaRef}
              className="w-full h-full min-h-[75vh] bg-transparent text-zinc-300 font-mono text-lg md:text-xl leading-relaxed focus:outline-none resize-none caret-white placeholder:text-zinc-900"
              value={note.content || ''}
              onChange={(e) => onUpdate(e.target.value)}
              placeholder="// Initialize stream..."
              spellCheck={false}
            />
          ) : (
            <div className="prose prose-invert max-w-none">
              {renderMarkdown(note.content || '')}
            </div>
          )}
        </div>
      </div>

      <div className="h-10 px-6 border-t border-white/5 flex items-center justify-between bg-black text-[9px] font-black uppercase tracking-[0.4em] text-zinc-800 shrink-0">
        <div className="flex items-center space-x-8">
          <span>{note.content?.length || 0} OCTETS</span>
          <span>{note.content?.split(/\s+/).filter(Boolean).length || 0} BLOCKS</span>
        </div>
        <div className="hidden sm:block">
          MODIFIED: {new Date(note.lastModified).toISOString().replace('T', ' ').split('.')[0]}
        </div>
      </div>
    </div>
  );
};

export default NoteEditor;
