import { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import api from '@/api';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons/faPlus';
import { faSpinner } from '@fortawesome/free-solid-svg-icons/faSpinner';
import { faLayerGroup } from '@fortawesome/free-solid-svg-icons/faLayerGroup';
import { faPenToSquare } from '@fortawesome/free-solid-svg-icons/faPenToSquare';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons/faChevronRight';
import { faCircleCheck } from '@fortawesome/free-solid-svg-icons/faCircleCheck';
import { faLock } from '@fortawesome/free-solid-svg-icons/faLock';
import { faGlobe } from '@fortawesome/free-solid-svg-icons/faGlobe';
import { faTrash } from '@fortawesome/free-solid-svg-icons/faTrash';
import { faSitemap } from '@fortawesome/free-solid-svg-icons/faSitemap';
import { Badge } from "@/components/ui/badge";
import Loader from '@/components/Loader';
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { faSearch } from '@fortawesome/free-solid-svg-icons/faSearch';
import { faFilter } from '@fortawesome/free-solid-svg-icons/faFilter';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Template {
  id: number;
  title: string;
  raw_content: string;
  is_locked: boolean;
  is_root: boolean;
  item_count: number;
  created_at: string;
  item_thumbnails: string[];
  is_public: boolean;
}

export default function Home() {
  useDocumentTitle('Library');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMoreLoading, setIsMoreLoading] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<Template | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Search and Filter States
  const [search, setSearch] = useState('');
  const [onlyRoots, setOnlyRoots] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const fetchTemplates = async () => {
      if (page === 1) setIsLoading(true);
      else setIsMoreLoading(true);
      
      try {
        const response = await api.get('templates/', {
          params: {
            page,
            search,
            is_root: onlyRoots ? 'true' : undefined
          }
        });
        
        const results = response.data.results || response.data;
        setTemplates(prev => page === 1 ? results : [...prev, ...results]);
        setHasMore(!!response.data.next);
        setTotalCount(response.data.count || results.length);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
        setIsMoreLoading(false);
      }
    };
    
    const timer = setTimeout(() => {
      fetchTemplates();
    }, page === 1 ? 400 : 0); // Debounce search on first page

    return () => clearTimeout(timer);
  }, [page, search, onlyRoots]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, onlyRoots]);

  const handleDeleteDraft = async () => {
    if (!deletingTemplate) return;
    setIsDeleting(true);
    try {
      await api.delete(`templates/${deletingTemplate.id}/`);
      setTemplates(templates.filter(t => t.id !== deletingTemplate.id));
      setDeletingTemplate(null);
    } catch (err) {
      console.error(err);
      alert('Failed to delete template.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <Loader message="Fetching your library..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-1 lg:px-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-center md:text-left">Template Library</h1>
          <p className="text-muted-foreground mt-2 text-lg text-center md:text-left">Your reusable prompt structures</p>
        </div>
        <RouterLink to="/items/new">
          <Button size="lg" className="h-14 px-8 text-lg font-bold shadow-lg hover:shadow-xl transition-all gap-3">
            <FontAwesomeIcon icon={faPlus} />
            Create New
          </Button>
        </RouterLink>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="flex flex-col lg:flex-row gap-4 mb-8 bg-muted/30 p-4 rounded-3xl border border-primary/5">
        <div className="relative flex-1">
          <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Search templates by title or content..." 
            className="pl-12 h-14 bg-background border-primary/10 rounded-2xl text-lg focus-visible:ring-primary/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-6 px-4 bg-background border border-primary/10 rounded-2xl h-14 lg:w-auto">
          <div className="flex items-center gap-3">
            <Switch 
              id="roots-only" 
              checked={onlyRoots} 
              onCheckedChange={setOnlyRoots} 
              className="data-[state=checked]:bg-primary"
            />
            <Label htmlFor="roots-only" className="font-bold text-sm cursor-pointer select-none">Roots Only</Label>
          </div>
          <div className="h-6 w-px bg-primary/10 hidden md:block" />
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest hidden md:block">
            {totalCount} Results
          </div>
        </div>
      </div>

      {templates.length === 0 ? (
        <Card className="border-dashed border-2 py-20 text-center bg-muted/20">
          <CardContent className="flex flex-col items-center gap-6">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <FontAwesomeIcon icon={faLayerGroup} className="h-10 w-10 text-primary opacity-50" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold">No templates yet</h3>
              <p className="text-muted-foreground max-w-xs mx-auto">
                Create an item from scratch to generate your first template!
              </p>
            </div>
            <RouterLink to="/items/new">
              <Button variant="outline" className="mt-4 h-12 px-6">
                Get Started
              </Button>
            </RouterLink>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((tpl) => (
            <Card 
              key={tpl.id} 
              className={`group flex flex-col transition-all duration-300 overflow-hidden shadow-sm hover:shadow-xl ${
                tpl.is_root 
                  ? 'border-primary/20 bg-gradient-to-br from-background to-primary/5 ring-1 ring-primary/10' 
                  : 'border-primary/5 hover:border-primary/20'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={tpl.is_locked ? "secondary" : "outline"} className="gap-1">
                      <FontAwesomeIcon icon={tpl.is_locked ? faLock : faPenToSquare} className="h-2.5 w-2.5" />
                      {tpl.is_locked ? "Locked" : "Draft"}
                    </Badge>
                    {tpl.is_root && (
                      <Badge variant="default" className="bg-primary/90 hover:bg-primary gap-1.5 shadow-sm">
                        <FontAwesomeIcon icon={faSitemap} className="h-2 w-2" />
                        Root
                      </Badge>
                    )}
                    {!tpl.is_public && (
                      <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 gap-1 shadow-sm">
                        <FontAwesomeIcon icon={faLock} className="h-2 w-2" />
                        Private
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground font-mono">ID: {tpl.id}</span>
                    {!tpl.is_locked && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDeletingTemplate(tpl);
                        }}
                      >
                        <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <CardTitle className="text-xl group-hover:text-primary transition-colors line-clamp-1">
                  {tpl.title || "Untitled Template"}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground font-mono bg-muted/30 p-3 rounded-lg border line-clamp-4 leading-relaxed italic">
                  "{tpl.raw_content}"
                </p>
              </CardContent>
              <CardFooter className="pt-0 pb-4 px-6 flex justify-between items-center">
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-3">
                  {tpl.item_thumbnails && tpl.item_thumbnails.length > 0 && (
                    <div className="flex -space-x-3 overflow-hidden">
                      {tpl.item_thumbnails.map((url, i) => (
                        <img
                          key={i}
                          className="inline-block h-8 w-8 rounded-full ring-2 ring-background object-cover bg-muted"
                          src={url}
                          alt={`Generation ${i}`}
                        />
                      ))}
                    </div>
                  )}
                  <div>
                    <span className="text-foreground font-bold">{tpl.item_count || 0}</span> Items
                  </div>
                </div>
                {!tpl.is_locked ? (
                  <RouterLink to={`/templates/${tpl.id}/edit`}>
                    <Button variant="default" size="sm" className="gap-2 font-bold px-4">
                      Setup Now
                      <FontAwesomeIcon icon={faChevronRight} />
                    </Button>
                  </RouterLink>
                ) : (
                  <RouterLink to={`/templates/${tpl.id}`}>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className={`gap-2 font-bold px-4 transition-all ${
                        tpl.is_root 
                          ? 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 shadow-sm' 
                          : ''
                      }`}
                    >
                      View Items
                      <FontAwesomeIcon icon={faChevronRight} />
                    </Button>
                  </RouterLink>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* LOAD MORE */}
      {hasMore && !isLoading && (
        <div className="mt-12 flex justify-center pb-12">
          <Button 
            variant="outline" 
            size="lg" 
            className="h-14 px-12 rounded-2xl font-bold border-primary/20 hover:bg-primary/5 gap-3"
            onClick={() => setPage(p => p + 1)}
            disabled={isMoreLoading}
          >
            {isMoreLoading ? (
              <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
            ) : (
              <FontAwesomeIcon icon={faChevronDown} />
            )}
            Load More Templates
          </Button>
        </div>
      )}

      {/* DELETE DRAFT DIALOG */}
      <Dialog open={!!deletingTemplate} onOpenChange={(open) => !open && setDeletingTemplate(null)}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-destructive">
              <FontAwesomeIcon icon={faTrash} />
              Delete Draft
            </DialogTitle>
            <DialogDescription className="text-base py-4">
              Are you sure you want to delete <span className="font-bold text-foreground">"{deletingTemplate?.title || 'Untitled Draft'}"</span>?
              <br/><br/>
              This will permanently remove the draft and <span className="font-bold text-destructive">ALL associated items and images</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletingTemplate(null)} className="h-12 flex-1 font-bold">
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              className="h-12 flex-1 font-bold shadow-lg"
              onClick={handleDeleteDraft}
              disabled={isDeleting}
            >
              {isDeleting ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : 'Yes, Delete Draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
