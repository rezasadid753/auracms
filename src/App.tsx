import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Admin from './pages/Admin';
import DownloadPage from './pages/DownloadPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/share/:shareId" element={<DownloadPage />} />
      </Routes>
    </BrowserRouter>
  );
}
