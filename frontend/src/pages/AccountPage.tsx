import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/context/AuthContext';
import api from '@/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUser, 
  faEnvelope, 
  faCalendarAlt, 
  faRightFromBracket,
  faShieldHalved,
  faFingerprint
} from '@fortawesome/free-solid-svg-icons';
import Loader from '@/components/Loader';

interface UserProfile {
  id: number;
  email: string;
  username: string;
  date_joined: string;
}

export default function AccountPage() {
  useDocumentTitle('My Account');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('auth/me/');
        setProfile(response.data);
      } catch (err: any) {
        console.error(err);
        setError('Failed to load profile information.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (isLoading) {
    return <Loader message="Hunting for profile data..." />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Account</h1>
          <p className="text-muted-foreground text-lg">Manage your personal information and preferences.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <Card className="md:col-span-2 overflow-hidden border-none shadow-2xl bg-gradient-to-br from-card to-secondary/20">
          <CardHeader className="border-b bg-background/50 backdrop-blur-sm pb-8">
            <div className="flex items-center gap-6">
              <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20">
                <FontAwesomeIcon icon={faUser} className="h-10 w-10" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-2xl font-bold">{profile?.username}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-semibold px-2 py-0.5">
                    Member since {profile ? new Date(profile.date_joined).toLocaleDateString() : '...'}
                  </Badge>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-8 pb-10 space-y-8">
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-2 group">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FontAwesomeIcon icon={faEnvelope} className="text-primary/60 group-hover:text-primary transition-colors" />
                  Email Address
                </label>
                <div className="p-4 rounded-xl bg-background border group-hover:border-primary/30 transition-all duration-300 shadow-sm">
                  <span className="font-semibold text-lg">{profile?.email}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions / Status */}
        <div className="space-y-6">
          <Card className="border-none shadow-xl bg-primary/5 border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">Security Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 text-foreground">
                <FontAwesomeIcon icon={faShieldHalved} className="text-emerald-500 h-5 w-5" />
                <span className="font-bold">Account Protected</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Your account is currently secured with standard authentication.
              </p>
            </CardContent>
          </Card>

          {/* Logout Section at the end of the page area */}
          <div className="pt-4">
            <Button 
              variant="destructive" 
              className="w-full h-12 text-base font-bold shadow-lg shadow-destructive/20 gap-3 hover:scale-[1.02] active:scale-95 transition-all duration-200"
              onClick={handleLogout}
            >
              <FontAwesomeIcon icon={faRightFromBracket} />
              Sign Out
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-4 italic">
              See you later.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
