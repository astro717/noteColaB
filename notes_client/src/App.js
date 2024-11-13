import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Register from './components/Register';
import Login from './components/Login';
import Notes from './components/Notes';
import CreateNote from './components/CreateNote';
import Home from './components/Home';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home/>} />
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
                <Route path="/notes" element={<Notes />} />
                <Route path="/create_note" element={<CreateNote />} />
            </Routes>
        </Router>
    );
}

export default App;

