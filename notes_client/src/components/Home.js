import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <div className="welcome-content">
        <h1 className="welcome-title">Welcome to noteColab</h1>
        <p className="welcome-subtitle">Your collaborative note-taking platform</p>
        <div className="welcome-actions">
          <button 
            className="primary-btn" 
            onClick={() => navigate('/register')}
          >
            Get Started
          </button>
          <button 
            className="secondary-btn"
            onClick={() => navigate('/login')}
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;