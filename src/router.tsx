import { createHashRouter, Navigate } from 'react-router-dom';
import App from './App';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Shots from './pages/Shots';
import Characters from './pages/Characters';
import Prompts from './pages/Prompts';
import Clips from './pages/Clips';
import QC from './pages/QC';
import Dubbing from './pages/Dubbing';
import Export from './pages/Export';
import Library from './pages/Library';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Help from './pages/Help';

// HashRouter：build 后直接静态托管（甚至 file://）都能跑
export const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/projects" replace /> },
      { path: 'projects', element: <Projects /> },
      { path: 'projects/:id', element: <ProjectDetail /> },
      { path: 'shots', element: <Shots /> },
      { path: 'characters', element: <Characters /> },
      { path: 'prompts', element: <Prompts /> },
      { path: 'clips', element: <Clips /> },
      { path: 'qc', element: <QC /> },
      { path: 'dubbing', element: <Dubbing /> },
      { path: 'export', element: <Export /> },
      { path: 'library', element: <Library /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'settings', element: <Settings /> },
      { path: 'help', element: <Help /> },
      { path: '*', element: <Navigate to="/projects" replace /> },
    ],
  },
]);
