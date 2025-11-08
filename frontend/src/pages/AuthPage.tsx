import React, { useEffect } from 'react';
import { AuthForm } from '../components/AuthForm';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthPage: React.FC = () => {
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuth();

    // Redirect authenticated users to home page
    useEffect(() => {
        if (isAuthenticated && user) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, user, navigate]);

    const handleAuthSuccess = () => {
        // Redirect to home after successful authentication
        // User can then navigate to chat from there
        navigate('/');
    };

    // Don't render the form if user is already authenticated
    if (isAuthenticated && user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <AuthForm onSuccess={handleAuthSuccess} />
        </div>
    );
};

export default AuthPage;