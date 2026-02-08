import { useState } from 'react';
import { useLocation } from 'wouter';
import { BarChart3, Eye, EyeOff, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
  const [, navigate] = useLocation();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('请填写用户名和密码');
      return;
    }
    if (mode === 'register' && password.length < 4) {
      setError('密码至少4位');
      return;
    }
    setLoading(true);
    setError('');

    const result = mode === 'login'
      ? await login(username, password)
      : await register(username, password);

    setLoading(false);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error || '操作失败');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <BarChart3 size={32} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">美股智能分析</h1>
          <p className="text-sm text-muted-foreground mt-1">
            专业的美股技术分析与回测系统
          </p>
        </div>

        {/* Login/Register Form */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-lg">
          <h2 className="text-lg font-semibold mb-1">
            {mode === 'login' ? '登录' : '注册'}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === 'login' ? '输入用户名和密码登录系统' : '创建新账户开始使用'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">用户名</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="请输入用户名"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">密码</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="请输入密码"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={!username.trim() || !password.trim() || loading}
            >
              {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              {mode === 'login' ? (
                <>
                  没有账户？{' '}
                  <button
                    onClick={() => { setMode('register'); setError(''); }}
                    className="text-primary hover:underline font-medium"
                  >
                    注册
                  </button>
                </>
              ) : (
                <>
                  已有账户？{' '}
                  <button
                    onClick={() => { setMode('login'); setError(''); }}
                    className="text-primary hover:underline font-medium"
                  >
                    登录
                  </button>
                </>
              )}
            </p>
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-6">
          登录即表示您同意使用条款和隐私政策
        </p>
      </div>
    </div>
  );
}
