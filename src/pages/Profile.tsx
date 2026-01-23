import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/integrations/api/client";
import {
  User,
  Building,
  Mail,
  Phone,
  Globe,
  FileText,
  DollarSign,
  Upload,
  X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const profileSchema = z.object({
  photographer_name: z.string().min(1, "Name is required"),
  business_name: z.string().optional(),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  business_email: z
    .string()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  business_phone: z.string().optional(),
  business_address: z.string().optional(),
  bio: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  portfolio_url: z.string().url("Invalid URL").optional().or(z.literal("")),
  currency_type: z.string().min(1, "Currency is required"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const Profile = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [accessLevel, setAccessLevel] = useState<string>("Free");
  const [profileImage, setProfileImage] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const { toast } = useToast();
  const { user, updateProfile } = useAuth();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      photographer_name: "",
      business_name: "",
      email: "",
      phone: "",
      business_email: "",
      business_phone: "",
      business_address: "",
      bio: "",
      website: "",
      portfolio_url: "",
      currency_type: "USD",
    },
  });

  useEffect(() => {
    if (user) {
      // Map API user to form
      form.reset({
        photographer_name: user.full_name || "",
        business_name: user.business_name || "",
        email: user.email || "",
        phone: user.phone || "",
        business_email: user.business_email || "",
        business_phone: user.business_phone || "",
        business_address: user.business_address || "",
        bio: user.bio || "",
        website: user.website || "",
        portfolio_url: user.portfolio_url || "",
        currency_type: user.currency_type || "LKR",
      });

      // Set profile image - construct full URL if it's a relative path
      const imagePath = user.profile_picture || "";
      let imageUrl = imagePath;

      if (imagePath && !imagePath.startsWith("http")) {
        // If it's a relative path, construct full URL
        imageUrl = `http://localhost${imagePath}`;
      }

      setProfileImage(imageUrl);
      setImagePreview(imageUrl);

      // Fetch user access level
      fetchAccessLevel();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchAccessLevel = async () => {
    try {
      const response = await apiClient.getUserAccessInfo();
      if (response?.access_level?.name) {
        setAccessLevel(response.access_level.name);
      }
    } catch (error) {
      // Silently handle access level fetch error
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Error",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "Image size must be less than 5MB",
          variant: "destructive",
        });
        return;
      }

      setImageFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(profileImage);
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    setIsLoading(true);
    try {
      let uploadedImageUrl = profileImage;

      // Upload image if a new one was selected
      if (imageFile) {
        const uploadResponse = await apiClient.uploadProfileImage(imageFile);
        uploadedImageUrl = uploadResponse.file_path;

        // Construct full URL if needed
        if (uploadedImageUrl && !uploadedImageUrl.startsWith("http")) {
          uploadedImageUrl = `http://localhost${uploadedImageUrl}`;
        }
      }

      // Use API auth profile update with all fields
      await updateProfile({
        full_name: data.photographer_name,
        phone: data.phone,
        profile_picture: uploadedImageUrl,
        currency_type: data.currency_type,
        business_name: data.business_name,
        business_email: data.business_email,
        business_phone: data.business_phone,
        business_address: data.business_address,
        bio: data.bio,
        website: data.website,
        portfolio_url: data.portfolio_url,
      });

      // Update local state with new image URL
      setProfileImage(uploadedImageUrl);
      setImagePreview(uploadedImageUrl);
      setImageFile(null);

      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });

      setIsEditing(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Profile</h2>
            <p className="text-muted-foreground">
              Manage your profile information
            </p>
          </div>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
          )}
        </div>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information - {accessLevel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* Profile Image Upload Section */}
                <div className="flex flex-col items-center gap-4 pb-6 border-b">
                  <Avatar className="h-32 w-32" key={imagePreview}>
                    <AvatarImage
                      src={imagePreview}
                      alt="Profile"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    <AvatarFallback className="text-4xl">
                      {user?.full_name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>

                  {isEditing && (
                    <div className="flex gap-2">
                      <label htmlFor="profile-image-upload">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            document
                              .getElementById("profile-image-upload")
                              ?.click()
                          }
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Photo
                        </Button>
                      </label>
                      <input
                        id="profile-image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                      {imageFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveImage}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      )}
                    </div>
                  )}
                  {imageFile && (
                    <p className="text-sm text-muted-foreground">
                      New image selected: {imageFile.name}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Personal Details - Left Side */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-foreground border-b pb-2">
                      Personal Details
                    </h3>

                    <FormField
                      control={form.control}
                      name="photographer_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Photographer Name *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Your full name"
                                className="pl-10"
                                disabled={!isEditing}
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="email"
                                placeholder="your@email.com"
                                className="pl-10"
                                disabled={!isEditing}
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="+1 (555) 000-0000"
                                className="pl-10"
                                disabled={!isEditing}
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="portfolio_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Portfolio URL</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="https://portfolio.com"
                                className="pl-10"
                                disabled={!isEditing}
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="currency_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency Type *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="e.g., USD, EUR, INR"
                                className="pl-10"
                                disabled={!isEditing}
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Business Details - Right Side */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-foreground border-b pb-2">
                      Business Details
                    </h3>

                    <FormField
                      control={form.control}
                      name="business_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Name</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Your business name"
                                className="pl-10"
                                disabled={!isEditing}
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="business_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Phone</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="+1 (555) 000-0000"
                                className="pl-10"
                                disabled={!isEditing}
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="business_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="email"
                                placeholder="business@company.com"
                                className="pl-10"
                                disabled={!isEditing}
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="business_address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Address</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="123 Business St, City, State"
                                className="pl-10"
                                disabled={!isEditing}
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="https://yourwebsite.com"
                                className="pl-10"
                                disabled={!isEditing}
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Bio Section - Full Width at Bottom */}
                <div className="space-y-4 pt-4 border-t">
                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">
                          Bio
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us about yourself and your photography..."
                            className="min-h-[120px]"
                            disabled={!isEditing}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {isEditing && (
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        if (user) {
                          form.reset({
                            photographer_name: user.full_name || "",
                            business_name: user.business_name || "",
                            email: user.email || "",
                            phone: user.phone || "",
                            bio: user.bio || "",
                            website: user.website || "",
                            portfolio_url: user.portfolio_url || "",
                            currency_type: user.currency_type || "LKR",
                          });
                        }
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
