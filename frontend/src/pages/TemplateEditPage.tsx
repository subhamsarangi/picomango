import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useHistory } from '@/hooks/useHistory';
import * as diff from 'diff';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import api from '@/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPenNib, 
  faCodeCompare, 
  faSave, 
  faSpinner,
  faArrowLeft,
  faCircleCheck,
  faTags,
  faUndo,
  faRedo,
  faCheck,
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { faTrash } from '@fortawesome/free-solid-svg-icons/faTrash';

export default function TemplateEditPage() {
  useDocumentTitle('Edit Template');
  const { id } = useParams();
  const navigate = useNavigate();
  const [content, { set: setContent, undo, redo, canUndo, canRedo, reset: resetContent }] = useHistory('');
  const [originalContent, setOriginalContent] = useState('');
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Placeholder creation states
  const [isPlaceholderDialogOpen, setIsPlaceholderDialogOpen] = useState(false);
  const [newPlaceholderName, setNewPlaceholderName] = useState('');
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);

  // Strict typography to ensure alignment
  const typographyStyle = {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: '16px',
    lineHeight: '1.75rem', // 28px
    letterSpacing: '-0.025em',
    padding: '1rem',
    margin: '0',
    border: 'none',
  };

  useEffect(() => {
    setIsLoading(true);
    const fetchTemplate = async () => {
      try {
        const response = await api.get(`templates/${id}/`);
        resetContent(response.data.raw_content);
        setOriginalContent(response.data.raw_content);
        setTitle(response.data.title || '');
      } catch (err) {
        console.error(err);
        setError('Failed to load template.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTemplate();
  }, [id]);

  // Keyboard shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === 'Escape') {
        setIsPlaceholderDialogOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const diffResult = useMemo(() => {
    return diff.diffWordsWithSpace(originalContent, content);
  }, [originalContent, content]);

  const placeholders = useMemo(() => {
    const matches = content.matchAll(/<<([^>]+)>>/g);
    return Array.from(new Set(Array.from(matches).map(m => m[1])));
  }, [content]);

  const handleSave = async () => {
    if (!title) {
      setError('Title is required to lock template.');
      return;
    }
    setIsSaving(true);
    try {
      await api.patch(`templates/${id}/`, { 
        raw_content: content,
        title: title,
        is_locked: true 
      });
      navigate('/');
    } catch (err) {
      console.error(err);
      setError('Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleTextSelect = () => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    
    if (start !== end) {
      setSelection({ start, end });
      setIsPlaceholderDialogOpen(true);
      setNewPlaceholderName('');

      // Mirror Div calculation for positioning
      const textarea = textareaRef.current;
      const { offsetLeft, offsetTop, scrollLeft, scrollTop } = textarea;
      const styles = window.getComputedStyle(textarea);
      
      const mirror = document.createElement('div');
      mirror.style.position = 'absolute';
      mirror.style.visibility = 'hidden';
      mirror.style.whiteSpace = 'pre-wrap';
      mirror.style.wordWrap = 'break-word';
      mirror.style.width = textarea.clientWidth + 'px';
      mirror.style.font = styles.font;
      mirror.style.padding = styles.padding;
      mirror.style.border = styles.border;
      mirror.style.lineHeight = styles.lineHeight;
      mirror.style.boxSizing = styles.boxSizing;
      
      // Text up to the selection start
      const textBefore = content.substring(0, start);
      const span = document.createElement('span');
      span.textContent = content.substring(start, end);
      
      mirror.textContent = textBefore;
      mirror.appendChild(span);
      document.body.appendChild(mirror);
      
      const rect = span.getBoundingClientRect();
      const mirrorRect = mirror.getBoundingClientRect();
      
      // Calculate position relative to textarea
      // We want it slightly above the selection
      setPopoverPos({
        top: span.offsetTop - scrollTop - 45, // 45px offset for the bar height
        left: Math.min(
          textarea.clientWidth - 160, // Keep in bounds (bar width roughly 320)
          Math.max(160, span.offsetLeft - scrollLeft)
        )
      });
      
      document.body.removeChild(mirror);
    } else {
      setIsPlaceholderDialogOpen(false);
    }
  };

  const handleCreatePlaceholder = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newPlaceholderName || !selection) return;

    const before = content.substring(0, selection.start);
    const after = content.substring(selection.end);
    const newContent = `${before}<<${newPlaceholderName}>>${after}`;
    
    setContent(newContent);
    setIsPlaceholderDialogOpen(false);
    setSelection(null);
    
    // Refocus textarea after a short delay
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`templates/${id}/`);
      navigate('/');
    } catch (err) {
      console.error(err);
      setError('Failed to delete draft.');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const highlightPlaceholder = (name: string) => {
    if (!textareaRef.current) return;
    const fullText = `<<${name}>>`;
    const index = content.indexOf(fullText);
    if (index !== -1) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(index, index + fullText.length);
      // Scroll to it if needed
      const lineHeight = 28; // From our typography style
      const linesBefore = content.substring(0, index).split('\n').length - 1;
      textareaRef.current.scrollTop = linesBefore * lineHeight;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
        <FontAwesomeIcon icon={faSpinner} className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse text-lg">Fetching template...</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col max-w-7xl mx-auto px-1 lg:px-4 overflow-hidden relative pb-4">
      <div className="py-2 lg:py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 flex-none">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <FontAwesomeIcon icon={faArrowLeft} />
          </Button>
          <div>
            <h1 className="text-xl lg:text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <FontAwesomeIcon icon={faCodeCompare} className="text-primary h-5 w-5" />
              One-Time Template Edit
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end">
            <Label htmlFor="title" className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Template Title</Label>
            <Input 
              id="title"
              placeholder="Give it a name..."
              className="h-9 w-64 bg-background border-primary/20"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSaving}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(true)} 
              disabled={isSaving || isDeleting} 
              className="h-10 px-4 font-bold border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <FontAwesomeIcon icon={faTrash} className="mr-2" />
              Discard
            </Button>
            <Button onClick={handleSave} disabled={isSaving || isDeleting || !title} className="gap-2 h-10 px-6 font-bold shadow-lg">
              {isSaving ? (
                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
              ) : (
                <FontAwesomeIcon icon={faSave} />
              )}
              Save & Lock
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-2 p-2 bg-destructive/15 border border-destructive/20 text-destructive rounded text-xs font-medium flex-none">
          {error}
        </div>
      )}

      {/* MOBILE TITLE FIELD */}
      <div className="lg:hidden mb-4 px-1">
        <Input 
          placeholder="Template Title (Required)"
          className="h-11 bg-background border-primary/20"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="flex-1 flex flex-col min-h-0 pb-2 lg:pb-4 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-4 flex-1 min-h-0">
          
          {/* EDITOR PANE */}
          <Card className="shadow-lg border-primary/10 flex flex-col min-h-0 overflow-hidden">
            <CardHeader className="bg-primary/5 py-2 px-3 flex-none border-b">
              <CardTitle className="text-sm font-bold flex items-center justify-between w-full uppercase tracking-tighter opacity-70">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faPenNib} className="h-3 w-3" />
                  Raw Content
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    disabled={!canUndo} 
                    onClick={undo}
                    title="Undo (Ctrl+Z)"
                  >
                    <FontAwesomeIcon icon={faUndo} className="h-2.5 w-2.5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    disabled={!canRedo} 
                    onClick={redo}
                    title="Redo (Ctrl+Y)"
                  >
                    <FontAwesomeIcon icon={faRedo} className="h-2.5 w-2.5" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col min-h-0 relative">
              <Textarea
                ref={textareaRef}
                id="content"
                style={typographyStyle}
                className="flex-1 resize-none border-none focus-visible:ring-0 rounded-none bg-transparent shadow-none"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onMouseUp={handleTextSelect}
                disabled={isSaving}
              />

              {/* OVERLAY BACKDROP (Click outside to close) */}
              {isPlaceholderDialogOpen && (
                <div 
                  className="fixed inset-0 z-20 cursor-default" 
                  onMouseDown={() => setIsPlaceholderDialogOpen(false)}
                />
              )}

              {/* MINIMAL FLOATING OVERLAY */}
              {isPlaceholderDialogOpen && popoverPos && (
                <div 
                  className="absolute z-30 animate-in fade-in zoom-in duration-200 pointer-events-auto"
                  style={{ 
                    top: `${popoverPos.top}px`, 
                    left: `${popoverPos.left}px`,
                    transform: 'translateX(-50%)'
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                   <Card className="shadow-xl border border-zinc-300 bg-zinc-200 overflow-hidden w-64">
                      {/* CLOSE BUTTON */}
                      <button 
                        type="button"
                        onClick={() => setIsPlaceholderDialogOpen(false)}
                        className="absolute top-1.5 right-1.5 h-5 w-5 flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-300 rounded-full transition-colors"
                      >
                        <FontAwesomeIcon icon={faTimes} className="h-2.5 w-2.5" />
                      </button>

                      <div className="p-3 space-y-3">
                         {/* ROW 1: PREVIEW */}
                         <div className="text-xs text-zinc-600 font-mono pr-6 overflow-hidden">
                           <div className="truncate">
                             <span className="text-zinc-900 italic font-bold">"{selection ? content.substring(selection.start, selection.end).trim() : ''}"</span>
                           </div>
                         </div>

                         {/* ROW 2: INPUT + CHECK */}
                         <form onSubmit={handleCreatePlaceholder} className="flex items-center gap-1">
                            <Input 
                               autoFocus
                               placeholder="Variable name..."
                               className="h-8 border-zinc-300 bg-white focus-visible:ring-1 focus-visible:ring-primary/50 text-xs font-bold text-zinc-900 flex-1 placeholder:text-zinc-400"
                               value={newPlaceholderName}
                               onChange={(e) => setNewPlaceholderName(e.target.value.replace(/[^a-zA-Z0-9_]/g, '_'))}
                            />
                            <Button type="submit" size="icon" disabled={!newPlaceholderName} className="h-8 w-8 rounded-lg shadow-sm shrink-0 bg-primary hover:bg-primary/90 text-white">
                               <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />
                            </Button>
                         </form>
                      </div>
                   </Card>
                </div>
              )}
              
              {/* PLACEHOLDER CHIP BAR */}
              <div className="bg-muted/50 border-t p-3 min-h-[60px] flex flex-wrap gap-2 items-center">
                <div className="flex items-center gap-2 text-muted-foreground mr-2">
                  <FontAwesomeIcon icon={faTags} className="h-3 w-3" />
                  <span className="text-[10px] uppercase font-bold tracking-widest">Detected:</span>
                </div>
                {placeholders.length === 0 && (
                  <span className="text-xs text-muted-foreground italic">No placeholders detected...</span>
                )}
                {placeholders.map((p) => (
                  <Badge 
                    key={p} 
                    variant="secondary" 
                    className={`bg-primary/10 text-primary border-primary/20 py-1 px-3 transition-colors select-none ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/30 cursor-pointer active:scale-95'}`}
                    onClick={() => !isSaving && highlightPlaceholder(p)}
                  >
                    {"<<"}{p}{">>"}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* PREVIEW PANE */}
          <Card className="shadow-lg border-primary/10 flex flex-col min-h-0 overflow-hidden">
            <CardHeader className="bg-secondary/5 py-2 px-3 flex-none border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-tighter opacity-70">
                <FontAwesomeIcon icon={faCircleCheck} className="h-3 w-3" />
                Diff Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-auto bg-[#fdfcf0] dark:bg-amber-950/10">
              <div style={typographyStyle} className="whitespace-pre-wrap">
                {diffResult.map((part, index) => {
                  const colorClass = part.added 
                    ? 'bg-green-200 text-green-900 font-bold' 
                    : part.removed 
                    ? 'bg-red-200 text-red-900 line-through' 
                    : 'text-zinc-600';
                  return (
                    <span key={index} className={`${colorClass} inline`}>
                      {part.value}
                    </span>
                  );
                })}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-destructive">
              <FontAwesomeIcon icon={faTrash} />
              Discard Draft
            </DialogTitle>
            <DialogDescription className="text-base py-4">
              Are you sure you want to discard this template draft? 
              <br/><br/>
              This will delete the draft and <span className="font-bold text-destructive">ALL associated items and images</span>. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="h-12 flex-1 font-bold">
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              className="h-12 flex-1 font-bold shadow-lg"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : 'Yes, Discard Draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
