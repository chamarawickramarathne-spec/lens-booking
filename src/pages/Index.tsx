import { useQuery } from "@tanstack/react-query";
import apiClient from "@/integrations/api/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Calendar, FileText, Images, Users, CreditCard, Check, ArrowRight } from "lucide-react";

const Index = () => {
  const { data: accessLevels, isLoading } = useQuery({
    queryKey: ["accessLevels"],
    queryFn: () => apiClient.getAccessLevels()
  });

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="flex items-center justify-center gap-2">
          <img src="/hireartist_logo_dim.png" alt="HireArtist Logo" className="h-16 w-auto drop-shadow-sm" />
        </div>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <a className="text-sm font-medium hover:text-primary transition-colors" href="#features">Features</a>
          <a className="text-sm font-medium hover:text-primary transition-colors" href="#packages">Packages</a>
          <Link to="/login">
            <Button size="sm">Login</Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full py-16 md:py-32 lg:py-48 overflow-hidden bg-background">
          {/* Animated Background Blobs */}
          <div className="absolute top-0 -left-4 w-72 h-72 bg-primary rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-orange-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" style={{ animationDelay: "2s" }}></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-rose-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" style={{ animationDelay: "4s" }}></div>
          
          <div className="container relative z-10 px-4 md:px-6">
            <div className="flex flex-col items-center space-y-6 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Smart Management for <span className="text-primary">Photographers</span>
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Streamline your photography business. Manage clients, track bookings, generate invoices, and analyze revenue all in one place.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <Link to="/login">
                  <Button size="lg" className="gap-2">
                    Get Started <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="#features">
                  <Button size="lg" variant="outline">
                    Learn More
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm text-primary font-medium">Key Features</div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Everything you need to run your studio</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed">
                Lens Booking Pro replaces messy manual records with a high-performance digital workflow.
              </p>
            </div>
            
            <div className="mx-auto grid max-w-5xl items-center gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card className="border-none shadow-md bg-muted/50 hover:bg-muted transition-colors">
                <CardHeader>
                  <Users className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Client Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Centralize your client database and never miss a detail. Track histories and preferences easily.</p>
                </CardContent>
              </Card>
              
              <Card className="border-none shadow-md bg-muted/50 hover:bg-muted transition-colors">
                <CardHeader>
                  <Calendar className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Smart Booking</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Efficiently track shoot dates and statuses. Manage pending, confirmed, and completed bookings.</p>
                </CardContent>
              </Card>
              
              <Card className="border-none shadow-md bg-muted/50 hover:bg-muted transition-colors">
                <CardHeader>
                  <FileText className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Invoicing & PDF</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Instantly generate professional, branded PDF invoices that reflect your studio's unique identity.</p>
                </CardContent>
              </Card>
              
              <Card className="border-none shadow-md bg-muted/50 hover:bg-muted transition-colors">
                <CardHeader>
                  <CreditCard className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Payment Installments</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Manage partial payments, track remaining balances, and eliminate manual calculation errors.</p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md bg-muted/50 hover:bg-muted transition-colors">
                <CardHeader>
                  <Images className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Client Galleries</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Deliver stunning photos through private, password-protected online galleries. Wow your clients.</p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md bg-muted/50 hover:bg-muted transition-colors">
                <CardHeader>
                  <Camera className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Custom Branding</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Personalize your studio profile with your business details and logos across all documents.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Packages Section */}
        <section id="packages" className="w-full py-12 md:py-24 lg:py-32 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm text-primary font-medium">Pricing</div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Simple, transparent pricing</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed">
                Choose the perfect plan for your photography business. No hidden fees.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {isLoading ? (
                <div className="col-span-3 text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading packages...</p>
                </div>
              ) : (
                accessLevels?.map((level: any, index: number) => {
                  const isRecommended = index === 1; // Highlight the middle package as recommended
                  return (
                    <Card key={level.id} className={`group flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl overflow-hidden ${isRecommended ? 'border-primary shadow-xl lg:scale-105 z-10 relative bg-card' : 'border-border/60 hover:border-primary/30'}`}>
                      {isRecommended && (
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60"></div>
                      )}
                      {isRecommended && (
                        <div className="absolute top-0 right-0 mt-5 mr-5">
                          <span className="bg-primary/10 text-primary text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-full border border-primary/20 shadow-sm backdrop-blur-sm">MOST POPULAR</span>
                        </div>
                      )}
                      <div className="p-1">
                        <CardHeader className="pb-6">
                          <CardTitle className="text-2xl font-bold tracking-tight">{level.level_name}</CardTitle>
                          <CardDescription className="text-sm mt-2 leading-relaxed">
                            {level.id === 1 ? 'Perfect for freelance photographers just starting out.' : level.id === 2 ? 'Everything you need for a growing photography studio.' : 'Advanced features for multi-photographer studios.'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="mb-6 flex flex-col pt-2 border-t border-border/50 mt-2">
                            <div className="mt-4 flex items-baseline text-4xl font-extrabold tracking-tight">
                              <span className="text-2xl font-semibold mr-1 text-muted-foreground/70">LKR</span>
                              {parseFloat(level.package_price).toLocaleString()}
                              <span className="text-muted-foreground text-sm font-medium ml-1">/mo</span>
                            </div>
                            {parseFloat(level.discount_percentage) > 0 && (
                              <div className="mt-3">
                                <span className="text-xs text-green-600 font-bold bg-green-500/10 px-2.5 py-1 rounded-full inline-flex items-center">
                                  Save {level.discount_percentage}% Annually
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <ul className="space-y-4 pt-6 border-t border-border/50">
                            <li className="flex items-start gap-3">
                              <div className="rounded-full bg-primary/10 p-1 mt-0.5 shadow-sm">
                                <Check className="h-3.5 w-3.5 text-primary" strokeWidth={3} />
                              </div>
                              <span className="text-sm font-medium">{level.max_clients ? `Up to ${level.max_clients} clients` : 'Unlimited clients'}</span>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="rounded-full bg-primary/10 p-1 mt-0.5 shadow-sm">
                                <Check className="h-3.5 w-3.5 text-primary" strokeWidth={3} />
                              </div>
                              <span className="text-sm text-foreground/80">{level.max_bookings ? `Up to ${level.max_bookings} bookings` : 'Unlimited bookings'}</span>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="rounded-full bg-primary/10 p-1 mt-0.5 shadow-sm">
                                <Check className="h-3.5 w-3.5 text-primary" strokeWidth={3} />
                              </div>
                              <span className="text-sm text-foreground/80">{level.max_storage_gb}GB Storage for Galleries</span>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="rounded-full bg-primary/10 p-1 mt-0.5 shadow-sm">
                                <Check className="h-3.5 w-3.5 text-primary" strokeWidth={3} />
                              </div>
                              <span className="text-sm text-foreground/80">Standard PDF invoices</span>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="rounded-full bg-primary/10 p-1 mt-0.5 shadow-sm">
                                <Check className="h-3.5 w-3.5 text-primary" strokeWidth={3} />
                              </div>
                              <span className="text-sm text-foreground/80">Email support</span>
                            </li>
                          </ul>
                        </CardContent>
                      </div>
                      <CardFooter className="pb-8 pt-4">
                        <Link to="/login" className="w-full">
                          <Button 
                            className={`w-full font-semibold tracking-wide transition-all ${isRecommended ? 'shadow-md shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02]' : 'hover:bg-muted'}`} 
                            variant={isRecommended ? "default" : "outline"} 
                            size="lg"
                          >
                            Get Started
                          </Button>
                        </Link>
                      </CardFooter>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t bg-background py-6 md:py-0">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 md:h-24 px-4 md:px-6">
          <div className="flex items-center gap-2">
            <img src="/hireartist_logo_dim.png" alt="HireArtist Logo" className="h-12 w-auto opacity-80 hover:opacity-100 transition-opacity drop-shadow-sm" />
          </div>
          <p className="text-sm text-muted-foreground text-center md:text-left">
            &copy; {new Date().getFullYear()} Lens Booking Pro. All rights reserved.
          </p>
          <div className="flex gap-4">
            <a href="#" className="text-sm text-muted-foreground hover:underline">Terms of Service</a>
            <a href="#" className="text-sm text-muted-foreground hover:underline">Privacy Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
