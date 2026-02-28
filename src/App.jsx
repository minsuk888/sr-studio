import { Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Calendar from './pages/Calendar';
import Analytics from './pages/Analytics';
import News from './pages/News';

function App() {
  return (
    <AppProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/news" element={<News />} />
        </Route>
      </Routes>
    </AppProvider>
  );
}

export default App;
