import React from 'react';
import { AuthForm } from '../components/AuthForm';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AuthPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const handleAuthSuccess = () => {
        // Redirect to chat after successful authentication
        const redirectTo = searchParams.get('redirect') || '/chat';
        navigate(redirectTo);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <AuthForm onSuccess={handleAuthSuccess} />
        </div>
    );
};

export default AuthPage;