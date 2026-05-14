import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
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
  faTags
} from '@fortawesome/free-solid-svg-icons';
import { Badge } from "@/components/ui/badge";

export default function TemplateEditPage() {
  useDocumentTitle('Edit Template');
  const { id } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        setContent(response.data.raw_content);
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
          <Button onClick={handleSave} disabled={isSaving || !title} className="gap-2 h-10 px-6 font-bold shadow-lg">
            {isSaving ? (
              <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
            ) : (
              <FontAwesomeIcon icon={faSave} />
            )}
            Save & Lock
          </Button>
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
              <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-tighter opacity-70">
                <FontAwesomeIcon icon={faPenNib} className="h-3 w-3" />
                Raw Content
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col min-h-0">
              <Textarea
                ref={textareaRef}
                id="content"
                style={typographyStyle}
                className="flex-1 resize-none border-none focus-visible:ring-0 rounded-none bg-transparent shadow-none"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={isSaving}
              />
              
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
    </div>
  );
}
