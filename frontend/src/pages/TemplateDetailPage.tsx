import { useState, useEffect, useMemo } from 'react';
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
  faCircleExclamation,
  faChevronDown,
  faListCheck
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
        setError(err.response?.data?.detail || 'Failed to connect to the server.');
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  // Derived: Unique values for each placeholder
  const placeholderStats = useMemo(() => {
    if (!template) return {};
    const stats: Record<string, Set<string>> = {};
    template.placeholders.forEach(p => stats[p] = new Set());
    
    items.forEach(item => {
      Object.entries(item.placeholder_values).forEach(([key, val]) => {
        if (stats[key]) stats[key].add(val);
      });
    });
    
    return Object.fromEntries(
      Object.entries(stats).map(([k, v]) => [k, Array.from(v).filter(Boolean).sort()])
    );
  }, [template, items]);

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

  if (isLoading) return <Loader message="Analyzing template ecosystem..." />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-6 bg-background">
        <FontAwesomeIcon icon={faCircleExclamation} className="h-10 w-10 text-destructive" />
        <h2 className="text-2xl font-bold">Error: {error}</h2>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  if (!template) return <div className="p-8 text-center">Template not found.</div>;

  return (
    <div className="max-w-7xl mx-auto px-1 lg:px-4 py-8 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6">
        <div className="flex items-start gap-4">
          <RouterLink to="/">
            <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 border bg-background shadow-sm mt-1">
              <FontAwesomeIcon icon={faArrowLeft} />
            </Button>
          </RouterLink>
          <div>
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight">{template.title}</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <Badge variant="outline">Template ID: {template.id}</Badge>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">{items.length} Generations</Badge>
            </p>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button 
            variant="destructive" 
            className="flex-1 md:flex-none h-12 px-6 font-bold gap-2"
            onClick={() => setIsConfirm1Open(true)}
          >
            <FontAwesomeIcon icon={faTrash} />
            Delete
          </Button>
          <RouterLink to={`/templates/${template.id}/new-item`} className="flex-1 md:flex-none">
            <Button className="w-full h-12 px-8 text-lg font-bold shadow-lg gap-3">
              <FontAwesomeIcon icon={faPlus} />
              New Item
            </Button>
          </RouterLink>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* BASE PATTERN PREVIEW */}
        <Card className="lg:col-span-2 border-primary/10 shadow-lg bg-muted/20 overflow-hidden">
          <CardHeader className="py-4 px-6 border-b bg-primary/5">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              <FontAwesomeIcon icon={faLayerGroup} className="h-3 w-3" />
              Prompt Blueprint
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-lg lg:text-xl font-mono leading-relaxed text-foreground italic bg-background/50 p-6 rounded-2xl border border-primary/5">
              "{template.raw_content}"
            </p>
          </CardContent>
        </Card>

        {/* VARIABLE STATS / DROPDOWNS */}
        <Card className="border-primary/10 shadow-lg">
          <CardHeader className="py-4 px-6 border-b bg-secondary/5">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <FontAwesomeIcon icon={faListCheck} className="h-3 w-3" />
              Variable Reference
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <Accordion type="single" collapsible className="w-full">
               {template.placeholders.map((p) => (
                 <AccordionItem key={p} value={p} className="border-b last:border-0 px-4">
                   <AccordionTrigger className="hover:no-underline py-4">
                     <div className="flex flex-col items-start gap-1">
                        <span className="text-xs font-bold uppercase tracking-widest text-primary/70">{p}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {placeholderStats[p]?.length || 0} unique values
                        </span>
                     </div>
                   </AccordionTrigger>
                   <AccordionContent className="pb-4">
                      <div className="flex flex-wrap gap-1">
                        {placeholderStats[p]?.length === 0 && (
                          <span className="text-[10px] italic text-muted-foreground">No data yet...</span>
                        )}
                        {placeholderStats[p]?.map((val: string) => (
                          <Badge key={val} variant="secondary" className="bg-muted text-[9px] font-mono py-0 px-2">
                            {val}
                          </Badge>
                        ))}
                      </div>
                   </AccordionContent>
                 </AccordionItem>
               ))}
             </Accordion>
          </CardContent>
        </Card>
      </div>

      {/* ITEMS GALLERY */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <FontAwesomeIcon icon={faImage} className="text-primary h-5 w-5" />
          History
        </h2>
      </div>

      {items.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed rounded-3xl bg-muted/10">
          <p className="text-muted-foreground">Start by creating your first item!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {items.map((item) => (
            <Card key={item.id} className="group overflow-hidden border-primary/5 hover:border-primary/20 hover:shadow-2xl transition-all duration-300 rounded-2xl">
              <RouterLink to={`/items/${item.id}`} className="block h-full">
                <div className="aspect-square relative overflow-hidden bg-muted">
                  <img 
                    src={item.thumb_url} 
                    alt={item.resolved_text.substring(0, 20)} 
                    className="w-full h-full object-contain mx-auto block transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    <div className="space-y-1">
                        {Object.entries(item.placeholder_values).slice(0, 2).map(([k, v]) => (
                          <div key={k} className="text-[9px] font-mono text-white/80 truncate">
                            <span className="text-primary font-bold uppercase">{k}:</span> {v}
                          </div>
                        ))}
                        <Button variant="secondary" size="sm" className="w-full h-7 text-[10px] font-bold mt-2">
                          View
                        </Button>
                    </div>
                  </div>
                </div>
              </RouterLink>
            </Card>
          ))}
        </div>
      )}

      {/* DELETE MODALS (PREVIOUSLY IMPLEMENTED) */}
      <Dialog open={isConfirm1Open} onOpenChange={setIsConfirm1Open}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-destructive">
              <FontAwesomeIcon icon={faTriangleExclamation} />
              Danger Zone
            </DialogTitle>
            <DialogDescription className="text-base py-4">
              Delete template <span className="font-bold">"{template.title}"</span>?
              <br/><br/>
              This will destroy all <span className="font-bold text-destructive">{items.length} items</span> linked to it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsConfirm1Open(false)} className="h-12 flex-1 font-bold">Cancel</Button>
            <Button variant="destructive" className="h-12 flex-1 font-bold" onClick={() => { setIsConfirm1Open(false); setIsConfirm2Open(true); }}>Review Items</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirm2Open} onOpenChange={setIsConfirm2Open}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-2xl font-bold">Final Review</DialogTitle>
            <DialogDescription>Items to be lost forever:</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto my-6 px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {items.map(item => (
                <div key={item.id} className="relative rounded-2xl border overflow-hidden bg-muted/20">
                  <img src={item.thumb_url} className="aspect-square w-full object-contain" />
                  <div className="p-2 bg-background/90 text-[8px] font-mono truncate border-t">
                    {Object.entries(item.placeholder_values).slice(0, 1).map(([k, v]) => `${k}:${v}`)}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="gap-2 p-6 bg-muted/10 border-t flex flex-row">
            <Button variant="outline" onClick={() => setIsConfirm2Open(false)} className="h-12 flex-1 font-bold">Cancel</Button>
            <Button variant="destructive" className="h-12 flex-1 font-bold gap-2 shadow-lg" onClick={handleCascadeDelete} disabled={isDeleting}>
              {isDeleting ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faTrash} />}
              NUKE EVERYTHING
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
