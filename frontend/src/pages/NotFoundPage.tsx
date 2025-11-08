import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

const NotFoundPage: React.FC = () => {
    const navigate = useNavigate();

    const handleGoBack = () => {
        navigate(-1);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                <div className="mb-8">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-red-100 dark:bg-red-900/20 rounded-full mb-6">
                        <span className="text-4xl font-bold text-red-600 dark:text-red-400">404</span>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                        Page Not Found
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
                        Sorry, the page you're looking for doesn't exist or has been moved.
                    </p>
                </div>

                <div className="space-y-4">
                    <Link
                        to="/"
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 no-underline"
                    >
                        <Home size={20} />
                        Go to Home Page
                    </Link>

                    <button
                        onClick={handleGoBack}
                        className="w-full flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
                    >
                        <ArrowLeft size={20} />
                        Go Back
                    </button>
                </div>                <div className="mt-8 text-sm text-gray-500 dark:text-gray-400">
                    <p>
                        If you think this is a mistake, please{' '}
                        <a
                            href="/"
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            contact support
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default NotFoundPage;