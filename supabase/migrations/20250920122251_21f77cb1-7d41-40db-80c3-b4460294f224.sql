-- Create profiles table for photographer information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  business_name TEXT,
  photographer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  bio TEXT,
  website TEXT,
  portfolio_url TEXT,
  profile_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Photographers can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Photographers can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Photographers can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Create policies for clients
CREATE POLICY "Photographers can view their own clients" 
ON public.clients 
FOR SELECT 
USING (auth.uid() = photographer_id);

CREATE POLICY "Photographers can create clients" 
ON public.clients 
FOR INSERT 
WITH CHECK (auth.uid() = photographer_id);

CREATE POLICY "Photographers can update their own clients" 
ON public.clients 
FOR UPDATE 
USING (auth.uid() = photographer_id);

CREATE POLICY "Photographers can delete their own clients" 
ON public.clients 
FOR DELETE 
USING (auth.uid() = photographer_id);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id UUID NOT NULL,
  client_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  booking_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  package_type TEXT,
  total_amount DECIMAL(10,2),
  deposit_amount DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Create policies for bookings
CREATE POLICY "Photographers can view their own bookings" 
ON public.bookings 
FOR SELECT 
USING (auth.uid() = photographer_id);

CREATE POLICY "Photographers can create bookings" 
ON public.bookings 
FOR INSERT 
WITH CHECK (auth.uid() = photographer_id);

CREATE POLICY "Photographers can update their own bookings" 
ON public.bookings 
FOR UPDATE 
USING (auth.uid() = photographer_id);

CREATE POLICY "Photographers can delete their own bookings" 
ON public.bookings 
FOR DELETE 
USING (auth.uid() = photographer_id);

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id UUID NOT NULL,
  client_id UUID NOT NULL,
  booking_id UUID,
  invoice_number TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue')),
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Create policies for invoices
CREATE POLICY "Photographers can view their own invoices" 
ON public.invoices 
FOR SELECT 
USING (auth.uid() = photographer_id);

CREATE POLICY "Photographers can create invoices" 
ON public.invoices 
FOR INSERT 
WITH CHECK (auth.uid() = photographer_id);

CREATE POLICY "Photographers can update their own invoices" 
ON public.invoices 
FOR UPDATE 
USING (auth.uid() = photographer_id);

CREATE POLICY "Photographers can delete their own invoices" 
ON public.invoices 
FOR DELETE 
USING (auth.uid() = photographer_id);

-- Create galleries table
CREATE TABLE public.galleries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id UUID NOT NULL,
  client_id UUID,
  booking_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  access_code TEXT,
  expiry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on galleries
ALTER TABLE public.galleries ENABLE ROW LEVEL SECURITY;

-- Create policies for galleries
CREATE POLICY "Photographers can view their own galleries" 
ON public.galleries 
FOR SELECT 
USING (auth.uid() = photographer_id);

CREATE POLICY "Public galleries are viewable by everyone" 
ON public.galleries 
FOR SELECT 
USING (is_public = true);

CREATE POLICY "Photographers can create galleries" 
ON public.galleries 
FOR INSERT 
WITH CHECK (auth.uid() = photographer_id);

CREATE POLICY "Photographers can update their own galleries" 
ON public.galleries 
FOR UPDATE 
USING (auth.uid() = photographer_id);

-- Create gallery_images table
CREATE TABLE public.gallery_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gallery_id UUID NOT NULL,
  photographer_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  title TEXT,
  description TEXT,
  is_selected_by_client BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on gallery_images
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;

-- Create policies for gallery_images
CREATE POLICY "Photographers can view their own gallery images" 
ON public.gallery_images 
FOR SELECT 
USING (auth.uid() = photographer_id);

CREATE POLICY "Gallery images are viewable via public galleries" 
ON public.gallery_images 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.galleries 
    WHERE galleries.id = gallery_images.gallery_id 
    AND galleries.is_public = true
  )
);

CREATE POLICY "Photographers can create gallery images" 
ON public.gallery_images 
FOR INSERT 
WITH CHECK (auth.uid() = photographer_id);

CREATE POLICY "Photographers can update their own gallery images" 
ON public.gallery_images 
FOR UPDATE 
USING (auth.uid() = photographer_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_galleries_updated_at
  BEFORE UPDATE ON public.galleries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gallery_images_updated_at
  BEFORE UPDATE ON public.gallery_images
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();