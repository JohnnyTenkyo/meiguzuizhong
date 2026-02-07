import { useScreener } from '@/contexts/ScreenerContext';
import { X, Loader2, CheckCircle, Filter, ChevronRight } from 'lucide-react';
import { useLocation } from 'wouter';

export default function ScreenerNotificationBar() {
  const { currentJob, notifications, dismissNotification, cancelScreening } = useScreener();
  const [, navigate] = useLocation();

  const activeNotifications = notifications.filter(n => !n.dismissed);
  const isRunning = currentJob?.status === 'running';

  if (!isRunning && activeNotifications.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-none">
      <div className="flex flex-col items-center gap-2 pt-2 px-4">
        {/* Running job indicator */}
        {isRunning && currentJob && (
          <div className="pointer-events-auto w-full max-w-lg bg-card border border-border rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 animate-in slide-in-from-top-2">
            <Loader2 size={16} className="animate-spin text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">条件选股进行中...</div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${(currentJob.progress / currentJob.total) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {currentJob.progress}/{currentJob.total}
                </span>
              </div>
              {currentJob.results.length > 0 && (
                <div className="text-xs text-muted-foreground mt-1">
                  已找到 {currentJob.results.length} 只符合条件的股票
                </div>
              )}
            </div>
            <button
              onClick={cancelScreening}
              className="text-muted-foreground hover:text-foreground shrink-0"
              title="取消筛选"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Completion notifications */}
        {activeNotifications.map(notif => (
          <div
            key={notif.id}
            className="pointer-events-auto w-full max-w-lg bg-card border border-primary/30 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 animate-in slide-in-from-top-2"
          >
            <CheckCircle size={16} className="text-green-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{notif.message}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {new Date(notif.timestamp).toLocaleTimeString()}
              </div>
            </div>
            <button
              onClick={() => {
                navigate('/screener');
                dismissNotification(notif.id);
              }}
              className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
            >
              查看 <ChevronRight size={12} />
            </button>
            <button
              onClick={() => dismissNotification(notif.id)}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
