import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { compressImage } from '@/lib/imageCompression';
import api from '@/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSpinner, 
  faPlus, 
  faArrowLeft, 
  faImage,
  faLayerGroup,
  faCircleExclamation,
  faTriangleExclamation,
  faWandMagicSparkles,
  faCheck
} from '@fortawesome/free-solid-svg-icons';
import Loader from '@/components/Loader';
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
  placeholders: string[];
  is_locked: boolean;
}

export default function NewItemFromTemplatePage() {
  useDocumentTitle('New Item');
  const { id } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<Template | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Duplicate Warning State
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const response = await api.get(`templates/${id}/`);
        setTemplate(response.data);
        
        // Initialize values
        const initialValues: Record<string, string> = {};
        response.data.placeholders.forEach((p: string) => {
          initialValues[p] = '';
        });
        setValues(initialValues);
      } catch (err) {
        console.error(err);
        setError('Failed to load template.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTemplate();
  }, [id]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const originalFile = e.target.files[0];
      const compressedFile = await compressImage(originalFile);
      setImageFile(compressedFile);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(compressedFile);
    }
  };

  const handleSubmit = async (force = false) => {
    if (!imageFile) {
      setError('Please select an image for this item.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const formData = new FormData();
    formData.append('template', id!);
    formData.append('image_file', imageFile);
    formData.append('placeholder_values', JSON.stringify(values));

    try {
      const response = await api.post('items/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // If backend detected duplicate and we haven't forced it yet
      if (response.data.duplicate_warning && !force) {
        setShowDuplicateWarning(true);
        setIsSubmitting(false);
        return;
      }

      navigate(`/items/${response.data.id}`);
    } catch (err: any) {
      console.error('FULL ERROR OBJECT:', err);
      const errorData = err.response?.data;
      const errorMessage = typeof errorData === 'object' 
        ? JSON.stringify(errorData) 
        : (errorData || 'Failed to create item.');
      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <Loader message="Preparing your template form..." />;

  if (!template) return <div className="p-8 text-center">Template not found.</div>;

  return (
    <div className="max-w-4xl mx-auto px-1 lg:px-4 py-8 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full h-12 w-12 border bg-background shadow-sm hover:shadow-md transition-all">
          <FontAwesomeIcon icon={faArrowLeft} />
        </Button>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">New Item</h1>
          <p className="text-muted-foreground">Using template: <span className="text-foreground font-bold">{template.title}</span></p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl flex items-center gap-3">
          <FontAwesomeIcon icon={faCircleExclamation} />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* LEFT: IMAGE SELECTION */}
        <div className="space-y-6">
          <Card className="overflow-hidden border-primary/10 shadow-xl">
             <CardHeader className="bg-primary/5 py-4 px-6 border-b">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <FontAwesomeIcon icon={faImage} />
                  Generation Image
                </CardTitle>
             </CardHeader>
             <CardContent className="p-0">
               {imagePreview ? (
                 <div className="relative aspect-square bg-muted">
                    <img src={imagePreview} className="w-full h-full object-contain" />
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="absolute bottom-4 right-4 shadow-lg font-bold gap-2"
                      onClick={() => document.getElementById('image-upload')?.click()}
                    >
                      <FontAwesomeIcon icon={faPlus} />
                      Change
                    </Button>
                 </div>
               ) : (
                 <div 
                   className="aspect-square flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors gap-4 p-8 text-center"
                   onClick={() => document.getElementById('image-upload')?.click()}
                 >
                    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                       <FontAwesomeIcon icon={faImage} className="h-10 w-10" />
                    </div>
                    <div>
                      <p className="font-bold text-lg">Click to Upload Image</p>
                      <p className="text-sm text-muted-foreground mt-1">Select the generated image for this prompt</p>
                    </div>
                 </div>
               )}
               <input 
                 id="image-upload"
                 type="file" 
                 accept="image/*" 
                 className="hidden" 
                 onChange={handleImageChange}
               />
             </CardContent>
          </Card>
        </div>

        {/* RIGHT: PLACEHOLDER VALUES */}
        <div className="space-y-6">
          <Card className="shadow-xl border-primary/10">
            <CardHeader className="bg-secondary/5 py-4 px-6 border-b">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <FontAwesomeIcon icon={faWandMagicSparkles} className="h-3 w-3" />
                Variable Inputs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              {template.placeholders.map((p) => (
                <div key={p} className="space-y-2">
                  <Label htmlFor={p} className="text-xs font-bold uppercase tracking-widest text-primary/70">{p}</Label>
                  <Input 
                    id={p}
                    placeholder={`Enter value for ${p}...`}
                    value={values[p]}
                    onChange={(e) => setValues({...values, [p]: e.target.value})}
                    className="h-12 bg-muted/20 border-primary/10 focus:border-primary/30 text-lg font-medium"
                    disabled={isSubmitting}
                  />
                </div>
              ))}
              {template.placeholders.length === 0 && (
                <p className="text-muted-foreground italic text-sm">This template has no dynamic variables.</p>
              )}
            </CardContent>
            <CardFooter className="bg-muted/5 border-t p-6">
               <Button 
                 onClick={() => handleSubmit()} 
                 disabled={isSubmitting || !imageFile} 
                 className="w-full h-14 text-xl font-bold gap-3 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
               >
                 {isSubmitting ? (
                   <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                 ) : (
                   <FontAwesomeIcon icon={faCheck} />
                 )}
                 Generate Item
               </Button>
            </CardFooter>
          </Card>

          {/* TEMPLATE REFERENCE */}
          <Card className="bg-muted/10 border-dashed">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2 flex items-center gap-2">
                <FontAwesomeIcon icon={faLayerGroup} />
                Prompt Structure
              </p>
              <p className="text-xs font-mono italic text-muted-foreground line-clamp-3">
                "{template.raw_content}"
              </p>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* DUPLICATE WARNING DIALOG */}
      <Dialog open={showDuplicateWarning} onOpenChange={setShowDuplicateWarning}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-amber-500">
              <FontAwesomeIcon icon={faTriangleExclamation} />
              Existing Combination
            </DialogTitle>
            <DialogDescription className="text-base py-4">
              An item with these <span className="font-bold">exact variable values</span> already exists in this template. 
              <br/><br/>
              Are you sure you want to create another copy?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDuplicateWarning(false)} className="h-12 flex-1 font-bold">
              Cancel
            </Button>
            <Button 
              variant="default" 
              className="h-12 flex-1 font-bold bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => handleSubmit(true)}
            >
              Yes, Create Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
