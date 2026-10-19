import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Library from "./pages/Library";
import ChooseMethod from "./pages/ChooseMethod";
import Editor from "./pages/Editor";
import Review from "./pages/Review";
import MindMap from "./pages/MindMap";
import Zettelkasten from "./pages/Zettelkasten";
import ZettelGraph from "./pages/ZettelGraph";
import Learn from "./pages/Learn";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/library" element={<Library />} />
          <Route path="/new" element={<ChooseMethod />} />
          <Route path="/editor/:id" element={<Editor />} />
          <Route path="/review" element={<Review />} />
          <Route path="/mindmap/:id" element={<MindMap />} />
          <Route path="/zettel/:id" element={<Zettelkasten />} />
          <Route path="/zettel/:id/graph" element={<ZettelGraph />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/settings/appearance" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
