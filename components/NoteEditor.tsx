import React, { useState, useEffect, useRef } from 'react';
import { Eye, Edit3, Clock, Trash2, FileText, X, Copy, Check, ChevronLeft, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import { VaultItem } from '../types';

interface NoteEditorProps {
  note: VaultItem;
  searchQuery: string;
  onUpdate: (content: string) => void;
  onDelete: (id: string) => void;
}

const CodeBlock: React.FC<{ content: string }> = ({ content }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-10 group bg-black border border-white/10">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-zinc-950/30">
        <div className="flex space-x-1.5">
          <div className="w-1.5 h-1.5 bg-zinc-800" />
          <div className="w-1.5 h-1.5 bg-zinc-800" />
          <div className="w-1.5 h-1.5 bg-zinc-800" />
        </div>
        <button
          onClick={handleCopy}
          className={`text-[9px] font-black uppercase tracking-[0.2em] transition-colors py-1 px-2 ${copied ? 'text-white' : 'text-zinc-600 hover:text-white'}`}
        >
          {copied ? 'Copied' : 'Copy_to_clip'}
        </button>
      </div>
      <div className="p-6 overflow-x-auto custom-scrollbar">
        <pre className="mono text-xs md:text-sm leading-relaxed text-zinc-300">
          <code>{content}</code>
        </pre>
      </div>
    </div>
  );
};

