import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import api from '@/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons/faSpinner';
import { faPlus } from '@fortawesome/free-solid-svg-icons/faPlus';
import { faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons/faWandMagicSparkles';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons/faArrowLeft';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons/faArrowRight';
import { faLink } from '@fortawesome/free-solid-svg-icons/faLink';
import { faLayerGroup } from '@fortawesome/free-solid-svg-icons/faLayerGroup';
import { faImage } from '@fortawesome/free-solid-svg-icons/faImage';
import { faEye } from '@fortawesome/free-solid-svg-icons/faEye';
import { faTrash } from '@fortawesome/free-solid-svg-icons/faTrash';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons/faTriangleExclamation';
import { faCircleExclamation } from '@fortawesome/free-solid-svg-icons/faCircleExclamation';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons/faChevronDown';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons/faChevronLeft';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons/faChevronRight';
import { faListCheck } from '@fortawesome/free-solid-svg-icons/faListCheck';
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { faLock, faGlobe } from '@fortawesome/free-solid-svg-icons';

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
  next_template: number | null;
  next_template_title?: string;
  full_chain?: { id: number; title: string }[];
  is_public: boolean;
}

export default function TemplateDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<Template | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useDocumentTitle(template?.title || 'Loading Template...');
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Delete Flow States
  const [isConfirm1Open, setIsConfirm1Open] = useState(false);
  const [isConfirm2Open, setIsConfirm2Open] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Chaining States
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [allTemplates, setAllTemplates] = useState<Template[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [modalPage, setModalPage] = useState(1);
  const MODAL_PAGE_SIZE = 5;

  const isRoot = useMemo(() => {
    return template?.full_chain && template.full_chain.length > 0 && template.full_chain[0].id === template.id;
  }, [template]);

  const handleTogglePublic = async (checked: boolean) => {
    if (!id) return;
    try {
      await api.patch(`templates/${id}/`, { is_public: checked });
      setTemplate(prev => prev ? { ...prev, is_public: checked } : null);
    } catch (err) {
      console.error(err);
      alert('Failed to update visibility.');
    }
  };

  const filteredTemplates = useMemo(() => {
    return allTemplates
      .filter(t => (t.title || '').toLowerCase().includes(searchTerm.toLowerCase()));
  }, [allTemplates, searchTerm]);

  const paginatedModalTemplates = useMemo(() => {
    const start = (modalPage - 1) * MODAL_PAGE_SIZE;
    return filteredTemplates.slice(start, start + MODAL_PAGE_SIZE);
  }, [filteredTemplates, modalPage]);

  const totalModalPages = Math.max(1, Math.ceil(filteredTemplates.length / MODAL_PAGE_SIZE));

  useEffect(() => {
    setModalPage(1);
  }, [searchTerm]);

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
        const itemsData = itemsRes.data.results !== undefined ? itemsRes.data.results : itemsRes.data;
        setItems(itemsData);
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

  const fetchAllTemplates = async () => {
    try {
      const res = await api.get('templates/');
      const data = res.data.results !== undefined ? res.data.results : res.data;
      setAllTemplates(data.filter((t: Template) => t.id !== Number(id)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleLinkTemplate = async (targetId: number) => {
    setIsLinking(true);
    try {
      await api.patch(`templates/${id}/`, { next_template: targetId });
      // Refresh
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Failed to link template.');
    } finally {
      setIsLinking(false);
    }
  };

  // Scroll current step into view on load
  useEffect(() => {
    if (template?.full_chain && scrollRef.current) {
      setTimeout(() => {
        const currentStepEl = scrollRef.current?.querySelector('[data-current="true"]');
        if (currentStepEl) {
          currentStepEl.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
          });
        }
      }, 500); // Wait for animation/render
    }
  }, [template?.id, template?.full_chain]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
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
        <div className="flex flex-col md:flex-row gap-4 items-center w-full md:w-auto">
          {isRoot && (
            <div className="flex items-center space-x-3 bg-card border rounded-2xl px-4 h-12 shadow-sm">
              <FontAwesomeIcon 
                icon={template.is_public ? faGlobe : faLock} 
                className={`h-4 w-4 ${template.is_public ? 'text-emerald-500' : 'text-amber-500'}`} 
              />
              <Label htmlFor="public-toggle" className="text-sm font-bold cursor-pointer whitespace-nowrap">
                {template.is_public ? 'Public' : 'Private'}
              </Label>
              <Switch 
                id="public-toggle" 
                checked={template.is_public}
                onCheckedChange={handleTogglePublic}
              />
            </div>
          )}
          <RouterLink to={`/templates/${template.id}/new-item`} className="w-full md:w-auto flex-1 md:flex-none">
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
          <CardContent className="p-0 md:p-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-none md:rounded-2xl blur opacity-10 group-hover:opacity-20 transition-opacity"></div>
              <p className="relative text-sm lg:text-base font-mono leading-relaxed italic bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/80 p-4 md:p-8 rounded-none md:rounded-2xl border-y md:border border-indigo-100/50 shadow-inner">
                <span className="inline-block bg-gradient-to-r from-indigo-950 via-purple-900 to-indigo-900 bg-clip-text text-transparent font-black tracking-tight">
                  "{template.raw_content}"
                </span>
              </p>
            </div>
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

        {/* TEMPLATE CHAINING */}
        <Card className="border-primary/10 shadow-lg lg:col-span-3">
          <CardHeader className="py-4 px-6 border-b bg-indigo-50/50 dark:bg-indigo-950/20">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 flex items-center gap-2">
              <FontAwesomeIcon icon={faLink} className="h-3 w-3" />
              Prompt Chain
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 relative group/chain">
            {/* NAVIGATION ARROWS */}
            <div className="absolute left-2 top-1/2 -translate-y-1/2 z-20 opacity-0 group-hover/chain:opacity-100 transition-opacity">
              <Button 
                variant="secondary" 
                size="icon" 
                className="h-10 w-10 rounded-full shadow-lg bg-background/80 backdrop-blur-sm border border-primary/10"
                onClick={() => scroll('left')}
              >
                <FontAwesomeIcon icon={faChevronLeft} />
              </Button>
            </div>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 opacity-0 group-hover/chain:opacity-100 transition-opacity">
              <Button 
                variant="secondary" 
                size="icon" 
                className="h-10 w-10 rounded-full shadow-lg bg-background/80 backdrop-blur-sm border border-primary/10"
                onClick={() => scroll('right')}
              >
                <FontAwesomeIcon icon={faChevronRight} />
              </Button>
            </div>

            <div 
              ref={scrollRef}
              className="flex items-center gap-4 overflow-x-auto px-10 pt-8 pb-10 no-scrollbar scroll-smooth"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <style>{`
                .no-scrollbar::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              {template.full_chain?.map((step, index) => (
                <div key={step.id} className="flex items-center gap-4 flex-none">
                  {/* STEP NODE */}
                  <RouterLink 
                    to={`/templates/${step.id}`} 
                    className="group relative"
                    data-current={step.id === Number(id)}
                  >
                    <div className={`w-36 md:w-48 min-h-[100px] p-3 md:p-4 rounded-xl border-2 transition-all duration-300 flex flex-col justify-center ${
                      step.id === Number(id) 
                        ? 'border-primary bg-primary/5 shadow-lg scale-105 z-10' 
                        : 'border-primary/10 bg-background hover:border-primary/30 hover:shadow-sm'
                    }`}>
                      {step.id === Number(id) && (
                        <Badge className="absolute -top-2 left-2 md:left-4 bg-primary animate-bounce shadow-md text-[8px] md:text-[10px] px-1 md:px-2 py-0">Current</Badge>
                      )}
                      <h4 className={`font-bold text-xs md:text-sm leading-tight ${step.id === Number(id) ? 'text-primary' : 'group-hover:text-primary transition-colors'}`}>
                        {step.title}
                      </h4>
                      <p className="text-[8px] md:text-[10px] text-muted-foreground mt-1 md:mt-2 uppercase tracking-widest font-bold">
                        Step {index + 1}
                      </p>
                    </div>
                  </RouterLink>

                  {/* ARROW (if not last) */}
                  {index < (template.full_chain?.length || 0) - 1 && (
                    <div className="text-muted-foreground/30">
                      <FontAwesomeIcon icon={faArrowRight} className="h-5 w-5" />
                    </div>
                  )}
                </div>
              ))}

              {/* ACTION BUTTONS (Only show at the end of the chain) */}
              {!template.next_template && (
                <div className="flex items-center gap-4 flex-none ml-4">
                  <div className="text-muted-foreground/30">
                    <FontAwesomeIcon icon={faArrowRight} className="h-5 w-5" />
                  </div>
                  <div className="flex gap-4">
                    <div 
                      className="w-36 md:w-48 min-h-[100px] p-4 rounded-xl border-2 border-dashed border-primary/30 flex flex-col items-center justify-center gap-2 bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer group/btn"
                      onClick={() => navigate(`/items/new`, { state: { linkPrev: id } })}
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center group-hover/btn:scale-110 transition-transform">
                        <FontAwesomeIcon icon={faWandMagicSparkles} className="h-4 w-4 text-primary" />
                      </div>
                      <p className="text-[10px] text-primary font-bold uppercase tracking-widest text-center">New Step</p>
                    </div>

                    <div 
                      className="w-36 md:w-48 min-h-[100px] p-4 rounded-xl border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center gap-2 bg-muted/5 hover:bg-muted/10 transition-all cursor-pointer group/btn"
                      onClick={() => { fetchAllTemplates(); setIsLinkDialogOpen(true); }}
                    >
                      <div className="h-8 w-8 rounded-full bg-muted/20 flex items-center justify-center group-hover/btn:scale-110 transition-transform">
                        <FontAwesomeIcon icon={faLink} className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest text-center">Link Existing</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ITEMS GALLERY */}
      {/* LINK TEMPLATE DIALOG */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="rounded-3xl max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Link Next Template</DialogTitle>
            <DialogDescription>
              Choose which template should follow "{template.title}" in the chain.
            </DialogDescription>
          </DialogHeader>
          <div className="px-1 py-3">
            <Input 
              placeholder="Search templates..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rounded-xl border-primary/20"
            />
          </div>
          <div className="flex-1 overflow-y-auto my-4 pr-2 min-h-[320px]">
            <div className="grid gap-2">
              {paginatedModalTemplates.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground italic">No templates found.</p>
              ) : (
                paginatedModalTemplates.map(t => (
                  <Button 
                    key={t.id} 
                    variant="ghost" 
                    className="justify-start h-16 border border-primary/5 hover:border-primary/20 hover:bg-primary/5 px-4 rounded-xl"
                    onClick={() => handleLinkTemplate(t.id)}
                    disabled={isLinking}
                  >
                    <div className="text-left">
                      <div className="font-bold truncate">{t.title || 'Untitled'}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">ID: {t.id}</div>
                    </div>
                  </Button>
                ))
              )}
            </div>
          </div>
          <DialogFooter className="flex flex-row justify-between items-center border-t pt-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              Page {modalPage} of {totalModalPages}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 px-3 text-[10px] font-bold gap-1"
                onClick={() => setModalPage(p => Math.max(1, p - 1))}
                disabled={modalPage === 1}
              >
                <FontAwesomeIcon icon={faChevronLeft} className="h-2 w-2" />
                Prev
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 px-3 text-[10px] font-bold gap-1"
                onClick={() => setModalPage(p => Math.min(totalModalPages, p + 1))}
                disabled={modalPage === totalModalPages}
              >
                Next
                <FontAwesomeIcon icon={faChevronRight} className="h-2 w-2" />
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
                    className="w-full h-full object-contain mx-auto block transition-all duration-500 blur-md group-hover:!blur-none group-hover:scale-105"
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

      {/* DANGER ZONE ACCORDION */}
      <div className="mt-20 border-t pt-8 opacity-50 hover:opacity-100 transition-opacity">
        <Accordion type="single" collapsible className="w-full max-w-md mx-auto">
          <AccordionItem value="danger-zone" className="border-none">
            <AccordionTrigger className="text-xs text-muted-foreground hover:no-underline py-2 justify-center gap-2">
               Danger Zone
            </AccordionTrigger>
            <AccordionContent className="flex justify-center py-4">
              <Button 
                variant="destructive" 
                size="sm"
                className="font-bold gap-2 bg-destructive/10 text-destructive hover:bg-destructive"
                onClick={() => setIsConfirm1Open(true)}
              >
                <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                Delete Template
              </Button>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

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
