import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import api from '@/api';
import { useAuth } from '@/context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      // 1. Create account
      await api.post('auth/signup/', { email, password });
      
      // 2. Login automatically
      const loginRes = await api.post('auth/login/', { email, password });
      login(loginRes.data.access, loginRes.data.refresh);
      
      // 3. Go home
      navigate('/');
    } catch (err: any) {
      console.error('Signup Error Debug:', err);
      const errData = err.response?.data;
      if (errData) {
        if (typeof errData === 'object') {
          const messages = Object.entries(errData).map(([field, msgs]) => {
            const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
            // Just take the first error message if it's an array
            const firstMsg = Array.isArray(msgs) ? msgs[0] : msgs;
            return `${fieldName}: ${firstMsg}`;
          });
          setError(messages.join(' | '));
        } else {
          setError('Failed to sign up. Email might be in use or password too weak.');
        }
      } else {
        setError('Network error or server down.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-extrabold text-center tracking-tight">Create an Account</CardTitle>
          <CardDescription className="text-center text-base">
            Join PicoMango today
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input 
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"} 
                  required 
                  className="h-11 pr-10"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} className="h-4 w-4" />
                </button>
              </div>
            </div>

            <Button className="w-full h-11 text-base font-bold mt-2" type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : 'Sign Up'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="pb-8">
          <div className="text-sm text-center w-full text-muted-foreground">
            Already have an account?{' '}
            <RouterLink to="/login" className="text-primary hover:underline font-bold">
              Sign in
            </RouterLink>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
