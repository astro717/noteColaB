import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Register from './components/Register';
import Login from './components/Login';
import Home from './components/Home';
import NotesPage from './components/NotesPage';

// Define PrivateRoute for protected routes
function PrivateRoute({ children }) {

    const isAuthenticated = !!document.cookie.match(/session_id/); 
    return isAuthenticated ? children : <Navigate to="/login" />;
  }

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home/>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/notes"
          element={
            <PrivateRoute>
              <NotesPage />
            </PrivateRoute>
          }
        />
        {/* Redirecciona al login si no existe otra ruta */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;

