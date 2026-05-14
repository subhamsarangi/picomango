import { useState, useEffect } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import api from '@/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSpinner, 
  faArrowLeft, 
  faDownload,
  faCalendarAlt,
  faHashtag,
  faLayerGroup,
  faEye,
  faTrash,
  faCopy,
  faCheck,
  faPlus,
  faArrowRight
} from '@fortawesome/free-solid-svg-icons';
import { Badge } from "@/components/ui/badge";
import Loader from '@/components/Loader';

interface Item {
  id: number;
  template: number;
  resolved_text: string;
  image_url: string;
  thumb_url: string;
  created_at: string;
  placeholder_values: Record<string, string>;
  next_template: number | null;
}

export default function ItemDetailPage() {
  useDocumentTitle('Item Details');
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const response = await api.get(`items/${id}/`);
        setItem(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchItem();
  }, [id]);

  const handleCopy = async () => {
    if (!item?.resolved_text) return;
    try {
      await navigator.clipboard.writeText(item.resolved_text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await api.delete(`items/${id}/`);
      navigate(-1);
    } catch (err) {
      console.error(err);
      alert('Failed to delete item.');
    }
  };

  if (isLoading) {
    return <Loader message="Fetching item details..." />;
  }

  if (!item) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4 bg-background">
      <h2 className="text-2xl font-bold">Item Not Found</h2>
      <Button onClick={() => navigate('/')}>Return Home</Button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-1 lg:px-4 py-8 bg-background animate-in fade-in duration-500">
      {/* HEADER ACTIONS */}
      <div className="flex justify-between items-center mb-8 gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full h-12 w-12 border bg-background shadow-sm hover:shadow-md transition-all">
          <FontAwesomeIcon icon={faArrowLeft} />
        </Button>
        <div className="flex gap-2">
          <Button variant="destructive" size="sm" className="gap-2 font-bold px-4 h-10" onClick={handleDelete}>
            <FontAwesomeIcon icon={faTrash} />
            <span className="hidden sm:inline">Delete</span>
          </Button>
          <a href={item.image_url} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" className="gap-2 font-bold px-4 h-10 border-2">
              <FontAwesomeIcon icon={faEye} />
              <span className="hidden sm:inline">View Original</span>
            </Button>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* LEFT: IMAGE PREVIEW */}
        <div className="space-y-4">
          <div className="rounded-3xl overflow-hidden border bg-muted shadow-2xl relative group">
            <img 
              src={item.thumb_url || '/placeholder.png'} 
              alt="Item Content" 
              className="w-full h-auto object-contain bg-zinc-900/5 max-h-[70vh]"
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono px-2 uppercase tracking-tighter">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faCalendarAlt} className="opacity-50" />
              {item.created_at ? new Date(item.created_at).toLocaleString() : 'Date Unknown'}
            </div>
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faHashtag} className="opacity-50" />
              Reference ID: {item.id}
            </div>
          </div>
        </div>

        {/* RIGHT: DETAILS */}
        <div className="space-y-6">
          <Card className="shadow-xl border-primary/10 overflow-hidden">
            <CardHeader className="bg-primary/5 py-4 px-6 border-b flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <FontAwesomeIcon icon={faLayerGroup} />
                Resolved Content
              </CardTitle>
              <Button 
                variant={isCopied ? "secondary" : "default"} 
                size="sm" 
                className="h-8 gap-2 font-bold transition-all px-4"
                onClick={handleCopy}
              >
                <FontAwesomeIcon icon={isCopied ? faCheck : faCopy} className={isCopied ? "text-green-500" : ""} />
                {isCopied ? "Copied!" : "Copy Prompt"}
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-lg font-mono leading-relaxed text-foreground bg-muted/20 p-5 rounded-2xl border border-primary/5 italic select-all">
                "{item.resolved_text}"
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-primary/10">
            <CardHeader className="bg-secondary/5 py-4 px-6 border-b">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
                Variable Mappings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 gap-4">
                {item.placeholder_values && Object.entries(item.placeholder_values).map(([key, value]) => (
                  <div key={key} className="flex flex-col gap-1 border-b border-muted/50 pb-3 last:border-0 last:pb-0">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60">{key}</span>
                    <span className="text-base font-medium text-foreground">{value || <span className="italic opacity-30">Null</span>}</span>
                  </div>
                ))}
                {(!item.placeholder_values || Object.keys(item.placeholder_values).length === 0) && (
                  <p className="text-sm text-muted-foreground italic">No dynamic variables used in this generation.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="pt-4 flex flex-col gap-3">
             {item.next_template && (
               <RouterLink to={`/templates/${item.next_template}/new-item`}>
                  <Button className="w-full h-14 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg gap-3">
                    <FontAwesomeIcon icon={faArrowRight} />
                    Continue Chain
                  </Button>
               </RouterLink>
             )}
             <RouterLink to={`/templates/${item.template}`}>
                <Button variant="secondary" className="w-full h-14 text-lg font-bold border hover:bg-primary/5 gap-3">
                   <FontAwesomeIcon icon={faLayerGroup} />
                   Open Base Template
                </Button>
             </RouterLink>
          </div>
        </div>

      </div>
    </div>
  );
}
