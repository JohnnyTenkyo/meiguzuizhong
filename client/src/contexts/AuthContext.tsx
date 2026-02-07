import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { trpc } from '@/lib/trpc';

interface User {
  id: number;
  username: string;
  openId: string;
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in (via session cookie)
  const { data: userData, isLoading } = trpc.auth.me.useQuery();
  const loginMutation = trpc.localAuth.login.useMutation();
  const logoutMutation = trpc.auth.logout.useMutation();

  useEffect(() => {
    if (!isLoading) {
      if (userData) {
        // Extract username from openId (format: "local:username")
        const username = userData.openId.startsWith('local:') 
          ? userData.openId.substring(6) 
          : userData.openId;
        
        setUser({
          id: userData.id,
          username,
          openId: userData.openId,
          role: userData.role,
        });
      }
      setLoading(false);
    }
  }, [userData, isLoading]);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await loginMutation.mutateAsync({ username, password });
      
      if (result.success && result.user) {
        const userUsername = result.user.openId.startsWith('local:')
          ? result.user.openId.substring(6)
          : result.user.openId;

        setUser({
          id: result.user.id,
          username: userUsername,
          openId: result.user.openId,
          role: result.user.role,
        });
        return { success: true };
      } else {
        return { success: false, error: result.error || '登录失败' };
      }
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: '登录失败，请重试' };
    }
  };

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
      setUser(null);
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
      // Force logout anyway
      setUser(null);
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
