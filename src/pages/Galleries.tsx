import { useState, useEffect, useCallback, useRef } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Image as ImageIcon,
  Plus,
  Search,
  SlidersHorizontal,
  ChevronDown,
  LayoutGrid,
  Calendar,
  Clock,
  Star,
  MoreVertical,
  Upload,
  ExternalLink,
  Trash2,
  Info,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { API_BASE_URL } from "@/lib/utils";
import GalleryForm from "@/components/forms/GalleryForm";
import GalleryImagesManager from "@/components/GalleryImagesManager";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

interface Gallery {
  id: number;
  title: string;
  description?: string;
  event_date?: string;
  cover_image?: string;
  image_count?: number;
  created_at?: string;
  is_public?: boolean;
  set_settings?: Array<{ set_name: string; is_public: boolean }>;
}

const Galleries = () => {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGallery, setSelectedGallery] = useState<Gallery | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [localCoverImage, setLocalCoverImage] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.portfolio_cover_image) {
      setLocalCoverImage(user.portfolio_cover_image);
    }
  }, [user]);

  const getImageUrl = (path: string | undefined) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    const cleanPath = path.replace(/^\/?api\//, "").replace(/^\//, "");
    return `${API_BASE_URL}/get-image.php?path=${encodeURIComponent(cleanPath)}`;
  };

  const fetchGalleries = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.getGalleries();
      setGalleries(data || []);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load galleries",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user) {
      fetchGalleries();
    }
  }, [user, fetchGalleries]);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingCover(true);
    try {
      const response = await apiClient.uploadPortfolioCoverImage(file);
      setLocalCoverImage(response.file_path || response.filename);
      toast({
        title: "Success",
        description: "Portfolio cover image updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload portfolio cover",
        variant: "destructive",
      });
    } finally {
      setIsUploadingCover(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteCover = async () => {
    if (!window.confirm("Are you sure you want to remove the portfolio cover image?")) return;
    try {
      await apiClient.deletePortfolioCoverImage();
      setLocalCoverImage(null);
      toast({
        title: "Removed",
        description: "Portfolio cover image has been removed.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove cover image",
        variant: "destructive",
      });
    }
  };

  const handleDeleteGallery = async (galleryId: number) => {
    try {
      await apiClient.deleteGallery(galleryId);
      toast({
        title: "Success",
        description: "Collection deleted successfully",
      });
      fetchGalleries();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete collection",
        variant: "destructive",
      });
    }
  };

  const filteredGalleries = galleries.filter((gallery) =>
    gallery.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedGallery) {
    return (
      <DashboardLayout>
        <div className="h-[calc(100vh-4rem)] -m-6 overflow-hidden">
          <GalleryImagesManager 
            gallery={selectedGallery} 
            onBack={() => {
              setSelectedGallery(null);
              fetchGalleries(); // Refresh list just in case
            }} 
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row h-full min-h-[calc(100vh-theme(spacing.16)-theme(spacing.12))] gap-6">
        {/* Left Sidebar Panel (Portfolio Cover) */}
        <div className="w-full md:w-80 flex-shrink-0 flex flex-col bg-white border rounded-xl overflow-hidden self-start">
          <div className="p-4 border-b bg-[#F9FAFB]">
            <h2 className="font-semibold text-lg text-gray-900">Portfolio Settings</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="text-sm font-medium mb-3 block text-gray-700">Portfolio Cover Page</label>
              <div 
                className="relative aspect-[16/10] rounded-lg overflow-hidden group bg-secondary/50 border shadow-sm cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                {localCoverImage ? (
                  <img src={getImageUrl(localCoverImage)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Portfolio Cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/40 gap-3 bg-secondary/20">
                    <ImageIcon className="h-10 w-10" />
                    <span className="text-sm font-medium">Click to upload cover</span>
                  </div>
                )}
                
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <Button size="sm" variant="secondary" className="bg-white hover:bg-white/90 text-black border-none text-xs font-semibold shadow-lg pointer-events-none">
                    <span>
                      <ImageIcon className="h-3.5 w-3.5 mr-2 inline-block" />
                      {isUploadingCover ? "Uploading..." : "Change Cover"}
                    </span>
                  </Button>
                </div>

                {isUploadingCover && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <div className="mt-3 bg-blue-50 text-blue-800 text-xs rounded-md p-3 border border-blue-100 flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-0.5">Recommended Resolution</p>
                  <p>1920 × 1080 pixels (16:9 ratio). Max file size: 5MB.</p>
                </div>
              </div>
              {localCoverImage && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 gap-2 text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
                  onClick={handleDeleteCover}
                >
                  <Trash2 className="h-4 w-4" />
                  Remove Cover Image
                </Button>
              )}
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleCoverUpload} 
            />
          </div>
        </div>

        {/* Right Main Content */}
        <div className="flex-1 space-y-8 animate-in fade-in duration-500">
          {/* Header Section */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <h1 className="text-3xl font-semibold tracking-tight">Collections</h1>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 border-none bg-secondary/50 focus-visible:ring-1 focus-visible:ring-primary shadow-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 h-10">
                  <ExternalLink className="h-4 w-4" /> Portfolio
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem 
                  className="gap-2 cursor-pointer"
                  onClick={() => {
                    if (user) {
                      const encodedId = btoa('photographer_' + user.id);
                      navigator.clipboard.writeText(window.location.origin + `/portfolio/${encodedId}`);
                      toast({
                        title: "Portfolio Link Copied",
                        description: "Public portfolio link has been copied to your clipboard.",
                      });
                    }
                  }}
                >
                  <Search className="h-4 w-4" /> Copy public link
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="gap-2 cursor-pointer"
                  onClick={() => {
                    if (user) {
                      const encodedId = btoa('photographer_' + user.id);
                      window.open(`/portfolio/${encodedId}`, '_blank');
                    }
                  }}
                >
                  <ImageIcon className="h-4 w-4" /> View portfolio
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <GalleryForm
              onSuccess={fetchGalleries}
              trigger={
                <div className="flex">
                  <Button className="bg-primary hover:bg-primary/90 text-white rounded-r-none h-10 px-4">
                    New Collection
                  </Button>
                  <Button
                    variant="outline"
                    className="bg-primary hover:bg-primary/90 text-white rounded-l-none border-l-primary-foreground/20 h-10 px-2"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              }
            />
          </div>
        </div>

        {/* Content Section */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-[4/3] rounded-lg bg-secondary/50 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-3/4 bg-secondary/50 animate-pulse rounded" />
                  <div className="h-3 w-1/2 bg-secondary/50 animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredGalleries.length === 0 ? (
          <Card className="border-dashed border-2 bg-transparent">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-20 w-20 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
                <ImageIcon className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No collections yet</h3>
              <p className="text-muted-foreground max-w-sm mb-6">
                Create your first collection to showcase your work and share it
                with clients.
              </p>
              <GalleryForm
                onSuccess={fetchGalleries}
                trigger={
                  <Button className="bg-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Collection
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
            {filteredGalleries.map((gallery) => (
              <div
                key={gallery.id}
                className="group cursor-pointer space-y-3 transition-all duration-300"
                onClick={() => setSelectedGallery(gallery)}
              >
                <div className="relative aspect-[4/3] rounded-sm overflow-hidden bg-secondary">
                  {gallery.cover_image ? (
                    <img
                      src={getImageUrl(gallery.cover_image)}
                      alt={gallery.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                      <ImageIcon className="h-12 w-12" />
                    </div>
                  )}
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-semibold leading-tight group-hover:text-primary transition-colors">
                    {gallery.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-success" />
                      {gallery.image_count || 0} items
                    </span>
                    <span>•</span>
                    <span>
                      {gallery.event_date
                        ? new Date(gallery.event_date).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )
                        : new Date(gallery.created_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Galleries;
