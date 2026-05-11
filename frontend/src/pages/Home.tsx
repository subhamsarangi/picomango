import { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import api from '@/api';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, 
  faSpinner, 
  faLayerGroup, 
  faPenToSquare,
  faChevronRight,
  faCircleCheck,
  faLock
} from '@fortawesome/free-solid-svg-icons';
import { Badge } from "@/components/ui/badge";
import Loader from '@/components/Loader';

interface Template {
  id: number;
  title: string;
  raw_content: string;
  is_locked: boolean;
  item_count: number;
  created_at: string;
}

export default function Home() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await api.get('templates/');
        setTemplates(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTemplates();
  }, []);

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
            <Card key={tpl.id} className="group flex flex-col border-primary/5 hover:border-primary/20 hover:shadow-xl transition-all duration-300 overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant={tpl.is_locked ? "secondary" : "outline"} className="gap-1">
                    <FontAwesomeIcon icon={tpl.is_locked ? faLock : faPenToSquare} className="h-2.5 w-2.5" />
                    {tpl.is_locked ? "Locked" : "Draft"}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-mono">ID: {tpl.id}</span>
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
                <div className="text-sm font-medium text-muted-foreground">
                  <span className="text-foreground font-bold">{tpl.item_count || 0}</span> Items
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
                    <Button variant="secondary" size="sm" className="gap-2 font-bold px-4">
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
    </div>
  );
}
