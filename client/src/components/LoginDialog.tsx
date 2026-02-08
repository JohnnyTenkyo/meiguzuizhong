import { Button } from '@/components/ui/button';
import { X, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function LoginDialog({ open, onClose }: LoginDialogProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
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
      setUsername('');
      setPassword('');
      setError('');
      onClose();
    } else {
      setError(result.error || '操作失败');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-sm mx-4 rounded-lg border border-border bg-card p-6 shadow-2xl">
        <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
          <X size={18} />
        </button>
        <h2 className="text-lg font-semibold mb-1">
          {mode === 'login' ? '登录' : '注册'}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {mode === 'login' ? '输入用户名和密码登录系统' : '创建新账户'}
        </p>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="用户名"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="密码"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 pr-10 rounded-md border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <Button
            onClick={handleSubmit}
            className="w-full"
            disabled={!username.trim() || !password.trim() || loading}
          >
            {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            {mode === 'login' ? (
              <>
                没有账户？{' '}
                <button onClick={() => { setMode('register'); setError(''); }} className="text-primary hover:underline">
                  注册
                </button>
              </>
            ) : (
              <>
                已有账户？{' '}
                <button onClick={() => { setMode('login'); setError(''); }} className="text-primary hover:underline">
                  登录
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