const NoteEditor: React.FC<NoteEditorProps> = ({ note, searchQuery, onUpdate, onDelete }) => {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightLayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchQuery) {
      const timer = setTimeout(() => {
        const firstMatch = (mode === 'preview' ? scrollContainerRef.current : highlightLayerRef.current)
          ?.querySelector('.search-highlight');
        
        if (firstMatch) {
          firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, mode]);

  const handleTextareaScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (highlightLayerRef.current) {
      highlightLayerRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const highlightText = (text: string) => {
    if (!searchQuery) return [text];
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <span key={i} className="search-highlight bg-white text-black font-bold mx-[1px]">{part}</span>
      ) : part
    );
  };

  const renderTerminalHighlights = (text: string) => {
    if (!searchQuery || !text) return text;
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <span key={i} className="search-highlight bg-white text-black font-bold">{part}</span>
      ) : (
        <span key={i} className="text-transparent">{part}</span>
      )
    );
  };

  const processInline = (text: string) => {
    if (!text) return "";
    
    // Pass 1: Handle Escaping of Markdown chars
    let processed = text.replace(/\\(\*|_|`|#|\[|\]|>|\||!)/g, '$1');

    // Pass 2: Identify HTML tags and split by them to avoid processing inside tags
    let parts: (string | React.ReactNode)[] = processed.split(/(<[\s\S]*?>)/g).map((part, i) => {
      if (part.startsWith('<') && part.endsWith('>')) {
        return <span key={i} dangerouslySetInnerHTML={{ __html: part }} />;
      }
      return part;
    });

    // Pass 3: Process Markdown within non-HTML segments
    const transform = (p: string | React.ReactNode): (string | React.ReactNode)[] => {
      if (typeof p !== 'string') return [p];
      
      let segments: (string | React.ReactNode)[] = [p];

      // Images
      segments = segments.flatMap(s => typeof s !== 'string' ? s : s.split(/(!\[.*?\]\(.*?\))/g).map(matchStr => {
        const match = matchStr.match(/!\[(.*?)\]\((.*?)\)/);
        return match ? (
          <span key={matchStr} className="inline-block my-4 border border-white/20 p-1 bg-zinc-950 max-w-full">
            <img src={match[2]} alt={match[1]} className="max-w-full h-auto grayscale hover:grayscale-0 transition-all duration-500" />
            <span className="block text-[9px] uppercase tracking-widest text-zinc-600 mt-2 px-1">{match[1] || 'ASSET'}</span>
          </span>
        ) : matchStr;
      }));

      // Links
      segments = segments.flatMap(s => typeof s !== 'string' ? s : s.split(/(\[.*?\]\(.*?\))/g).map(matchStr => {
        const match = matchStr.match(/\[(.*?)\]\((.*?)\)/);
        return match ? (
          <a key={matchStr} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-white underline decoration-white/30 hover:decoration-white transition-all underline-offset-4 font-bold inline-flex items-center group">
            {match[1]}
            <LinkIcon size={10} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        ) : matchStr;
      }));

      // Bold
      segments = segments.flatMap(s => typeof s !== 'string' ? s : s.split(/(\*\*.*?\*\*|__.*?__)/g).map(matchStr => 
        (matchStr.startsWith('**') && matchStr.endsWith('**')) || (matchStr.startsWith('__') && matchStr.endsWith('__')) 
        ? <strong key={matchStr} className="text-white font-black">{matchStr.slice(2, -2)}</strong> 
        : matchStr
      ));

      // Italic
      segments = segments.flatMap(s => typeof s !== 'string' ? s : s.split(/(\*.*?\*|_.*?_)/g).map(matchStr => 
        (matchStr.startsWith('*') && matchStr.endsWith('*')) || (matchStr.startsWith('_') && matchStr.endsWith('_'))
        ? <em key={matchStr} className="text-zinc-200 italic font-medium">{matchStr.slice(1, -1)}</em> 
        : matchStr
      ));

      // Inline Code
      segments = segments.flatMap(s => typeof s !== 'string' ? s : s.split(/(`.*?`)/g).map(matchStr => 
        matchStr.startsWith('`') && matchStr.endsWith('`') 
        ? <code key={matchStr} className="bg-zinc-900 text-white px-2 py-0.5 font-mono text-xs border border-white/10 tracking-tighter mx-1">{matchStr.slice(1, -1)}</code> 
        : matchStr
      ));

      // Finally, highlight search matches in remaining string parts
      return segments.flatMap(s => typeof s !== 'string' ? s : highlightText(s));
    };

    return parts.flatMap(transform);
  };

  const renderTable = (rows: string[], key: number) => {
    if (rows.length < 2) return null;
    const parseRow = (row: string) => row.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1).map(s => s.trim());
    const headerRow = parseRow(rows[0]);
    const bodyRows = rows.slice(2).map(row => parseRow(row));

    return (
      <div key={key} className="overflow-x-auto my-12 border border-white/10 bg-black">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/20 bg-zinc-950">
              {headerRow.map((cell, i) => (
                <th key={i} className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-white border-r border-white/10 last:border-r-0">
                  {processInline(cell)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((row, i) => (
              <tr key={i} className="border-b border-white/5 last:border-b-0 hover:bg-zinc-900/20 transition-colors">
                {row.map((cell, j) => (
                  <td key={j} className="p-4 text-xs font-medium text-zinc-400 border-r border-white/10 last:border-r-0">
                    {processInline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderBlockquote = (lines: string[], key: number) => {
    const paragraphs: React.ReactNode[] = [];
    let currentPara: string[] = [];
    const flushPara = (idx: number) => {
      if (currentPara.length > 0) {
        paragraphs.push(<p key={idx} className="mb-6 last:mb-0 leading-relaxed">{processInline(currentPara.join(' '))}</p>);
        currentPara = [];
      }
    };
    lines.forEach((line, i) => {
      const content = line.startsWith('> ') ? line.slice(2) : line.startsWith('>') ? line.slice(1) : line;
      if (content.trim() === '') flushPara(i);
      else currentPara.push(content);
    });
    flushPara(lines.length);
    return (
      <blockquote key={key} className="border-l-4 border-zinc-700 pl-6 py-2 my-8 bg-zinc-950/30 text-zinc-500 italic text-lg">
        {paragraphs}
      </blockquote>
    );
  };

  const renderMarkdown = (text: string) => {
    if (!text) return <div className="flex flex-col items-center justify-center py-20 text-zinc-800 text-[10px] font-black uppercase tracking-widest">Null Content</div>;

    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let currentBuffer: string[] = [];
    let activeType: 'none' | 'code' | 'table' | 'blockquote' | 'html' = 'none';

    const flushBuffer = (index: number) => {
      if (currentBuffer.length === 0) return;
      if (activeType === 'code') elements.push(<CodeBlock key={`code-${index}`} content={currentBuffer.join('\n')} />);
      else if (activeType === 'table') elements.push(renderTable(currentBuffer, index));
      else if (activeType === 'blockquote') elements.push(renderBlockquote(currentBuffer, index));
      else if (activeType === 'html') {
        elements.push(<div key={`html-${index}`} className="my-8" dangerouslySetInnerHTML={{ __html: currentBuffer.join('\n') }} />);
      }
      currentBuffer = [];
      activeType = 'none';
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Code Block Detection
      if (trimmed.startsWith('```')) {
        if (activeType === 'code') flushBuffer(i);
        else {
          flushBuffer(i);
          activeType = 'code';
        }
        continue;
      }
      if (activeType === 'code') {
        currentBuffer.push(line);
        continue;
      }

      // HTML Block Detection (simplified: if line starts with specific block tags or is inside an HTML block)
      const isHtmlStart = /^\s*<(div|section|article|aside|nav|header|footer|table|ul|ol|p|strong|span|b|i|u|s|del|h[1-6])[\s|>]/i.test(line);
      const isHtmlEnd = /<\/(div|section|article|aside|nav|header|footer|table|ul|ol|p|strong|span|b|i|u|s|del|h[1-6])>$/i.test(line);

      if (activeType === 'html') {
        currentBuffer.push(line);
        // Heuristic: keep buffering until we get an empty line or closing tag at end of line
        if (trimmed === '' || isHtmlEnd) flushBuffer(i);
        continue;
      } else if (isHtmlStart && !trimmed.endsWith('/>')) {
         flushBuffer(i);
         activeType = 'html';
         currentBuffer.push(line);
         if (isHtmlEnd) flushBuffer(i);
         continue;
      }

      // Blockquote Detection
      if (line.startsWith('>')) {
        if (activeType !== 'blockquote') {
          flushBuffer(i);
          activeType = 'blockquote';
        }
        currentBuffer.push(line);
        continue;
      }

      // Table Detection
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        if (activeType !== 'table') {
          flushBuffer(i);
          activeType = 'table';
        }
        currentBuffer.push(trimmed);
        continue;
      }

      flushBuffer(i);

      // Headers 1-6 (Allow up to 3 leading spaces for standard MD)
      const headerMatch = line.match(/^\s*(#{1,6})\s+(.*)$/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const content = processInline(headerMatch[2]);
        const classes = [
          "text-4xl font-black text-white mb-10 mt-12 tracking-tighter border-b-4 border-white pb-4 inline-block",
          "text-2xl font-black text-white mb-8 mt-10 tracking-widest border-l-8 border-white pl-6",
          "text-lg font-black text-zinc-300 mb-6 mt-8 uppercase tracking-[0.2em]",
          "text-base font-black text-zinc-400 mb-4 mt-6 uppercase tracking-[0.3em]",
          "text-sm font-black text-zinc-500 mb-4 mt-6 uppercase tracking-[0.4em]",
          "text-[10px] font-black text-zinc-600 mb-4 mt-6 uppercase tracking-[0.5em]"
        ];
        // Fix: Use 'any' to avoid "Cannot find namespace 'JSX'" error and satisfy dynamic tag component type requirements
        const Tag = `h${level}` as any;
        elements.push(<Tag key={i} className={classes[level - 1]}>{content}</Tag>);
      } else if (line === '---' || line === '***' || line === '___') {
        elements.push(<hr key={i} className="border-white/10 my-12" />);
      } else if (trimmed.startsWith('- [x]') || trimmed.startsWith('* [x]')) {
        elements.push(<div key={i} className="flex items-start space-x-5 mb-4 text-zinc-700 line-through uppercase text-[11px] tracking-wider font-bold"><div className="w-5 h-5 bg-white border border-white flex items-center justify-center shrink-0 text-black mt-0.5">✓</div><span className="mt-1">{processInline(trimmed.slice(5))}</span></div>);
      } else if (trimmed.startsWith('- [ ]') || trimmed.startsWith('* [ ]')) {
        elements.push(<div key={i} className="flex items-start space-x-5 mb-4 text-zinc-500 font-bold uppercase text-[11px] tracking-wider"><div className="w-5 h-5 border border-zinc-700 shrink-0 mt-0.5" /><span className="mt-1">{processInline(trimmed.slice(5))}</span></div>);
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        elements.push(<li key={i} className="ml-2 text-zinc-400 mb-4 list-none flex items-start"><span className="text-white mr-4 mt-2.5 w-2 h-0.5 bg-white shrink-0" />{processInline(trimmed.slice(2))}</li>);
      } else if (line.trim() === '') {
        elements.push(<div key={i} className="h-6" />);
      } else {
        elements.push(<p key={i} className="text-zinc-400 leading-relaxed mb-8 text-lg font-light tracking-tight">{processInline(line)}</p>);
      }
    }

    flushBuffer(lines.length);
    return elements;
  };

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden animate-in fade-in duration-300">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 bg-black z-30">
        <div className="flex border border-white/10 bg-zinc-950 p-1">
          <button onClick={() => setMode('edit')} className={`px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${mode === 'edit' ? 'bg-white text-black' : 'text-zinc-600 hover:text-white'}`}>Terminal</button>
          <button onClick={() => setMode('preview')} className={`px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${mode === 'preview' ? 'bg-white text-black' : 'text-zinc-600 hover:text-white'}`}>Output</button>
        </div>
        <button onClick={() => onDelete(note.id)} className="px-4 py-2 text-zinc-600 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-white/10 transition-all flex items-center space-x-2">
          <span className="text-[10px] font-black uppercase tracking-widest">Delete</span>
          <Trash2 size={14} />
        </button>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative custom-scrollbar">
        <div className="max-w-4xl mx-auto px-8 py-16 md:px-20 md:py-24 min-h-full">
          {mode === 'edit' ? (
            <div className="relative w-full h-full min-h-[60vh]">
              <div ref={highlightLayerRef} className="absolute inset-0 pointer-events-none whitespace-pre-wrap break-words overflow-hidden terminal-editor text-base md:text-xl text-transparent select-none z-0 px-1" aria-hidden="true">
                {renderTerminalHighlights(note.content || '')}
              </div>
              <textarea
                ref={textareaRef}
                autoFocus
                className="relative w-full h-full min-h-[60vh] bg-transparent text-zinc-300 focus:outline-none resize-none terminal-editor leading-relaxed text-base md:text-xl placeholder:text-zinc-900 caret-white z-10 border-none p-0 m-0 px-1"
                value={note.content || ''}
                onChange={(e) => onUpdate(e.target.value)}
                onScroll={handleTextareaScroll}
                placeholder="// Initialize your entry..."
                spellCheck={false}
              />
            </div>
          ) : (
            <div className="prose prose-invert max-w-none pb-48 animate-in slide-in-from-bottom-4 duration-500">
              {renderMarkdown(note.content || '')}
            </div>
          )}
        </div>
      </div>

      <div className="px-8 py-6 border-t border-white/10 bg-black flex items-center justify-between">
         <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700">
               <Clock size={12} />
               <span>Last Write: {new Date(note.lastModified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
         </div>
         <div className="flex items-center space-x-12">
            <div className="hidden sm:flex items-center space-x-2 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700">
               <span className="text-zinc-500">{note.content?.split(/\s+/).filter(Boolean).length || 0}</span>
               <span>Words</span>
            </div>
         </div>
      </div>
    </div>
  );
};

export default NoteEditor;