import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/context/AuthContext';
import api from '@/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

export default function LoginPage() {
  useDocumentTitle('Login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('auth/login/', { email, password });
      login(response.data.access, response.data.refresh);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to login. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-extrabold text-center tracking-tight">Welcome Back</CardTitle>
          <CardDescription className="text-center text-base">
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-destructive/15 text-destructive text-sm p-4 rounded-lg mb-6 border border-destructive/20 font-medium">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email"
                type="email" 
                placeholder="name@example.com"
                required 
                className="h-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input 
                  id="password"
                  type={showPassword ? "text" : "password"} 
                  required 
                  className="h-11 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="h-4 w-4" />
                </button>
              </div>
            </div>
            <Button className="w-full h-11 text-base font-bold mt-2" type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : 'Sign In'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 pb-8">
          <div className="text-sm text-center text-muted-foreground">
            Don't have an account?{' '}
            <RouterLink to="/signup" className="text-primary hover:underline font-bold">
              Sign up
            </RouterLink>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
