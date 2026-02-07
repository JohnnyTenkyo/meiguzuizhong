import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const [, navigate] = useLocation();
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [error, setError] = useState('');

  const utils = trpc.useUtils();

  const loginMutation = trpc.localAuth.login.useMutation({
    onSuccess: async (data) => {
      if (data.success && data.token) {
        // Store token in localStorage
        localStorage.setItem('auth_token', data.token);
        // Wait for auth query to complete before navigating
        await utils.auth.me.refetch();
        // Small delay to ensure state updates
        setTimeout(() => navigate('/'), 100);
      }
    },
    onError: (err) => {
      setError(err.message || '登录失败');
    },
  });

  const registerMutation = trpc.localAuth.register.useMutation({
    onSuccess: async (data) => {
      if (data.success && data.token) {
        // Store token in localStorage
        localStorage.setItem('auth_token', data.token);
        // Wait for auth query to complete before navigating
        await utils.auth.me.refetch();
        // Small delay to ensure state updates
        setTimeout(() => navigate('/'), 100);
      }
    },
    onError: (err) => {
      setError(err.message || '注册失败');
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    loginMutation.mutate({ username: loginUsername, password: loginPassword });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (registerPassword.length < 6) {
      setError('密码至少需要6个字符');
      return;
    }
    registerMutation.mutate({ username: registerUsername, password: registerPassword });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">美股智能分析</CardTitle>
          <CardDescription>登录或注册以继续</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">登录</TabsTrigger>
              <TabsTrigger value="register">注册</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="login-username" className="text-sm font-medium">
                    用户名
                  </label>
                  <Input
                    id="login-username"
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="输入用户名"
                    required
                    disabled={loginMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="login-password" className="text-sm font-medium">
                    密码
                  </label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="输入密码"
                    required
                    disabled={loginMutation.isPending}
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  登录
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="register-username" className="text-sm font-medium">
                    用户名
                  </label>
                  <Input
                    id="register-username"
                    type="text"
                    value={registerUsername}
                    onChange={(e) => setRegisterUsername(e.target.value)}
                    placeholder="3-20个字符"
                    required
                    minLength={3}
                    maxLength={20}
                    disabled={registerMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="register-password" className="text-sm font-medium">
                    密码
                  </label>
                  <Input
                    id="register-password"
                    type="password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="至少6个字符"
                    required
                    minLength={6}
                    disabled={registerMutation.isPending}
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  注册
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
