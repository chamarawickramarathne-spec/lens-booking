import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen relative bg-background flex items-center justify-center p-4 overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-primary rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-orange-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" style={{ animationDelay: "2s" }}></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-rose-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" style={{ animationDelay: "4s" }}></div>
      
      <div className="w-full max-w-md relative z-10 flex flex-col items-center justify-center">
        <div className="w-full mb-4">
          <Link to="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors group">
            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>
        </div>
        
        <div className="w-full">
          <div className="bg-card/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-border/50 relative overflow-hidden">
            {/* Subtle top border glow to match card themes */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60"></div>
            
            <div className="text-center mb-8 mt-2">
              <div className="flex justify-center mb-6">
                <img src="/hireartist_logo_dim.png" alt="HireArtist Logo" className="h-12 w-auto object-contain drop-shadow-sm" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">{title}</h1>
              <p className="text-muted-foreground">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;