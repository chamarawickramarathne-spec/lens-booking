import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "@/integrations/api/client";
import { API_BASE_URL } from "@/lib/utils";
import { Loader2, ArrowRight, ExternalLink, Mail, Phone, MapPin, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PortfolioData {
  photographer: {
    name: string;
    business_name: string;
    image: string;
    bio: string;
    business_email: string;
    business_phone: string;
    personal_email: string;
    personal_phone: string;
    address: string;
    website: string;
    portfolio: string;
  };
  collections: Array<{
    id: number;
    title: string;
    description: string;
    event_date: string;
    cover_image: string;
    image_count: number;
    created_at: string;
  }>;
}

const PortfolioPreview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<PortfolioData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolio = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);

    try {
      let decodedId = id;
      try {
        const decoded = atob(id);
        if (decoded.startsWith('photographer_')) {
          decodedId = decoded.replace('photographer_', '');
        }
      } catch (e) {
        // Fallback for unencrypted IDs
      }

      const response = await apiClient.getPublicPortfolio(parseInt(decodedId));
      setData(response);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load portfolio");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  const getImageUrl = (path: string | undefined) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    const cleanPath = path.replace(/^\/?api\//, "").replace(/^\//, "");
    return `${API_BASE_URL}/get-image.php?path=${encodeURIComponent(cleanPath)}`;
  };

  const handleViewGallery = (galleryId: number) => {
    const encodedId = btoa('gallery_' + galleryId);
    window.open(`/gallery/${encodedId}/preview`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Portfolio Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The photographer's portfolio you're looking for might be private or doesn't exist.
          </p>
          <Button onClick={() => window.location.href = '/'}>Back to Home</Button>
        </div>
      </div>
    );
  }

  const { photographer, collections } = data;

  return (
    <div className="min-h-screen bg-white text-[#1a1a1a]">
      {/* Hero Section */}
      <div className="relative h-[60vh] w-full overflow-hidden">
        <div className="absolute inset-0">
          {collections.length > 0 && collections[0].cover_image ? (
            <img 
              src={getImageUrl(collections[0].cover_image)} 
              alt={photographer.business_name}
              className="w-full h-full object-cover transform scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gray-900" />
          )}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
        </div>
        
        <div className="relative h-full flex flex-col items-center justify-center text-center px-4">
          <div className="mb-8 animate-in zoom-in duration-700">
             <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-white/20 bg-white/10 backdrop-blur-md shadow-2xl mx-auto flex items-center justify-center">
                {photographer.image ? (
                  <img src={getImageUrl(photographer.image)} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="h-12 w-12 border-2 border-white rounded-full opacity-50" />
                )}
             </div>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight uppercase animate-in slide-in-from-bottom-4 duration-700">
            {photographer.business_name || photographer.name}
          </h1>
          
          <p className="text-white/80 text-sm md:text-base font-medium tracking-[0.3em] uppercase mb-12 animate-in slide-in-from-bottom-4 duration-700 delay-100">
            Professional Photography Portfolio
          </p>

          <div className="flex flex-wrap justify-center gap-6 animate-in slide-in-from-bottom-4 duration-700 delay-200">
            { (photographer.business_phone || photographer.personal_phone) && (
              <span className="flex items-center gap-2 text-white/70 text-xs font-bold uppercase tracking-widest">
                <Phone className="h-3 w-3" /> {photographer.business_phone || photographer.personal_phone}
              </span>
            )}
            { (photographer.business_email || photographer.personal_email) && (
              <span className="flex items-center gap-2 text-white/70 text-xs font-bold uppercase tracking-widest">
                <Mail className="h-3 w-3" /> {photographer.business_email || photographer.personal_email}
              </span>
            )}
            { (photographer.website || photographer.portfolio) && (
              <a 
                href={photographer.website || photographer.portfolio} 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center gap-2 text-white hover:text-primary transition-colors text-xs font-bold uppercase tracking-widest underline underline-offset-4 decoration-white/30"
              >
                <Globe className="h-3 w-3" /> Website
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Bio Section */}
      {photographer.bio && (
        <div className="max-w-3xl mx-auto px-4 py-10 text-center">
          <h2 className="text-xs font-bold uppercase tracking-[0.4em] text-gray-400 mb-8">About Me</h2>
          <p className="text-xl md:text-2xl text-gray-700 leading-relaxed font-light italic">
            "{photographer.bio}"
          </p>
        </div>
      )}

      {/* Collections Grid */}
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold uppercase tracking-tight mb-2">My Collections</h2>
            <div className="h-1 w-20 bg-black" />
          </div>
          <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">{collections.length} Series</span>
        </div>

        {collections.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed">
            <p className="text-gray-400 uppercase tracking-widest font-bold">No public collections available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {collections.map((collection, index) => (
              <div 
                key={collection.id} 
                className="group cursor-pointer animate-in fade-in slide-in-from-bottom-4 duration-700"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => handleViewGallery(collection.id)}
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-gray-100 mb-6 shadow-sm group-hover:shadow-xl transition-all duration-500">
                  {collection.cover_image ? (
                    <img 
                      src={getImageUrl(collection.cover_image)} 
                      alt={collection.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <ExternalLink className="h-12 w-12 opacity-20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                      <Button variant="secondary" className="bg-white text-black hover:bg-white/90 rounded-none font-bold uppercase tracking-widest text-[10px] px-6">
                        Explore Collection
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold uppercase tracking-tight group-hover:text-primary transition-colors">{collection.title}</h3>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{collection.image_count} Photos</span>
                  </div>
                  <p className="text-xs text-gray-500 uppercase tracking-widest font-medium">
                    {collection.event_date ? new Date(collection.event_date).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric'
                    }) : 'Featured Work'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <footer className="py-32 border-t bg-gray-50 flex flex-col items-center text-center px-4">
        <div className="mb-12 h-16 w-16 rounded-full overflow-hidden border border-gray-200 flex items-center justify-center bg-white shadow-sm">
           {photographer.image ? (
             <img src={getImageUrl(photographer.image)} className="w-full h-full object-cover" alt="" />
           ) : (
             <div className="h-8 w-8 border-2 border-gray-300 rounded-full" />
           )}
        </div>
        
        <h3 className="text-2xl font-bold uppercase tracking-[0.2em] mb-4">
          {photographer.business_name || photographer.name}
        </h3>
        
        {photographer.address && (
          <p className="flex items-center gap-2 text-xs text-gray-400 font-bold uppercase tracking-widest mb-12">
            <MapPin className="h-3 w-3" /> {photographer.address}
          </p>
        )}
        
        <div className="flex flex-wrap justify-center gap-x-12 gap-y-6 text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400 mb-20">
          { (photographer.business_phone || photographer.personal_phone) && (
            <a href={`tel:${photographer.business_phone || photographer.personal_phone}`} className="hover:text-black transition-colors">
              {photographer.business_phone || photographer.personal_phone}
            </a>
          )}
          { (photographer.business_email || photographer.personal_email) && (
            <a href={`mailto:${photographer.business_email || photographer.personal_email}`} className="hover:text-black transition-colors">
              {photographer.business_email || photographer.personal_email}
            </a>
          )}
          { (photographer.website || photographer.portfolio) && (
            <a href={photographer.website || photographer.portfolio} target="_blank" rel="noreferrer" className="hover:text-black transition-colors">
              Official Website
            </a>
          )}
        </div>

        <p className="text-[10px] text-gray-300 font-medium tracking-[0.4em] uppercase mb-4">Powered by Lens Booking Pro</p>
        <p className="text-[10px] text-gray-300 uppercase tracking-widest">
          &copy; {new Date().getFullYear()} {photographer.business_name || photographer.name}. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default PortfolioPreview;
