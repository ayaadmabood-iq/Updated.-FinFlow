// Authentication page - Login and Register with Soft Launch support
import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useValidateInviteCode } from '@/hooks/useBilling';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, FileText, AlertCircle, Sparkles } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { Moon, Sun } from 'lucide-react';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

// Check if soft launch mode is enabled
const SOFT_LAUNCH = import.meta.env.VITE_SOFT_LAUNCH === 'true';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  inviteCode: SOFT_LAUNCH ? z.string().min(1, 'Invite code is required') : z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);
  const { login, register: registerUser, isAuthenticated } = useAuth();
  const validateInviteCode = useValidateInviteCode();
  const navigate = useNavigate();
  const location = useLocation();
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useTranslation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '', inviteCode: '' },
  });

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleLogin = async (data: LoginFormData) => {
    setError(null);
    try {
      await login({ email: data.email, password: data.password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const handleRegister = async (data: RegisterFormData) => {
    setError(null);

    // Validate invite code if in soft launch mode
    if (SOFT_LAUNCH && data.inviteCode) {
      try {
        const result = await validateInviteCode.mutateAsync(data.inviteCode);
        if (!result.valid) {
          setError(result.error || t('auth.invalidInviteCode'));
          return;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('auth.invalidInviteCode'));
        return;
      }
    }

    try {
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <FileText className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg">FineFlow</span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher compact />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            {SOFT_LAUNCH && (
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-500">{t('auth.betaAccess')}</span>
              </div>
            )}
            <CardTitle className="text-2xl">
              {activeTab === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
            </CardTitle>
            <CardDescription>
              {activeTab === 'login' 
                ? t('auth.loginDescription') 
                : SOFT_LAUNCH 
                  ? t('auth.registerDescriptionBeta')
                  : t('auth.registerDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'register')}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">{t('auth.login')}</TabsTrigger>
                <TabsTrigger value="register">{t('auth.register')}</TabsTrigger>
              </TabsList>

              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="login">
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">{t('auth.email')}</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      {...loginForm.register('email')}
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-sm text-destructive">
                        {loginForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">{t('auth.password')}</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      {...loginForm.register('password')}
                    />
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-destructive">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginForm.formState.isSubmitting}
                  >
                    {loginForm.formState.isSubmitting && (
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    )}
                    {t('auth.login')}
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    {t('auth.noAccount')}{' '}
                    <Button variant="link" className="p-0 h-auto" onClick={() => setActiveTab('register')}>
                      {t('auth.register')}
                    </Button>
                  </p>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                  {SOFT_LAUNCH && (
                    <div className="space-y-2">
                      <Label htmlFor="register-invite">{t('auth.inviteCode')}</Label>
                      <Input
                        id="register-invite"
                        placeholder="BETA2024"
                        {...registerForm.register('inviteCode')}
                      />
                      {registerForm.formState.errors.inviteCode && (
                        <p className="text-sm text-destructive">
                          {registerForm.formState.errors.inviteCode.message}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="register-name">{t('auth.name')}</Label>
                    <Input
                      id="register-name"
                      placeholder="John Doe"
                      {...registerForm.register('name')}
                    />
                    {registerForm.formState.errors.name && (
                      <p className="text-sm text-destructive">
                        {registerForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">{t('auth.email')}</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="you@example.com"
                      {...registerForm.register('email')}
                    />
                    {registerForm.formState.errors.email && (
                      <p className="text-sm text-destructive">
                        {registerForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">{t('auth.password')}</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="••••••••"
                      {...registerForm.register('password')}
                    />
                    {registerForm.formState.errors.password && (
                      <p className="text-sm text-destructive">
                        {registerForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-confirm">{t('auth.confirmPassword')}</Label>
                    <Input
                      id="register-confirm"
                      type="password"
                      placeholder="••••••••"
                      {...registerForm.register('confirmPassword')}
                    />
                    {registerForm.formState.errors.confirmPassword && (
                      <p className="text-sm text-destructive">
                        {registerForm.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerForm.formState.isSubmitting || validateInviteCode.isPending}
                  >
                    {(registerForm.formState.isSubmitting || validateInviteCode.isPending) && (
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    )}
                    {t('auth.register')}
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    {t('auth.hasAccount')}{' '}
                    <Button variant="link" className="p-0 h-auto" onClick={() => setActiveTab('login')}>
                      {t('auth.login')}
                    </Button>
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-sm text-muted-foreground">
        © 2024 FineFlow. All rights reserved.
      </footer>
    </div>
  );
}
