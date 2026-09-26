import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import JoinMeetingPage from "./pages/JoinMeetingPage";
import LiveMeetingPage from "./pages/LiveMeetingPage";
import SummaryPage from "./pages/SummaryPage";
import NotFound from "./pages/NotFound";
import ServiceGate from "./components/ServiceGate";
import ApiKeyDialog from "./components/ApiKeyDialog";
import { ApiKeyProvider } from "./hooks/useApiKey";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ServiceGate>
        <ApiKeyProvider>
          <ApiKeyDialog />
          <HashRouter>
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route path="/join" element={<JoinMeetingPage />} />
              <Route path="/meeting" element={<LiveMeetingPage />} />
              <Route path="/summary" element={<SummaryPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </HashRouter>
        </ApiKeyProvider>
      </ServiceGate>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
