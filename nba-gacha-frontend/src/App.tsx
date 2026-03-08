import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Profile from './pages/Profile';
import NbaGacha from './games/nba-gacha/NbaGacha';
import NbaBattle from './games/nba-battle/NbaBattle';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/lineup" element={<NbaGacha />} />
          <Route path="/battle" element={<NbaBattle />} />
        </Routes>
        
        <div className="global-nav-switcher">
          <Link to="/">Home</Link>
          <Link to="/lineup">Lineup</Link>
          <Link to="/battle">Battle</Link>
          <Link to="/profile">Profile</Link>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
