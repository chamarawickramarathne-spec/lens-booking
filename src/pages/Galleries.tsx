import { useState, useEffect, useCallback } from "react";
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
}

const Galleries = () => {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGallery, setSelectedGallery] = useState<Gallery | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

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
        <div className="h-screen -m-8 overflow-hidden">
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
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
            <Button variant="ghost" className="text-sm font-medium">
              View Presets
            </Button>
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

        {/* Filters Section */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-1">
          <div className="flex flex-wrap items-center gap-2">
            {[
              "Status",
              "Category Tag",
              "Event Date",
              "Expiry Date",
              "Starred",
            ].map((filter) => (
              <Button
                key={filter}
                variant="outline"
                size="sm"
                className="bg-secondary/30 border-none h-8 text-xs font-medium px-3 rounded-full hover:bg-secondary/50"
              >
                {filter} <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
              <LayoutGrid className="h-4 w-4" />
            </Button>
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
    </DashboardLayout>
  );
};

export default Galleries;
