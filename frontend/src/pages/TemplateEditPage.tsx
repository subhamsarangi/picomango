import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as diff from 'diff';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import api from '@/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPenNib, 
  faCodeCompare, 
  faSave, 
  faSpinner,
  faArrowLeft,
  faCircleCheck
} from '@fortawesome/free-solid-svg-icons';

export default function TemplateEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.patch(`templates/${id}/`, { raw_content: content });
      setOriginalContent(content); 
    } catch (err) {
      console.error(err);
      setError('Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
        <FontAwesomeIcon icon={faSpinner} className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Fetching template...</p>
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
              Template Editor
            </h1>
          </div>
        </div>
        
        <Button onClick={handleSave} disabled={isSaving || content === originalContent} className="gap-2 h-10 px-6 font-bold">
          {isSaving ? (
            <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
          ) : (
            <FontAwesomeIcon icon={faSave} />
          )}
          Save Changes
        </Button>
      </div>

      {error && (
        <div className="mb-2 p-2 bg-destructive/15 border border-destructive/20 text-destructive rounded text-xs font-medium flex-none">
          {error}
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0 pb-2 lg:pb-6 overflow-hidden">
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
                id="content"
                style={typographyStyle}
                className="flex-1 resize-none focus-visible:ring-0 rounded-none bg-transparent shadow-none"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
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
