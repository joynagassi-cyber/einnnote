import type { ReactNode } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Fab } from "@/components/Fab";
import { CloudBridge } from "@/components/CloudBridge";
import { ThemeSync, ToastHost } from "@/components/Layout";
import { AppShell } from "@/components/DesktopRail";
import Library from "@/pages/Library";
import ChooseMethod from "@/pages/ChooseMethod";
import Editor from "@/pages/Editor";
import Review from "@/pages/Review";
import ReviewSession from "@/pages/ReviewSession";
import ReviewSettingsPage from "@/pages/ReviewSettings";
import CloudSettingsPage from "@/pages/CloudSettings";
import CardStudio from "@/pages/CardStudio";
import NavSettingsPage from "@/pages/NavSettings";
import MindMap from "@/pages/MindMap";
import Zettelkasten from "@/pages/Zettelkasten";
import ZettelForm from "@/pages/ZettelForm";
import ZettelGraph from "@/pages/ZettelGraph";
import Learn from "@/pages/Learn";
import LessonPlayer from "@/pages/LessonPlayer";
import Settings from "@/pages/Settings";
import Appearance from "@/pages/Appearance";
import Personalization from "@/pages/Personalization";
import Preview from "@/pages/Preview";
import Spaces from "@/pages/Spaces";
import CalendarPage from "@/pages/Calendar";
import Stats from "@/pages/Stats";
import ProjectSpace from "@/pages/ProjectSpace";
import ProjectGraph from "@/pages/ProjectGraph";
import DataBackup from "@/pages/DataBackup";
import Trash from "@/pages/Trash";
import About from "@/pages/About";
import NotFound from "@/pages/NotFound";

const App = () => (
  <>
    <BrowserRouter>
      <ThemeSync />
      <CloudBridge />
      <ToastHost />
      <Shell>
        <RouteGuard>
        <Routes>
          <Route path="/" element={<Library />} />
          <Route path="/review" element={<Review />} />
          <Route path="/review/session" element={<ReviewSession />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/spaces" element={<Spaces />} />
          <Route path="/spaces/:id" element={<ProjectSpace />} />
          <Route path="/spaces/:id/graph" element={<ProjectGraph />} />
          <Route path="/new" element={<ChooseMethod />} />
          <Route path="/note/:id" element={<Editor />} />
          <Route path="/mindmap/:id" element={<MindMap />} />
          <Route path="/vault/:id" element={<Zettelkasten />} />
          <Route path="/vault/:id/new" element={<ZettelForm />} />
          <Route path="/vault/:id/graph" element={<ZettelGraph />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/learn/:lessonId" element={<LessonPlayer />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/appearance" element={<Appearance />} />
          <Route
            path="/settings/personalization"
            element={<Personalization />}
          />
          <Route path="/settings/data" element={<DataBackup />} />
          <Route path="/settings/progress" element={<Navigate to="/stats" replace />} />
          <Route path="/settings/review" element={<ReviewSettingsPage />} />
          <Route path="/settings/cloud" element={<CloudSettingsPage />} />
          <Route path="/settings/cards" element={<CardStudio />} />
          <Route path="/settings/navigation" element={<NavSettingsPage />} />
          <Route path="/settings/trash" element={<Trash />} />
          <Route path="/settings/about" element={<About />} />
          {/* Anciennes adresses : conservées pour ne pas casser un lien */}
          <Route path="/library" element={<Navigate to="/" replace />} />
          {/* « Projets », « Vaults » et leur détail ont fusionné dans
              « Espaces » : une seule hiérarchie, une seule adresse. */}
          <Route path="/projects" element={<Navigate to="/spaces" replace />} />
          <Route path="/vaults" element={<Navigate to="/spaces" replace />} />
          <Route path="/projects/:id" element={<LegacyProjectRedirect />} />
          <Route path="/projects/:id/graph" element={<LegacyProjectGraphRedirect />} />
          <Route path="/editor/:id" element={<LegacyEditorRedirect />} />
          <Route path="/zettel/:id" element={<LegacyZettelRedirect />} />
          <Route path="/zettel/:id/graph" element={<LegacyGraphRedirect />} />
          {/* Aperçu côte à côte mobile + bureau, plein écran */}
          <Route path="/preview" element={<Preview />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </RouteGuard>
      </Shell>
      {/* Le bouton de création flotte au-dessus de la coquille : une seule
          instance pour toute l’application, un seul emplacement, des actions
          qui changent avec la page (voir `src/lib/fab.ts`). */}
      <Fab />
    </BrowserRouter>
  </>
);

/** L’aperçu s’affiche sans rail : il montre l’application, pas le cadre. */
function Shell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  if (pathname.startsWith("/preview")) return <>{children}</>;
  return <AppShell>{children}</AppShell>;
}

/**
 * Un écran qui plante ne doit pas tout emporter. La clé sur le chemin
 * remet la frontière à zéro dès qu’on navigue : l’erreur reste locale.
 */
function RouteGuard({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary key={pathname} route={pathname}>
      {children}
    </ErrorBoundary>
  );
}

function LegacyProjectRedirect() {
  const parts = window.location.pathname.split("/");
  return <Navigate to={`/spaces/${parts[2] ?? ""}`} replace />;
}
function LegacyProjectGraphRedirect() {
  const parts = window.location.pathname.split("/");
  return <Navigate to={`/spaces/${parts[2] ?? ""}/graph`} replace />;
}
function LegacyEditorRedirect() {
  const id = window.location.pathname.split("/").pop() ?? "";
  return <Navigate to={`/note/${id}`} replace />;
}
function LegacyZettelRedirect() {
  const id = window.location.pathname.split("/").pop() ?? "";
  return <Navigate to={`/vault/${id}`} replace />;
}
function LegacyGraphRedirect() {
  const parts = window.location.pathname.split("/");
  const id = parts[2] ?? "";
  return <Navigate to={`/vault/${id}/graph`} replace />;
}

export default App;
