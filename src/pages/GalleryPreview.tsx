import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "@/integrations/api/client";
import { API_BASE_URL } from "@/lib/utils";
import { Loader2, Heart, Share2, ArrowRight, Lock, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface GalleryData {
  id: number;
  title: string;
  description: string;
  event_date: string;
  cover_image: string;
  download_enabled: boolean;
  password_required: boolean;
  unlocked: boolean;
  images: Array<{
    id: number;
    image_url: string;
    image_name: string;
  }>;
}

const GalleryPreview = () => {
  const { id } = useParams<{ id: string }>();
  const [gallery, setGallery] = useState<GalleryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);

  const fetchGallery = useCallback(async (providedPassword?: string) => {
    if (!id) return;
    if (!providedPassword) setIsLoading(true);
    else setIsUnlocking(true);

    try {
      const data = await apiClient.getPublicGallery(parseInt(id), providedPassword);
      setGallery(data);
      if (providedPassword && !data.unlocked) {
        setError("Invalid password. Please try again.");
      } else {
        setError(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load gallery");
    } finally {
      setIsLoading(false);
      setIsUnlocking(false);
    }
  }, [id]);

  useEffect(() => {
    fetchGallery();
  }, [fetchGallery]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      fetchGallery(password);
    }
  };

  const getImageUrl = (path: string | undefined) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    const cleanPath = path.replace(/^\/?api\//, "").replace(/^\//, "");
    return `${API_BASE_URL}/get-image.php?path=${encodeURIComponent(cleanPath)}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Preparing your gallery...</p>
        </div>
      </div>
    );
  }

  if (error && !gallery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Gallery Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The gallery you're looking for might be private or doesn't exist.
          </p>
          <Button onClick={() => window.location.href = '/'}>Back to Home</Button>
        </div>
      </div>
    );
  }

  if (gallery && gallery.password_required && !gallery.unlocked) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        {/* Blurred Background */}
        <div className="absolute inset-0">
          <img 
            src={getImageUrl(gallery.cover_image)} 
            className="w-full h-full object-cover blur-md scale-110" 
            alt="Blur"
          />
          <div className="absolute inset-0 bg-black/60" />
        </div>

        <div className="relative z-10 w-full max-w-md p-8 text-center animate-in fade-in zoom-in-95 duration-500">
           <div className="mb-8 flex justify-center">
              <div className="h-20 w-20 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl">
                 <Lock className="h-8 w-8 text-white animate-pulse" />
              </div>
           </div>

           <h1 className="text-4xl font-bold text-white mb-3 uppercase tracking-tight">{gallery.title}</h1>
           <p className="text-white/60 mb-10 text-sm uppercase tracking-[0.2em] font-medium">This collection is password protected</p>

           <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="relative group">
                 <Input 
                   type="password"
                   placeholder="Enter collection password"
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   className="h-14 bg-white/10 border-white/20 text-white placeholder:text-white/30 text-center text-lg focus:ring-1 focus:ring-primary focus:border-primary backdrop-blur-md rounded-none transition-all duration-300 group-hover:bg-white/15"
                   autoFocus
                 />
              </div>
              <Button 
                disabled={isUnlocking}
                className="w-full h-14 bg-white text-black hover:bg-gray-200 transition-all rounded-none font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 "
              >
                {isUnlocking ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Unlock Collection <Key className="h-4 w-4" /></>}
              </Button>
           </form>

           {error && (
             <div className="mt-6 p-3 bg-red-500/20 border border-red-500/50 rounded text-red-100 text-sm animate-in shake duration-300">
               {error}
             </div>
           )}

           <div className="mt-12">
             <p className="text-white/30 text-[10px] font-bold tracking-[0.3em] uppercase">Powered by Glamour Photo Studio</p>
           </div>
        </div>
      </div>
    );
  }

  // If unlocked, show the gallery
  return (
    <div className="min-h-screen bg-white text-[#1a1a1a]">
      {/* Hero Section */}
      <div className="relative h-screen w-full overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src={getImageUrl(gallery.cover_image)} 
            alt={gallery.title}
            className="w-full h-full object-cover transform scale-105"
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
        
        <div className="relative h-full flex flex-col items-center justify-center text-center px-4">
          <div className="mb-6 opacity-90">
             <div className="flex items-center gap-2 border border-white/30 px-3 py-1.5 rounded bg-black/20 backdrop-blur-sm">
                <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                   <div className="h-4 w-4 border-2 border-white rounded-full" />
                </div>
                <span className="text-white text-sm font-semibold tracking-widest uppercase">Glamour Photo</span>
             </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 tracking-tight uppercase">
            {gallery.title}
          </h1>
          
          <p className="text-white/80 text-lg md:text-xl font-medium tracking-widest uppercase mb-12">
            {gallery.event_date ? new Date(gallery.event_date).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            }) : 'Collection'}
          </p>
          
          <Button 
            variant="outline" 
            className="bg-transparent border-white text-white hover:bg-white hover:text-black transition-all duration-300 rounded-none px-8 py-6 text-sm font-bold uppercase tracking-widest gap-2"
            onClick={() => document.getElementById('gallery-grid')?.scrollIntoView({ behavior: 'smooth' })}
          >
            View Gallery <ArrowRight className="h-4 w-4" />
          </Button>
          
          <div className="absolute bottom-12 flex flex-col items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
               <div className="h-5 w-5 border border-white rounded-md flex items-center justify-center text-[8px] text-white font-bold px-0.5">GP</div>
            </div>
            <span className="text-white/60 text-[10px] font-bold tracking-[0.3em] uppercase">Glamour Photo</span>
          </div>
        </div>
      </div>

      {/* Gallery Header Info */}
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-xl font-bold uppercase tracking-wider mb-1">{gallery.title}</h2>
          <p className="text-sm text-muted-foreground uppercase tracking-widest">Glamour Photo</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500 transition-colors">
            <Heart className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-primary transition-colors">
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Gallery Grid */}
      <div id="gallery-grid" className={`max-w-[1600px] mx-auto px-4 py-12 ${!gallery.download_enabled ? 'select-none' : ''}`}>
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
          {gallery.images.map((img) => (
            <div 
              key={img.id} 
              className="relative group overflow-hidden bg-gray-100 transition-all duration-500 break-inside-avoid"
              onContextMenu={(e) => !gallery.download_enabled && e.preventDefault()}
            >
              <img 
                src={getImageUrl(img.image_url)} 
                alt="" 
                className={`w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105 ${!gallery.download_enabled ? 'pointer-events-none' : ''}`}
                loading="lazy"
                draggable={gallery.download_enabled}
              />
              {!gallery.download_enabled && (
                <div className="absolute inset-0 z-10 bg-transparent" />
              )}
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Footer */}
      <footer className="py-20 border-t bg-gray-50 flex flex-col items-center text-center px-4">
        <div className="mb-8 h-12 w-12 rounded-full border border-gray-200 flex items-center justify-center">
           <div className="h-6 w-6 border-2 border-gray-400 rounded-full" />
        </div>
        <p className="text-sm text-gray-500 font-medium tracking-widest uppercase mb-4">Powered by Lens Booking Pro</p>
        <p className="text-xs text-gray-400 uppercase tracking-widest">&copy; {new Date().getFullYear()} Glamour Photo. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default GalleryPreview;
