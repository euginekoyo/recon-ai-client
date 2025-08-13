import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { Eye, EyeOff, Lock, User, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast.ts';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils.ts';
import { useLoginMutation } from '@/store/redux/AuthApi.ts';
import bankLogo from '@/components/layout/Images/bank-logo.png';

const SignIn = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [login] = useLoginMutation();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    console.log('Submitting:', { username, password }); // Debug payload
    try {
      const response = await login({ username, password }).unwrap();
      localStorage.setItem('token', response.token);
      toast({
        title: 'Success',
        description: 'Signed in successfully.',
      });
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login Error:', error); // Debug error
      setError(error.data?.message || 'Failed to sign in. Please try again.');
      toast({
        title: 'Error',
        description: error.data?.message || 'Failed to sign in. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100/50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
          <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" />
          <div className="absolute top-0 -right-4 w-96 h-96 bg-violet-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000" />
          <div className="absolute -bottom-8 left-20 w-96 h-96 bg-emerald-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000" />
        </div>

        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <div className="text-center mb-8 animate-fade-in">
              <div className="flex items-center justify-center mb-6">
                <img src={bankLogo} alt="Bank Logo" className="h-16 w-auto" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-2">
                AuditFusion
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                Welcome back to your financial dashboard
              </p>
            </div>

            <Card className="border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl shadow-2xl shadow-slate-900/10 dark:shadow-slate-900/50 animate-slide-up animation-delay-200">
              <CardHeader className="text-center pb-8 pt-8">
                <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                  Sign In to Your Account
                </CardTitle>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                {error && (
                    <Alert variant="destructive" className="mb-6">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                          id="username"
                          type="text"
                          placeholder="Enter your username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="pl-12 h-12 rounded-3xl"
                          required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-12 pr-12 h-12 rounded-3xl"
                          required
                      />
                      <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center space-x-2">
                      <input
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-gray-600">Remember me</span>
                    </label>
                    <Link to="/forgot-password" className="text-blue-600 hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-12 rounded-3xl bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {isLoading ? (
                        <div className="flex items-center">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                          Signing in...
                        </div>
                    ) : (
                        <div className="flex items-center">
                          Sign In to Dashboard
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </div>
                    )}
                  </Button>
                </form>
                <div className="mt-6 text-center text-sm text-gray-600">
                  <Link to="/signup" className="text-blue-600 hover:underline">
                    Don't have an account? Contact your administrator
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
          <footer className="mt-8 text-center text-sm text-gray-500">
            ISTL © All Rights Reserved 2025
          </footer>
        </div>
        <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        .animate-slide-up {
          animation: slide-up 0.8s ease-out;
        }
        .animation-delay-200 { animation-delay: 0.2s; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
      </div>
  );
};

export default SignIn;