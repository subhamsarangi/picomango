import { useState, useEffect } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import api from '@/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSpinner, 
  faPlus, 
  faArrowLeft, 
  faLayerGroup,
  faImage,
  faEye,
  faTrash,
  faTriangleExclamation,
  faCircleExclamation
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
import Loader from '@/components/Loader';

interface Item {
  id: number;
  resolved_text: string;
  image_url: string;
  thumb_url: string;
  created_at: string;
  placeholder_values: Record<string, string>;
}

interface Template {
  id: number;
  title: string;
  raw_content: string;
  is_locked: boolean;
  placeholders: string[];
}

export default function TemplateDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<Template | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Delete Flow States
  const [isConfirm1Open, setIsConfirm1Open] = useState(false);
  const [isConfirm2Open, setIsConfirm2Open] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError('');
      try {
        const [tplRes, itemsRes] = await Promise.all([
          api.get(`templates/${id}/`),
          api.get(`items/`, { params: { template: id } })
        ]);
        setTemplate(tplRes.data);
        setItems(itemsRes.data);
      } catch (err: any) {
        console.error(err);
        setError(err.response?.data?.detail || 'Failed to connect to the server. Is the backend running?');
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  const handleCascadeDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`templates/${id}/`);
      navigate('/');
    } catch (err) {
      console.error(err);
      alert('Failed to delete template.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <Loader message="Analyzing template and items..." />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-6 bg-background px-4 text-center">
        <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
          <FontAwesomeIcon icon={faCircleExclamation} className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Something went wrong</h2>
          <p className="text-muted-foreground max-w-md">{error}</p>
        </div>
        <Button onClick={() => window.location.reload()} variant="outline" className="h-12 px-8 font-bold">
          Try Again
        </Button>
      </div>
    );
  }

  if (!template) return (
    <div className="flex flex-col items-center justify-center h-[80vh] gap-4 bg-background">
      <h2 className="text-2xl font-bold">Template Not Found</h2>
      <Button onClick={() => navigate('/')}>Back to Library</Button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-1 lg:px-4 py-8 bg-background animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6">
        <div className="flex items-start gap-4">
          <RouterLink to="/">
            <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 border bg-background shadow-sm hover:shadow-md transition-all mt-1">
              <FontAwesomeIcon icon={faArrowLeft} />
            </Button>
          </RouterLink>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="px-2 py-0">ID: {template.id}</Badge>
              <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Template Overview</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight">{template.title}</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="destructive" 
            size="lg" 
            className="h-14 px-6 font-bold shadow-lg gap-2"
            onClick={() => setIsConfirm1Open(true)}
          >
            <FontAwesomeIcon icon={faTrash} />
            <span className="hidden sm:inline">Delete Template</span>
          </Button>
          <RouterLink to={`/templates/${template.id}/new-item`}>
            <Button size="lg" className="h-14 px-8 text-lg font-bold shadow-lg hover:shadow-xl transition-all gap-3">
              <FontAwesomeIcon icon={faPlus} />
              New Item
            </Button>
          </RouterLink>
        </div>
      </div>

      {/* TEMPLATE CONTENT PREVIEW */}
      <Card className="mb-12 border-primary/10 shadow-lg bg-muted/20 overflow-hidden">
        <CardHeader className="py-4 px-6 border-b bg-primary/5">
          <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
            <FontAwesomeIcon icon={faLayerGroup} className="h-3 w-3" />
            Base Prompt Pattern
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-lg lg:text-xl font-mono leading-relaxed text-foreground italic bg-background/50 p-6 rounded-2xl border border-primary/5">
            "{template.raw_content}"
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {template.placeholders.map(p => (
              <Badge key={p} variant="outline" className="bg-primary/5 text-primary border-primary/20 px-4 py-1.5 font-mono text-xs">
                {"<<"}{p}{">>"}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ITEMS GRID */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <FontAwesomeIcon icon={faImage} className="text-primary h-5 w-5" />
          Linked Items
          <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary">{items.length}</Badge>
        </h2>
      </div>

      {items.length === 0 ? (
        <div className="py-32 text-center border-2 border-dashed rounded-[2rem] bg-muted/5 flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center opacity-20">
             <FontAwesomeIcon icon={faImage} className="h-8 w-8" />
          </div>
          <p className="text-muted-foreground font-medium">No items generated from this template yet.</p>
          <RouterLink to={`/templates/${template.id}/new-item`}>
            <Button variant="outline" className="mt-2">Create First Item</Button>
          </RouterLink>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map((item) => (
            <Card key={item.id} className="group overflow-hidden border-primary/5 hover:border-primary/20 hover:shadow-2xl transition-all duration-300 rounded-2xl">
              <RouterLink to={`/items/${item.id}`} className="block h-full">
                <div className="aspect-square relative overflow-hidden bg-muted">
                  <img 
                    src={item.thumb_url} 
                    alt={item.resolved_text.substring(0, 20)} 
                    className="w-full h-full object-contain mx-auto block transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                    <div className="space-y-3">
                      <div className="max-h-32 overflow-hidden">
                         <p className="text-[10px] font-mono text-white/80 leading-tight">
                           {Object.entries(item.placeholder_values).map(([k, v]) => (
                             <span key={k} className="block mb-1">
                               <span className="text-primary font-bold">{k}:</span> {v}
                             </span>
                           ))}
                         </p>
                      </div>
                      <Button variant="secondary" size="sm" className="w-full gap-2 font-bold h-9">
                        <FontAwesomeIcon icon={faEye} />
                        Details
                      </Button>
                    </div>
                  </div>
                </div>
                <CardContent className="p-3 border-t bg-muted/5">
                  <p className="text-[10px] font-mono line-clamp-2 text-muted-foreground leading-tight">
                    {item.resolved_text}
                  </p>
                </CardContent>
              </RouterLink>
            </Card>
          ))}
        </div>
      )}

      {/* DELETE CONFIRMATION 1: ARE YOU SURE? */}
      <Dialog open={isConfirm1Open} onOpenChange={setIsConfirm1Open}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-destructive">
              <FontAwesomeIcon icon={faTriangleExclamation} />
              Danger Zone
            </DialogTitle>
            <DialogDescription className="text-base py-4">
              You are about to delete <span className="font-bold text-foreground">"{template.title}"</span>. This action is permanent.
              <br/><br/>
              It will also <span className="font-bold text-destructive underline decoration-2 underline-offset-4">delete all {items.length} items</span> linked to this template.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:flex-col lg:flex-row">
            <Button variant="outline" onClick={() => setIsConfirm1Open(false)} className="h-12 font-bold flex-1">Cancel</Button>
            <Button 
              variant="destructive" 
              className="h-12 font-bold flex-1"
              onClick={() => {
                setIsConfirm1Open(false);
                setIsConfirm2Open(true);
              }}
            >
              Review Items First
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION 2: REVIEW ITEMS */}
      <Dialog open={isConfirm2Open} onOpenChange={setIsConfirm2Open}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              Final Review
            </DialogTitle>
            <DialogDescription className="text-base">
              The following {items.length} items will be lost forever.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto my-6 px-6 scrollbar-thin scrollbar-thumb-muted">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {items.map(item => (
                <div key={item.id} className="relative rounded-2xl border overflow-hidden bg-muted/20">
                  <div className="aspect-square bg-muted">
                    <img src={item.thumb_url} className="w-full h-full object-contain" />
                  </div>
                  <div className="p-2 bg-background/90 backdrop-blur-sm border-t">
                    <div className="space-y-1">
                      {Object.entries(item.placeholder_values).slice(0, 3).map(([k, v]) => (
                        <div key={k} className="text-[8px] font-mono leading-none truncate flex justify-between gap-2">
                          <span className="font-bold text-primary/70 uppercase">{k}</span> 
                          <span className="truncate">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 p-6 bg-muted/10 border-t flex flex-row">
            <Button variant="outline" onClick={() => setIsConfirm2Open(false)} disabled={isDeleting} className="h-12 flex-1 font-bold">
              Wait, Cancel
            </Button>
            <Button 
              variant="destructive" 
              className="h-12 flex-1 font-bold gap-2 shadow-lg hover:shadow-destructive/20" 
              onClick={handleCascadeDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
              ) : (
                <FontAwesomeIcon icon={faTrash} />
              )}
              NUKE EVERYTHING
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
