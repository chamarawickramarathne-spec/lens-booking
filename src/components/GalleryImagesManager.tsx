import { useState, useEffect, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Image as ImageIcon,
  Plus,
  ChevronDown,
  ChevronLeft,
  LayoutGrid,
  Calendar,
  Clock,
  Star,
  MoreVertical,
  Upload,
  ExternalLink,
  Trash2,
  Eye,
  Settings,
  Zap,
  Radio,
  GripVertical,
  MoreHorizontal,
  Loader2,
  RefreshCw,
  Palette,
  Rss,
  Info,
  X,
  Lock,
  Key,
  Download as DownloadIcon,
  Heart as HeartIcon,
  Share2,
  Globe,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { API_BASE_URL } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Gallery {
  id: number;
  title: string;
  event_date?: string;
  cover_image?: string;
  is_public?: boolean;
  download_enabled?: boolean;
  favorites_enabled?: boolean;
  share_enabled?: boolean;
  sets_enabled?: boolean;
  client_password?: string;
  set_settings?: Array<{ set_name: string; is_public: boolean }>;
}

interface GalleryImage {
  id: number;
  image_url: string;
  image_name?: string;
  file_size?: number;
  set_name?: string;
  likes_count?: number;
}

interface GalleryImagesManagerProps {
  gallery: Gallery;
  onBack: () => void;
}

const GalleryImagesManager = ({ gallery, onBack }: GalleryImagesManagerProps) => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSettingCover, setIsSettingCover] = useState(false);
  const [isCoverDialogOpen, setIsCoverDialogOpen] = useState(false);
  const [isPublic, setIsPublic] = useState<boolean>(gallery.is_public ?? true);
  const [activeTab, setActiveTab] = useState("photos");
  const [settingsTab, setSettingsTab] = useState("general");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [activeSet, setActiveSet] = useState("Highlights");
  const [newSetName, setNewSetName] = useState("");
  const [isAddSetOpen, setIsAddSetOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const getImageUrl = (path: string | undefined) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    // Remove /api/ prefix if it exists in DB path
    const cleanPath = path.replace(/^\/?api\//, "").replace(/^\//, "");
    return `${API_BASE_URL}/get-image.php?path=${encodeURIComponent(cleanPath)}`;
  };

  const sets = Array.from(new Set(images.map(img => img.set_name || "Highlights")));
  if (!sets.includes("Highlights")) sets.unshift("Highlights");
  
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [gallerySettings, setGallerySettings] = useState({
    download_enabled: gallery.download_enabled ?? true,
    favorites_enabled: gallery.favorites_enabled ?? true,
    share_enabled: gallery.share_enabled ?? true,
    sets_enabled: gallery.sets_enabled ?? true,
    is_public: gallery.is_public ?? true,
    client_password: gallery.client_password || ""
  });
  const [setSettings, setSetSettings] = useState<Record<string, boolean>>({});

  const lastGalleryId = useRef<number | null>(null);

  useEffect(() => {
    if (lastGalleryId.current === gallery.id) return;
    
    setGallerySettings({
      download_enabled: gallery.download_enabled ?? true,
      favorites_enabled: gallery.favorites_enabled ?? true,
      share_enabled: gallery.share_enabled ?? true,
      sets_enabled: gallery.sets_enabled ?? true,
      is_public: gallery.is_public ?? true,
      client_password: gallery.client_password || ""
    });
    
    if (gallery.set_settings && Array.isArray(gallery.set_settings)) {
      const settingsMap: Record<string, boolean> = {};
      gallery.set_settings.forEach(curr => {
        settingsMap[curr.set_name] = Number(curr.is_public) === 1;
      });
      setSetSettings(settingsMap);
    } else {
      setSetSettings({});
    }
    setIsPublic(gallery.is_public ?? true);
    lastGalleryId.current = gallery.id;
  }, [gallery]);

  const handleToggleSetVisibility = async (setName: string) => {
    const isNowPublic = !setSettings[setName];
    setSetSettings(prev => ({ ...prev, [setName]: isNowPublic }));
    
    try {
      await apiClient.updateSetVisibility(gallery.id, setName, isNowPublic);
      toast({
        title: "Visibility Updated",
        description: `"${setName}" is now ${isNowPublic ? 'public' : 'private (hidden from preview)'}.`,
      });
    } catch (error: any) {
      setSetSettings(prev => ({ ...prev, [setName]: !isNowPublic })); // Revert
      toast({
        title: "Error",
        description: error.message || "Failed to update set visibility",
        variant: "destructive",
      });
    }
  };

  const handleUpdateSettings = async (updates: Partial<typeof gallerySettings>) => {
    setIsUpdatingSettings(true);
    const newSettings = { ...gallerySettings, ...updates };
    try {
      await apiClient.updateGallery(gallery.id, {
        title: gallery.title,
        ...newSettings
      });
      setGallerySettings(newSettings);
      toast({
        title: "Success",
        description: "Gallery settings updated",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const filteredImages = images.filter(img => (img.set_name || "Highlights") === activeSet);

  const handleCreateSet = () => {
    if (!newSetName.trim()) return;
    if (sets.includes(newSetName.trim())) {
      toast({
        title: "Error",
        description: "Set name already exists",
        variant: "destructive",
      });
      return;
    }
    setActiveSet(newSetName.trim());
    setNewSetName("");
    setIsAddSetOpen(false);
  };

  const fetchImages = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.getGalleryImages(gallery.id);
      setImages(data || []);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load images",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [gallery.id, toast]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;
    
    const files = Array.from(e.target.files);
    
    // 1. Client-side validation
    for (const file of files) {
      // JPEG check
      if (file.type !== "image/jpeg" && file.type !== "image/jpg") {
        toast({
          title: "Invalid file type",
          description: `"${file.name}" is not a JPEG image. Only JPEG files are allowed.`,
          variant: "destructive",
        });
        if (e.target) e.target.value = "";
        return;
      }
      
      // 1MB size check
      if (file.size > 1024 * 1024) {
        toast({
          title: "File too large",
          description: `"${file.name}" exceeds the 1MB limit.`,
          variant: "destructive",
        });
        if (e.target) e.target.value = "";
        return;
      }
    }

    setIsUploading(true);
    try {
      for (const file of files) {
        await apiClient.uploadGalleryImage(gallery.id, file, activeSet);
      }
      toast({
        title: "Success",
        description: `${files.length} image(s) uploaded successfully`,
      });
      fetchImages();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload images",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleSetCover = async (imageUrl: string) => {
    setIsSettingCover(true);
    try {
      toast({ title: "Updating cover...", description: "Setting new cover image" });
      
      await apiClient.updateGallery(gallery.id, {
        cover_image: imageUrl
      });
      
      toast({
        title: "Success",
        description: "Cover image updated successfully.",
      });
      
      gallery.cover_image = imageUrl;
      fetchImages();
      setIsCoverDialogOpen(false);
      
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update cover image",
        variant: "destructive",
      });
    } finally {
      setIsSettingCover(false);
    }
  };

  const handleTogglePublish = async (publish: boolean) => {
    try {
      await apiClient.updateGallery(gallery.id, {
        is_public: publish
      });
      setIsPublic(publish);
      toast({
        title: "Success",
        description: publish ? "Gallery published successfully!" : "Gallery is now hidden.",
      });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    try {
      await apiClient.deleteGalleryImage(gallery.id, imageId);
      toast({
        title: "Success",
        description: "Image deleted successfully",
      });
      fetchImages();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete image",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-background sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 hover:bg-secondary/80">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{gallery.title}</h1>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity">
                    <Badge 
                      variant="outline" 
                      className={`rounded-full px-2 py-0 text-[10px] uppercase font-bold tracking-wider ${
                        isPublic 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                          : "bg-gray-100 text-gray-600 border-gray-200"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${isPublic ? "bg-emerald-500" : "bg-gray-400"}`} />
                      {isPublic ? "Published" : "Hidden"}
                    </Badge>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => handleTogglePublish(true)} className="gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Publish
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleTogglePublish(false)} className="gap-2">
                    <span className="h-2 w-2 rounded-full bg-gray-400" />
                    Hide (Unpublish)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="text-xs text-muted-foreground whitespace-nowrap">
              {gallery.event_date ? new Date(gallery.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date set'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                More <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem 
                className="gap-2 cursor-pointer"
                onClick={() => {
                  const encodedId = btoa('gallery_' + gallery.id);
                  navigator.clipboard.writeText(window.location.origin + `/gallery/${encodedId}/preview`);
                  toast({
                    title: "Link Copied",
                    description: "Direct link has been copied to your clipboard.",
                  });
                }}
              >
                <ExternalLink className="h-4 w-4" /> Get direct link
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive gap-2 cursor-pointer"
                onClick={async () => {
                  if (window.confirm("Are you sure you want to delete this collection?")) {
                    try {
                      await apiClient.deleteGallery(gallery.id);
                      toast({
                        title: "Success",
                        description: "Collection deleted successfully",
                      });
                      onBack();
                    } catch (error: unknown) {
                      toast({
                        title: "Error",
                        description: error instanceof Error ? error.message : "Failed to delete collection",
                        variant: "destructive",
                      });
                    }
                  }
                }}
              >
                <Trash2 className="h-4 w-4" /> Delete collection
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => {
              const encodedId = btoa('gallery_' + gallery.id);
              window.open(`/gallery/${encodedId}/preview`, '_blank');
            }}
          >
            <Eye className="h-4 w-4" /> Preview
          </Button>
          
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-80 border-r flex flex-col bg-[#F9FAFB] overflow-y-auto">
          {/* Cover Photo Area */}
          <div className="p-4">
            <div className="relative aspect-[16/10] rounded-lg overflow-hidden group bg-secondary/50 border shadow-sm">
              {gallery.cover_image ? (
                <img src={getImageUrl(gallery.cover_image)} className="w-full h-full object-cover" alt="Cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/30 gap-2">
                  <ImageIcon className="h-10 w-10" />
                </div>
              )}
              <Dialog open={isCoverDialogOpen} onOpenChange={setIsCoverDialogOpen}>
                <DialogTrigger asChild>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button size="sm" variant="secondary" className="bg-white hover:bg-white/90 text-black border-none text-xs font-semibold shadow-lg cursor-pointer">
                      <span>
                        <ImageIcon className="h-3.5 w-3.5 mr-2 inline-block" />
                        Change Cover
                      </span>
                    </Button>
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Select Cover Image</DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto pr-2">
                    {images.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        No images available. Please upload some images to the collection first.
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                        {images.map(img => (
                          <button
                            key={img.id}
                            onClick={() => handleSetCover(img.image_url)}
                            disabled={isSettingCover}
                            className="relative aspect-square rounded-md overflow-hidden group hover:ring-2 hover:ring-primary focus:outline-none transition-all"
                          >
                            <img src={getImageUrl(img.image_url)} className="w-full h-full object-cover" alt="" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-white text-xs font-bold uppercase tracking-wider">Set Cover</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Sidebar Tabs */}
          <div className="flex px-2 py-1 border-b bg-white">
            <Button 
              variant="ghost" 
              className={`flex-1 h-12 rounded-none border-b-2 transition-all gap-2 ${activeTab === 'photos' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab('photos')}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              className={`flex-1 h-12 rounded-none border-b-2 transition-all gap-2 ${activeTab === 'design' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab('design')}
            >
              <Palette className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              className={`flex-1 h-12 rounded-none border-b-2 transition-all gap-2 ${activeTab === 'settings' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab('settings')}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              className={`flex-1 h-12 rounded-none border-b-2 transition-all gap-2 ${activeTab === 'feedback' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab('feedback')}
            >
              <Rss className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'photos' ? (
              <div className="p-4 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between uppercase text-[10px] font-bold tracking-widest text-[#9CA3AF] px-1">
                    <span>Photos</span>
                    <Dialog open={isAddSetOpen} onOpenChange={setIsAddSetOpen}>
                      <DialogTrigger asChild>
                        <span className="flex items-center gap-1 text-primary cursor-pointer hover:underline">
                          <Plus className="h-3 w-3" /> Add Set
                        </span>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Create New Set</DialogTitle>
                        </DialogHeader>
                        <div className="flex items-center space-x-2 py-4">
                          <div className="grid flex-1 gap-2">
                            <Input
                              placeholder="Set Name (e.g. Ceremony, Reception)"
                              value={newSetName}
                              onChange={(e) => setNewSetName(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleCreateSet()}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-3">
                          <Button variant="outline" onClick={() => setIsAddSetOpen(false)}>Cancel</Button>
                          <Button onClick={handleCreateSet}>Create Set</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  <div className="space-y-1">
                    {sets.map((setName) => (
                      <div 
                        key={setName}
                        onClick={() => setActiveSet(setName)}
                        className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer group rounded-md transition-all ${activeSet === setName ? 'bg-primary/10 text-primary font-bold border-l-2 border-primary shadow-sm' : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'}`}
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground/30 opacity-0 group-hover:opacity-100 shrink-0" />
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className={`text-sm truncate ${setSettings[setName] === false ? 'text-muted-foreground' : ''}`}>
                            {setName} ({images.filter(img => (img.set_name || "Highlights") === setName).length})
                          </span>
                          {setSettings[setName] === false && (
                            <Badge variant="secondary" className="w-fit text-[9px] px-1 h-4 bg-orange-100 text-orange-700">Private</Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={setSettings[setName] !== false}
                            onCheckedChange={() => handleToggleSetVisibility(setName)}
                            onClick={(e) => e.stopPropagation()}
                            className="scale-75"
                            title={setSettings[setName] === false ? "Hidden from public preview" : "Visible in public preview"}
                          />
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground italic text-sm">
                Additional features coming soon...
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-white">
          {activeTab === 'photos' ? (
            <div className="max-w-6xl mx-auto p-8 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#111827]">{activeSet}</h2>
              <div className="flex items-center gap-4">
                <div>
                  <Input
                    type="file"
                    accept="image/jpeg,image/jpg"
                    multiple
                    onChange={handleUpload}
                    disabled={isUploading}
                    className="hidden"
                    id="media-upload"
                  />
                  <label htmlFor="media-upload">
                    <Button 
                      asChild 
                      disabled={isUploading}
                      className="bg-[#10B981] hover:bg-[#059669] text-white gap-2 font-bold px-6 h-11 shadow-sm"
                    >
                      <span>
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-5 w-5" />
                        )}
                        Add Media
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
            </div>

            {/* Image Grid */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
                <p className="text-muted-foreground font-medium">Loading collection...</p>
              </div>
            ) : filteredImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center border-2 border-dashed rounded-xl bg-secondary/5">
                <div className="h-16 w-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No media in this set</h3>
                <p className="text-sm text-muted-foreground mb-6">Start by adding some beautiful photos to this collection.</p>
                <label htmlFor="media-upload" className="cursor-pointer">
                  <Button variant="outline" className="font-semibold" asChild>
                    <span>Upload to {activeSet}</span>
                  </Button>
                </label>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredImages.map((img) => (
                  <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg border bg-secondary/10 shadow-sm transition-all hover:shadow-md">
                    <img src={getImageUrl(img.image_url)} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    {(img.likes_count || 0) > 0 && (
                      <div className="absolute top-2 left-2 px-2 py-1 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-bold text-red-500 flex items-center gap-1 shadow-sm">
                        <HeartIcon className="h-3 w-3 fill-current" />
                        {img.likes_count}
                      </div>
                    )}

                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        size="icon" 
                        variant="destructive" 
                        className="h-8 w-8 bg-white/90 hover:bg-white text-destructive border-none shadow-sm"
                        onClick={() => handleDeleteImage(img.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          ) : activeTab === 'settings' ? (
            <div className="max-w-3xl mx-auto p-12 space-y-12">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-gray-900">Gallery Settings</h1>
                <p className="text-muted-foreground">Configure how your clients interact with this gallery.</p>
              </div>

              <div className="space-y-8 divide-y">
                {/* Public Access */}
                <div className="pt-0 flex items-center justify-between gap-8 group">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-gray-500" />
                      <Label className="text-base font-bold text-gray-900">Public Access</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">When disabled, this gallery will only be visible to you.</p>
                  </div>
                  <Switch 
                    checked={gallerySettings.is_public}
                    onCheckedChange={(val) => handleUpdateSettings({ is_public: val })}
                    disabled={isUpdatingSettings}
                  />
                </div>

                {/* Download */}
                <div className="pt-8 flex items-center justify-between gap-8 group">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <DownloadIcon className="h-5 w-5 text-gray-500" />
                      <Label className="text-base font-bold text-gray-900">Allow Downloads</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">Give clients the ability to download full-resolution images.</p>
                  </div>
                  <Switch 
                    checked={gallerySettings.download_enabled}
                    onCheckedChange={(val) => handleUpdateSettings({ download_enabled: val })}
                    disabled={isUpdatingSettings}
                  />
                </div>

                {/* Favorites */}
                <div className="pt-8 flex items-center justify-between gap-8 group">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <HeartIcon className="h-5 w-5 text-gray-500" />
                      <Label className="text-base font-bold text-gray-900">Enable Favorites (Like)</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">Allow clients to click the heart icon and save their favorite photos.</p>
                  </div>
                  <Switch 
                    checked={gallerySettings.favorites_enabled}
                    onCheckedChange={(val) => handleUpdateSettings({ favorites_enabled: val })}
                    disabled={isUpdatingSettings}
                  />
                </div>

                {/* Sharing */}
                <div className="pt-8 flex items-center justify-between gap-8 group">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Share2 className="h-5 w-5 text-gray-500" />
                      <Label className="text-base font-bold text-gray-900">Social Sharing</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">Add a quick share button for clients to share the gallery link.</p>
                  </div>
                  <Switch 
                    checked={gallerySettings.share_enabled}
                    onCheckedChange={(val) => handleUpdateSettings({ share_enabled: val })}
                    disabled={isUpdatingSettings}
                  />
                </div>

                {/* Client Access Password */}
                <div className="pt-8 space-y-4 border-t border-gray-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Key className="h-5 w-5 text-gray-500" />
                      <Label className="text-base font-bold text-gray-900">Client Access Password</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">This password allows clients to unlock private photo sets in the public preview.</p>
                  </div>
                  <div className="flex gap-2">
                    <Input 
                      type="password"
                      placeholder="Enter client password"
                      value={gallerySettings.client_password}
                      onChange={(e) => setGallerySettings(prev => ({ ...prev, client_password: e.target.value }))}
                      className="max-w-xs rounded-none border-gray-200 focus:ring-black focus:border-black"
                    />
                    <Button 
                      variant="outline" 
                      className="rounded-none border-black hover:bg-black hover:text-white"
                      onClick={() => handleUpdateSettings({ client_password: gallerySettings.client_password })}
                      disabled={isUpdatingSettings}
                    >
                      Save Password
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-24 text-center">
              <Zap className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-xl font-medium italic mb-2">Feature coming soon!</p>
              <p className="text-sm opacity-60">Additional features are being prepared for your collections.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GalleryImagesManager;
