import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Image, Plus, Edit, Trash2, AlertTriangle, Upload, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import GalleryForm from "@/components/forms/GalleryForm";
import EditGalleryForm from "@/components/forms/EditGalleryForm";
import GalleryImagesManager from "@/components/GalleryImagesManager";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const Galleries = () => {
  const [galleries, setGalleries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGallery, setSelectedGallery] = useState<any>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchGalleries();
    }
  }, [user]);

  const fetchGalleries = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("galleries")
        .select(`
          *,
          clients(name),
          bookings(title)
        `)
        .eq("photographer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGalleries(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load galleries",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGallery = async (galleryId: string) => {
    try {
      // First delete all images in the gallery
      const { data: images } = await supabase
        .from("gallery_images")
        .select("image_url")
        .eq("gallery_id", galleryId);

      if (images) {
        for (const image of images) {
          const path = image.image_url.split("/").pop();
          if (path) {
            await supabase.storage
              .from("gallery-images")
              .remove([path]);
          }
        }
      }

      // Delete gallery images records
      await supabase
        .from("gallery_images")
        .delete()
        .eq("gallery_id", galleryId);

      // Delete the gallery
      const { error } = await supabase
        .from("galleries")
        .delete()
        .eq("id", galleryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Gallery deleted successfully",
      });
      
      fetchGalleries();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (selectedGallery) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <Button
                variant="outline"
                onClick={() => setSelectedGallery(null)}
                className="mb-2"
              >
                ← Back to Galleries
              </Button>
              <h2 className="text-3xl font-bold tracking-tight">{selectedGallery.title}</h2>
              <p className="text-muted-foreground">
                {selectedGallery.description || "Manage images for this gallery"}
              </p>
            </div>
          </div>

          <GalleryImagesManager gallery={selectedGallery} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Galleries</h2>
            <p className="text-muted-foreground">
              Manage client photo galleries and share them
            </p>
          </div>
          <GalleryForm
            onSuccess={fetchGalleries}
            trigger={
              <Button className="bg-gradient-primary hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" />
                Add Gallery
              </Button>
            }
          />
        </div>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Photo Galleries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading galleries...
              </div>
            ) : galleries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No galleries created yet. Add your first gallery to start organizing client photos!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Booking</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {galleries.map((gallery) => (
                      <TableRow key={gallery.id}>
                        <TableCell className="font-medium">
                          {gallery.title}
                        </TableCell>
                        <TableCell>
                          {gallery.clients?.name || "No client"}
                        </TableCell>
                        <TableCell>
                          {gallery.bookings?.title || "No booking"}
                        </TableCell>
                        <TableCell>
                          {gallery.is_public ? (
                            <Badge variant="default" className="bg-success text-success-foreground">
                              Public
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Private</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {gallery.expiry_date ? (
                            <div className="text-sm">
                              {new Date(gallery.expiry_date).toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No expiry</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {new Date(gallery.created_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedGallery(gallery)}
                            >
                              <Upload className="h-3 w-3 mr-1" />
                              Manage Images
                            </Button>
                            <EditGalleryForm
                              gallery={gallery}
                              onSuccess={fetchGalleries}
                              trigger={
                                <Button size="sm" variant="outline">
                                  <Edit className="h-3 w-3" />
                                </Button>
                              }
                            />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-destructive" />
                                    Delete Gallery
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete the gallery <strong>{gallery.title}</strong> and all its images.
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteGallery(gallery.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete Gallery
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Galleries;
