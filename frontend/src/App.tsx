import { Navigate, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import DataExplorer from './pages/DataExplorer';
import Recommendations from './pages/Recommendations';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';

function App() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-body">
        <Header />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/data" element={<DataExplorer />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
