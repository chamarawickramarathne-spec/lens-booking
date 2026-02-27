import { useState, useEffect, useCallback } from "react";
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
  Lock,
  Download,
  Heart,
  ShoppingCart,
  RefreshCw,
  Wrench,
  Palette,
  Rss,
  Info,
  X,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Gallery {
  id: number;
  title: string;
  event_date?: string;
  cover_image?: string;
}

interface GalleryImage {
  id: number;
  image_url: string;
  image_name?: string;
  file_size?: number;
}

interface GalleryImagesManagerProps {
  gallery: Gallery;
  onBack: () => void;
}

const GalleryImagesManager = ({ gallery, onBack }: GalleryImagesManagerProps) => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("photos");
  const [settingsTab, setSettingsTab] = useState("general");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const getImageUrl = (path: string | undefined) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    // Remove /api/ prefix if it exists in DB path
    const cleanPath = path.replace(/^\/?api\//, "").replace(/^\//, "");
    return `${API_BASE_URL}/get-image.php?path=${encodeURIComponent(cleanPath)}`;
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
        await apiClient.uploadGalleryImage(gallery.id, file);
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
    <div className="flex flex-col h-full -mt-6 -mx-6 bg-background animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-background sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 hover:bg-secondary/80">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{gallery.title}</h1>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 rounded-full px-2 py-0 text-[10px] uppercase font-bold tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5" />
                Published
              </Badge>
              <ChevronDown className="h-4 w-4 text-muted-foreground cursor-pointer" />
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
              <DropdownMenuItem className="gap-2"><ExternalLink className="h-4 w-4" /> Get direct link</DropdownMenuItem>
              <DropdownMenuItem className="gap-2"><Clock className="h-4 w-4" /> View email history</DropdownMenuItem>
              <DropdownMenuItem className="gap-2"><Settings className="h-4 w-4" /> Manage presets</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive gap-2"><Trash2 className="h-4 w-4" /> Delete collection</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => window.open(`/gallery/${gallery.id}/preview`, '_blank')}
          >
            <Eye className="h-4 w-4" /> Preview
          </Button>
          
          <div className="flex items-center bg-primary rounded-md overflow-hidden h-9 ml-2 shadow-sm">
            <Button className="bg-primary hover:bg-primary/90 text-white border-r border-white/20 h-full px-4 rounded-none shadow-none font-medium">
              Share
            </Button>
            <Button variant="outline" className="bg-primary hover:bg-primary/90 text-white border-none h-full px-2 rounded-none shadow-none">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
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
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button size="sm" variant="secondary" className="bg-white hover:bg-white/90 text-black border-none text-xs font-semibold shadow-lg">
                  <ImageIcon className="h-3.5 w-3.5 mr-2" />
                  Change Cover
                </Button>
              </div>
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
                    <span className="flex items-center gap-1 text-primary cursor-pointer hover:underline">
                      <Plus className="h-3 w-3" /> Add Set
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 px-3 py-2.5 bg-primary/5 text-primary border-l-2 border-primary cursor-pointer group rounded-r-md">
                      <GripVertical className="h-4 w-4 text-muted-foreground/30 opacity-0 group-hover:opacity-100" />
                      <span className="text-sm font-semibold flex-1">Highlights ({images.length})</span>
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100" />
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === 'settings' ? (
              <div className="flex flex-col">
                <div className="p-4 uppercase text-[10px] font-bold tracking-widest text-[#9CA3AF]">
                  Settings
                </div>
                <div className="space-y-1">
                  <button 
                    onClick={() => setSettingsTab('general')}
                    className={`w-full flex items-center gap-4 px-6 py-4 transition-colors ${settingsTab === 'general' ? 'bg-[#F3F4F6] text-[#111827] border-l-4 border-[#10B981]' : 'text-[#4B5563] hover:bg-gray-50'}`}
                  >
                    <Wrench className="h-5 w-5" />
                    <span className="text-base font-medium">General</span>
                  </button>
                  <button 
                    onClick={() => setSettingsTab('privacy')}
                    className={`w-full flex items-center gap-4 px-6 py-4 transition-colors ${settingsTab === 'privacy' ? 'bg-[#F3F4F6] text-[#111827] border-l-4 border-[#10B981]' : 'text-[#4B5563] hover:bg-gray-50'}`}
                  >
                    <Lock className="h-5 w-5" />
                    <span className="text-base font-medium">Privacy</span>
                  </button>
                  <div className="flex items-center justify-between px-6 py-4 text-[#4B5563] hover:bg-gray-50 group">
                    <button 
                      onClick={() => setSettingsTab('download')}
                      className="flex items-center gap-4 flex-1 text-left"
                    >
                      <Download className="h-5 w-5" />
                      <span className="text-base font-medium">Download</span>
                    </button>
                    <Badge variant="secondary" className="bg-[#F3F4F6] text-[10px] font-bold uppercase rounded-full px-3 py-0.5">OFF</Badge>
                  </div>
                  <div className="flex items-center justify-between px-6 py-4 text-[#4B5563] hover:bg-gray-50 group">
                    <button 
                      onClick={() => setSettingsTab('favorite')}
                      className="flex items-center gap-4 flex-1 text-left"
                    >
                      <Heart className="h-5 w-5" />
                      <span className="text-base font-medium">Favorite</span>
                    </button>
                    <Badge className="bg-[#ECFDF5] text-[#059669] text-[10px] font-bold uppercase rounded-full px-3 py-0.5 shadow-none hover:bg-[#ECFDF5]">ON</Badge>
                  </div>
                  <div className="flex items-center justify-between px-6 py-4 text-[#4B5563] hover:bg-gray-50 opacity-60">
                    <div className="flex items-center gap-4">
                      <ShoppingCart className="h-5 w-5" />
                      <span className="text-base font-medium">Store</span>
                    </div>
                    <Badge variant="secondary" className="bg-[#F3F4F6] text-[10px] font-bold uppercase rounded-full px-3 py-0.5 whitespace-nowrap">COMING SOON</Badge>
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
              <h2 className="text-2xl font-bold text-[#111827]">Highlights</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 border rounded-md px-1.5 py-1.5 bg-secondary/20 shadow-inner">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-primary bg-white shadow-sm ring-1 ring-black/5">
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                </div>
                
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
            ) : images.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center border-2 border-dashed rounded-xl bg-secondary/5">
                <div className="h-16 w-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No media in this set</h3>
                <p className="text-sm text-muted-foreground mb-6">Start by adding some beautiful photos to this collection.</p>
                <label htmlFor="media-upload" className="cursor-pointer">
                  <Button variant="outline" className="font-semibold" asChild>
                    <span>Upload First Photo</span>
                  </Button>
                </label>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {images.map((img) => (
                  <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg border bg-secondary/10 shadow-sm transition-all hover:shadow-md">
                    <img src={getImageUrl(img.image_url)} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
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
            <div className="max-w-4xl mx-auto p-12 space-y-12">
              {settingsTab === 'general' && (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-[#111827]">General Settings</h1>
                    <Info className="h-4 w-4 text-[#9CA3AF] cursor-help" />
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-base font-bold text-[#111827]">Collection Contact</Label>
                      <p className="text-sm text-[#6B7280]">Link this collection to one or more contacts and view in Studio Manager. <span className="text-[#10B981] cursor-pointer hover:underline font-medium">Learn more</span></p>
                      <Button variant="ghost" className="text-[#10B981] hover:text-[#059669] hover:bg-transparent p-0 flex items-center gap-2 font-medium">
                        <Plus className="h-4 w-4" /> Add Contact
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-base font-bold text-[#111827]">Collection URL</Label>
                      <div className="max-w-xl">
                        <Input 
                          defaultValue={gallery.title.toLowerCase().replace(/\s+/g, '-')} 
                          className="h-12 border-gray-200 focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981]"
                        />
                      </div>
                      <p className="text-sm text-[#6B7280]">Choose a unique url for visitors to access your collection.</p>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-base font-bold text-[#111827]">Category Tags</Label>
                      <div className="max-w-xl">
                        <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-white border-gray-200 min-h-[48px] focus-within:ring-1 focus-within:ring-[#10B981] focus-within:border-[#10B981]">
                          {tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="bg-[#F3F4F6] text-[#4B5563] border-none font-medium px-2 py-0.5 flex items-center gap-1">
                              {tag}
                              <button 
                                onClick={() => setTags(tags.filter((_, i) => i !== index))}
                                className="hover:text-destructive text-muted-foreground/50 transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                          <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (tagInput.trim()) {
                                  setTags([...tags, tagInput.trim()]);
                                  setTagInput("");
                                }
                              }
                            }}
                            className="flex-1 bg-transparent border-none focus:outline-none text-sm min-w-[120px] h-7"
                            placeholder={tags.length === 0 ? "Add tags e.g. wedding, outdoor..." : ""}
                          />
                        </div>
                      </div>
                      <p className="text-sm text-[#6B7280]">Add tags to categorize different collections. Press Enter to add each tag.</p>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-base font-bold text-[#111827]">Default Watermark</Label>
                      <div className="max-w-xl">
                        <Select defaultValue="glamour">
                          <SelectTrigger className="h-12 border-gray-200">
                            <SelectValue placeholder="Select watermark" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Watermark</SelectItem>
                            <SelectItem value="glamour">Glamour watermark</SelectItem>
                            <SelectItem value="custom">Custom watermark</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === 'privacy' && (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h1 className="text-3xl font-bold text-[#111827]">Privacy Settings</h1>

                  <div className="space-y-8">
                    <div className="space-y-3">
                      <Label className="text-base font-bold text-[#111827]">Collection Password</Label>
                      <div className="max-w-xl relative">
                        <Input 
                          placeholder="Add a password" 
                          className="h-12 pr-24 border-gray-200 focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981]"
                        />
                        <button className="absolute right-4 top-1/2 -translate-y-1/2 text-[#10B981] flex items-center gap-1.5 text-sm font-semibold hover:text-[#059669]">
                          <RefreshCw className="h-3.5 w-3.5" /> Generate
                        </button>
                      </div>
                      <p className="text-sm text-[#6B7280]">Require visitors to enter this password in order to see the collection.</p>
                    </div>

                    <div className="space-y-3 opacity-60">
                      <Label className="text-base font-bold text-[#111827]">Show on Homepage</Label>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="bg-[#F3F4F6] text-[10px] font-bold uppercase rounded-full px-3 py-0.5 whitespace-nowrap">COMING SOON</Badge>
                      </div>
                      <p className="text-sm text-[#6B7280]">Show this collection on your <span className="text-[#10B981] font-medium">Homepage</span>. Manage Homepage in <span className="text-[#10B981] font-medium">Homepage settings</span>.</p>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-base font-bold text-[#111827]">Client Exclusive Access</Label>
                      <div className="flex items-center gap-3">
                        <Switch id="exclusive-access" />
                        <Label htmlFor="exclusive-access" className="text-sm text-[#111827] font-medium">Off</Label>
                      </div>
                      <p className="text-sm text-[#6B7280]">Give clients exclusive access to sets and the ability to mark photos private. <span className="text-[#10B981] cursor-pointer hover:underline font-medium">Learn more</span></p>
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === 'download' && (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-[#111827]">Download Settings</h1>
                    <Info className="h-4 w-4 text-[#9CA3AF] cursor-help" />
                  </div>

                  <div className="space-y-8">
                    <h2 className="text-lg font-bold text-[#111827] border-b-2 border-[#10B981] inline-block pb-1">General Settings</h2>
                    
                    <div className="space-y-3">
                      <Label className="text-base font-bold text-[#111827]">Photo Download</Label>
                      <div className="flex items-center gap-3">
                        <Switch id="photo-download" />
                        <Label htmlFor="photo-download" className="text-sm text-[#111827] font-medium">Off</Label>
                      </div>
                      <p className="text-sm text-[#6B7280]">Allow visitors to download photos in your gallery</p>
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === 'favorite' && (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-[#111827]">Favorite Settings</h1>
                    <Info className="h-4 w-4 text-[#9CA3AF] cursor-help" />
                  </div>

                  <div className="space-y-10">
                    <div className="space-y-4">
                      <Label className="text-base font-bold text-[#111827]">Favorite Photos</Label>
                      <div className="flex items-center gap-3">
                        <Switch id="favorite-photos" defaultChecked />
                        <Label htmlFor="favorite-photos" className="text-sm text-[#111827] font-medium">On</Label>
                      </div>
                      <p className="text-sm text-[#6B7280]">Allow visitors to favorite photos. You can review these afterwards in Favorite Activity.</p>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-base font-bold text-[#111827]">Favorite Notes</Label>
                      <div className="flex items-center gap-3">
                        <Switch id="favorite-notes" defaultChecked />
                        <Label htmlFor="favorite-notes" className="text-sm text-[#111827] font-medium">On</Label>
                      </div>
                      <p className="text-sm text-[#6B7280]">Allow clients to add notes to photos they have favorited. <span className="text-[#10B981] cursor-pointer hover:underline font-medium">Learn more</span></p>
                    </div>

                    <div className="bg-[#F8FAFC] border border-gray-100 p-8 rounded-lg space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 flex items-center justify-center text-[#10B981]">
                          <Heart className="h-8 w-8" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="font-bold text-[#111827]">Preset Favorite Lists</h3>
                          <p className="text-sm text-[#6B7280] leading-relaxed max-w-lg">
                            Create Favorite lists and set selection limits for your clients to make selections for albums, free downloads, retouching and more.
                          </p>
                          <button className="text-[#10B981] font-bold text-sm hover:underline pt-2">Create Favorite List</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-12">
              <Zap className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-lg font-medium italic">Design and Feedback tools coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GalleryImagesManager;
