import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Plus, Play, Trash2, Clock, DollarSign, Calendar, Loader2, TrendingUp, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BacktestSession {
  id: number;
  name: string;
  initialBalance: string;
  currentBalance: string;
  startDate: number;
  currentDate: number;
  currentInterval: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  totalAssets?: string;         // 总资产（数据库字段）
  totalPnL?: string;            // 总盈亏金额（数据库字段）
  totalPnLPercent?: string;     // 总盈亏百分比（数据库字段）
  positionCount?: number;       // 持仓股票数量（后端新增字段）
}

function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

function formatDate(dateNum: number): string {
  const str = String(dateNum);
  if (str.length === 8) {
    return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
  }
  return str;
}

export default function Backtest() {
  const [, navigate] = useLocation();
  const [sessions, setSessions] = useState<BacktestSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create form
  const [newName, setNewName] = useState('');
  const [newBalance, setNewBalance] = useState('100000');
  const [newStartDate, setNewStartDate] = useState('');

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/backtest/sessions', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        // 直接使用数据库中的 totalAssets, totalPnL, totalPnLPercent
        // 不再调用详细 API 重新计算
        setSessions(data.sessions);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleCreate = async () => {
    if (!newName.trim() || !newBalance || !newStartDate) return;
    setCreating(true);

    // Convert date string to YYYYMMDD number
    const dateNum = parseInt(newStartDate.replace(/-/g, ''));

    try {
      const res = await fetch('/api/backtest/sessions', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: newName,
          initialBalance: parseFloat(newBalance),
          startDate: dateNum,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreate(false);
        setNewName('');
        setNewBalance('100000');
        setNewStartDate('');
        // Navigate to the new session
        navigate(`/backtest/${data.session.id}`);
      }
    } catch (err) {
      console.error('Failed to create session:', err);
    }
    setCreating(false);
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除这个存档吗？')) return;
    try {
      await fetch(`/api/backtest/sessions/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft size={16} className="mr-1" /> 返回
            </Button>
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-primary" />
              <h1 className="text-lg font-bold tracking-tight">回测系统</h1>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={16} className="mr-1" /> 新建存档
          </Button>
        </div>
      </header>

      <main className="container py-6 max-w-3xl space-y-6">
        {/* Create dialog */}
        {showCreate && (
          <div className="rounded-xl border border-primary/30 bg-card p-6 space-y-4">
            <h2 className="text-lg font-semibold">创建回测存档</h2>
            <p className="text-sm text-muted-foreground">
              设置虚拟账户的初始资金和模拟起始日期，创建后将进入该日期开始模拟交易。
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">存档名称</label>
                <input
                  type="text"
                  placeholder="如：2024年策略回测"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">初始资金 (USD)</label>
                <input
                  type="number"
                  placeholder="100000"
                  value={newBalance}
                  onChange={e => setNewBalance(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">模拟起始日期</label>
                <input
                  type="date"
                  value={newStartDate}
                  onChange={e => setNewStartDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={!newName.trim() || !newBalance || !newStartDate || creating}>
                {creating ? <Loader2 className="animate-spin mr-1" size={16} /> : <Play size={16} className="mr-1" />}
                创建并进入
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            </div>
          </div>
        )}

        {/* Sessions list */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="animate-spin mx-auto text-primary" size={32} />
            <p className="text-sm text-muted-foreground mt-2">加载存档...</p>
          </div>
        ) : sessions.length === 0 && !showCreate ? (
          <div className="text-center py-16">
            <Clock size={48} className="mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">暂无回测存档</h3>
            <p className="text-sm text-muted-foreground mb-4">
              创建一个虚拟账户，选择起始日期，开始模拟交易
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={16} className="mr-1" /> 创建第一个存档
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">
              我的存档 ({sessions.length})
            </h2>
            {sessions.map(session => {
              // 直接使用数据库中缓存的总资产和盈亏数据
              const totalAssets = session.totalAssets ? Number(session.totalAssets) : Number(session.currentBalance);
              const totalPnl = session.totalPnL ? Number(session.totalPnL) : 0;
              const totalPnlPercent = session.totalPnLPercent ? Number(session.totalPnLPercent) : 0;
              const posCount = session.positionCount || 0;
              const positionValue = totalAssets - Number(session.currentBalance);
              const hasMarketValue = session.totalAssets !== null && session.totalAssets !== undefined;
              
              return (
                <div
                  key={session.id}
                  onClick={() => navigate(`/backtest/${session.id}`)}
                  className="rounded-lg border border-border bg-card p-4 hover:bg-accent/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-base">{session.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        创建于 {new Date(session.createdAt).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDelete(session.id, e)}
                      className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <DollarSign size={14} className="text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">可用资金</div>
                        <div className="text-sm font-medium">${Number(session.currentBalance).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Briefcase size={14} className="text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">持仓价值{posCount > 0 ? ` (${posCount}只)` : ''}</div>
                        <div className="text-sm font-medium">${positionValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">模拟日期</div>
                        <div className="text-sm font-medium">{formatDate(session.currentDate)}</div>
                      </div>
                    </div>
                  </div>

                  {/* 总资产和盈亏 */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    {hasMarketValue ? (
                      <>
                        <div className="flex items-center gap-2">
                          <TrendingUp size={14} className="text-muted-foreground" />
                          <div>
                            <span className="text-xs text-muted-foreground">总资产: </span>
                            <span className="text-sm font-bold">${totalAssets.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            <span className="text-xs text-muted-foreground ml-2">(初始: ${Number(session.initialBalance).toLocaleString()})</span>
                          </div>
                        </div>
                        <div>
                          <div className={`text-sm font-bold ${totalPnl >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {totalPnl >= 0 ? '+' : ''}{totalPnlPercent.toFixed(2)}%
                            <span className="text-xs ml-1">
                              ({totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })})
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <TrendingUp size={14} />
                        <span className="text-xs">点击进入查看详细盈亏数据</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
