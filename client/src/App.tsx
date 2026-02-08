import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { WatchlistProvider } from "./contexts/WatchlistContext";
import { ScreenerProvider } from "./contexts/ScreenerContext";
import ScreenerNotificationBar from "./components/ScreenerNotificationBar";
import Home from "./pages/Home";
import StockDetail from "./pages/StockDetail";
import Screener from "./pages/Screener";
import Login from "./pages/Login";
import Backtest from "./pages/Backtest";
import BacktestSimulator from "./pages/BacktestSimulator";
import { Loader2 } from "lucide-react";

function ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType<any>; path: string }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Home} />
      <Route path="/stock/:symbol">
        {(params) => <ProtectedRoute path={`/stock/${params.symbol}`} component={() => <StockDetail />} />}
      </Route>
      <Route path="/screener">
        {() => <ProtectedRoute path="/screener" component={Screener} />}
      </Route>
      <Route path="/backtest">
        {() => <ProtectedRoute path="/backtest" component={Backtest} />}
      </Route>
      <Route path="/backtest/:id">
        {() => <ProtectedRoute path="/backtest/:id" component={BacktestSimulator} />}
      </Route>
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <AuthProvider>
          <WatchlistProvider>
            <ScreenerProvider>
              <TooltipProvider>
                <Toaster />
                <ScreenerNotificationBar />
                <Router />
              </TooltipProvider>
            </ScreenerProvider>
          </WatchlistProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
