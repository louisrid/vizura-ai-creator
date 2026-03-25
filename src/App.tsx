import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CreditsProvider } from "@/contexts/CreditsContext";
import CharacterCreator from "./pages/CharacterCreator.tsx";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import MyCharacters from "./pages/MyCharacters.tsx";
import Storage from "./pages/Storage.tsx";
import { Account, Help, Settings } from "./pages/ComingSoon.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <CreditsProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<CharacterCreator />} />
              <Route path="/create" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/characters" element={<MyCharacters />} />
              <Route path="/storage" element={<Storage />} />
              <Route path="/account" element={<Account />} />
              <Route path="/help" element={<Help />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </CreditsProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
