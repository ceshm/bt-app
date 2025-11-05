import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import { ThemeProvider, ThemeContext } from './context/ThemeContext';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Statistics from './pages/Statistics';
import Configuration from './pages/Configuration';
import './App.css';

const AppContent = () => {
  const { theme: currentTheme } = useContext(ThemeContext);

  return (
    <ConfigProvider
      theme={{
        algorithm: currentTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorBgContainer: currentTheme === 'dark' ? '#1c1c1c' : '#fff',
          colorBgLayout: currentTheme === 'dark' ? '#1c1c1c' : '#fff',
        },
      }}
    >
      <Router>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="statistics" element={<Statistics />} />
            <Route path="configuration" element={<Configuration />} />
          </Route>
        </Routes>
      </Router>
    </ConfigProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
