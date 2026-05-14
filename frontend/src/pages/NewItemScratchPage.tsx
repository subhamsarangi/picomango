import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { compressImage } from '@/lib/imageCompression';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import api from '@/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faWandMagicSparkles, 
  faPenNib, 
  faImage, 
  faSpinner,
  faCloudUploadAlt,
  faTimesCircle
} from '@fortawesome/free-solid-svg-icons';

export default function NewItemScratchPage() {
  const [promptText, setPromptText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressedFile = await compressImage(file);
      setImageFile(compressedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(compressedFile);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append('prompt_text', promptText);
    formData.append('image_file', imageFile);

    try {
      const response = await api.post('items/from-scratch/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setIsLoading(false);
      navigate(`/templates/${response.data.template_id}/edit`);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col max-w-7xl mx-auto px-1 lg:px-4 overflow-hidden relative pb-24 lg:pb-6">
      <div className="py-2 lg:py-6 flex-none">
        <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight flex items-center gap-3 justify-center lg:justify-start text-center lg:text-left">
          <FontAwesomeIcon icon={faWandMagicSparkles} className="text-primary h-6 w-6 lg:h-7 lg:w-7" />
          Create Item from Scratch
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 lg:pb-6 overflow-y-auto lg:overflow-visible">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-6 flex-1 min-h-0">
          
          {/* IMAGE COLUMN */}
          <div className="flex flex-col gap-4 lg:gap-6 min-h-0 order-1 lg:order-1">
            <Card className="shadow-lg border-primary/10 flex-1 flex flex-col min-h-0 overflow-hidden">
              <CardHeader className="bg-primary/5 py-3 lg:py-4 flex-none">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FontAwesomeIcon icon={faImage} className="text-primary h-4 w-4" />
                  Example Output
                </CardTitle>
                <CardDescription>Upload your file</CardDescription>
              </CardHeader>
              <CardContent className="p-4 flex-1 flex flex-col min-h-0">
                <div className="space-y-2 flex-1 flex flex-col min-h-0">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex-none">
                    Image File
                  </Label>
                  
                  <div className="flex-1 flex flex-col min-h-0">
                    {!imagePreview ? (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 min-h-[200px] border-2 border-dashed border-muted-foreground/25 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group p-8"
                      >
                        <FontAwesomeIcon icon={faCloudUploadAlt} className="h-10 w-10 text-muted-foreground group-hover:text-primary mb-2" />
                        <p className="text-base font-medium">Click to upload</p>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          required
                        />
                      </div>
                    ) : (
                      <div className="relative flex-1 rounded-xl overflow-hidden border bg-muted group shadow-md min-h-[200px]">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-contain mx-auto block" />
                        <div className="absolute top-2 right-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          <Button 
                            type="button" 
                            variant="destructive" 
                            size="sm" 
                            onClick={removeImage}
                            className="h-8 w-8 p-0 rounded-full shadow-lg"
                          >
                            <FontAwesomeIcon icon={faTimesCircle} />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* PROMPT COLUMN */}
          <Card className="shadow-lg border-primary/10 flex flex-col min-h-0 order-2 lg:order-2">
            <CardHeader className="bg-primary/5 py-3 lg:py-4 flex-none">
              <CardTitle className="text-lg flex items-center gap-2">
                <FontAwesomeIcon icon={faPenNib} className="text-primary h-4 w-4" />
                Prompt Text
              </CardTitle>
              <CardDescription>Enter the prompt content here</CardDescription>
            </CardHeader>
            <CardContent className="p-4 flex-1 flex flex-col min-h-0">
              <div className="space-y-2 flex-1 flex flex-col min-h-0">
                <Label htmlFor="prompt" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex-none">
                  Content
                </Label>
                <Textarea
                  id="prompt"
                  required
                  placeholder="Enter the prompt text. Use placeholders like <<Name>>."
                  className="flex-1 min-h-[300px] lg:min-h-0 resize-none focus-visible:ring-primary shadow-sm text-base p-4 font-mono"
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CREATE BUTTON - FLOATING ON MOBILE, CENTERED ON DESKTOP */}
        <div className="fixed bottom-0 left-0 right-0 lg:relative lg:flex lg:justify-center bg-background/80 backdrop-blur-md lg:bg-transparent p-4 lg:py-6 lg:px-0 border-t lg:border-t-0 z-50 mt-auto">
          <Button 
            className="w-full lg:w-auto lg:min-w-[300px] lg:px-12 h-16 lg:h-18 text-xl font-bold shadow-2xl transition-all" 
            type="submit" 
            disabled={isLoading || !imageFile}
          >
            {isLoading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="mr-3 h-6 w-6 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faWandMagicSparkles} className="mr-3 h-6 w-6" />
                Create Item & Template
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
