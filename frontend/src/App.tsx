import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ChatPage from './pages/ChatPage';
import AuthPage from './pages/AuthPage';
import NotFoundPage from './pages/NotFoundPage';
import { AuthGuard } from './components/AuthGuard';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';

function App() {
    return (
        <AuthProvider>
            <ThemeProvider>
                <Router>
                    <div className="min-h-screen bg-background">
                        <Routes>
                            <Route path="/" element={
                                <AuthGuard requireAuth={false}>
                                    <HomePage />
                                </AuthGuard>
                            } />
                            <Route path="/auth" element={<AuthPage />} />
                            <Route path="/chat" element={
                                <AuthGuard requireAuth={true}>
                                    <ChatPage />
                                </AuthGuard>
                            } />
                            <Route path="/chat/:sessionId" element={
                                <AuthGuard requireAuth={true}>
                                    <ChatPage />
                                </AuthGuard>
                            } />
                            <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                    </div>
                </Router>
            </ThemeProvider>
        </AuthProvider>
    );
}

export default App;
