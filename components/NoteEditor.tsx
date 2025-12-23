
import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Edit, Eye } from 'lucide-react';
import { VaultItem } from '../types';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

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

  const getHtml = () => {
    const rawHtml = marked.parse(note.content || '') as string;
    return { __html: DOMPurify.sanitize(rawHtml) };
  };

  return (
    <div className="flex flex-col h-full bg-black">
      <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-black z-20 shrink-0">
        <div className="flex bg-zinc-950 p-1 border border-white/10">
          <button 
            onClick={() => setMode('edit')} 
            className={`flex items-center space-x-2 px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'edit' ? 'bg-white text-black' : 'text-zinc-600 hover:text-white'}`}
          >
            <Edit size={12} />
            <span>Edit</span>
          </button>
          <button 
            onClick={() => setMode('preview')} 
            className={`flex items-center space-x-2 px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'preview' ? 'bg-white text-black' : 'text-zinc-600 hover:text-white'}`}
          >
            <Eye size={12} />
            <span>Read</span>
          </button>
        </div>

        <button 
          onClick={() => onDelete(note.id)} 
          className="p-3 text-zinc-800 hover:text-rose-600 transition-colors"
          title="Delete Buffer"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-black">
        <div className="max-w-4xl mx-auto px-8 py-16 lg:px-24 lg:py-20">
          {mode === 'edit' ? (
            <textarea
              ref={textareaRef}
              className="w-full h-full min-h-[70vh] bg-transparent text-zinc-300 font-mono text-lg md:text-xl leading-relaxed focus:outline-none resize-none caret-white placeholder:text-zinc-900"
              value={note.content || ''}
              onChange={(e) => onUpdate(e.target.value)}
              placeholder="// Start writing..."
              spellCheck={false}
            />
          ) : (
            <div 
              className="prose prose-invert prose-zinc max-w-none 
                prose-h1:text-4xl prose-h1:font-black prose-h1:uppercase prose-h1:tracking-tighter prose-h1:border-b prose-h1:border-white/10 prose-h1:pb-4 prose-h1:mb-10
                prose-h2:text-2xl prose-h2:font-black prose-h2:uppercase prose-h2:tracking-widest prose-h2:mt-12 prose-h2:mb-6
                prose-h3:text-lg prose-h3:font-black prose-h3:uppercase prose-h3:tracking-[0.2em] prose-h3:text-zinc-400
                prose-p:text-zinc-400 prose-p:text-lg prose-p:leading-[1.8] prose-p:font-light
                prose-strong:text-white prose-strong:font-bold
                prose-code:text-emerald-400 prose-code:bg-zinc-900 prose-code:px-1 prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
                prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-white/5 prose-pre:p-6
                prose-li:text-zinc-400 prose-li:font-light
                prose-a:text-white prose-a:underline prose-a:decoration-zinc-800 hover:prose-a:decoration-white transition-all"
              dangerouslySetInnerHTML={getHtml()} 
            />
          )}
        </div>
      </div>

      <div className="h-10 px-6 border-t border-white/5 flex items-center justify-between bg-black text-[9px] font-black uppercase tracking-[0.4em] text-zinc-800 shrink-0">
        <div className="flex items-center space-x-8">
          <span>{note.content?.length || 0} CHRS</span>
          <span>{note.content?.split(/\s+/).filter(Boolean).length || 0} WRDS</span>
        </div>
        <div className="hidden sm:block">
          REV: {new Date(note.lastModified).getTime().toString(36).toUpperCase()}
        </div>
      </div>
    </div>
  );
};

export default NoteEditor;
