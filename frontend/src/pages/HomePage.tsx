import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Sparkles, Code2, Upload, User, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/AuthForm';
import AccessibleButton from '@/components/AccessibleButton';

export default function HomePage() {
    const navigate = useNavigate();
    const { isAuthenticated, user, setAuthMode } = useAuth();
    const [showAuthForm, setShowAuthForm] = useState(false);

    // If user is authenticated, show welcome message and navigate to chat
    if (isAuthenticated && user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
                <div className="max-w-4xl w-full text-center space-y-8">
                    {/* Welcome Section */}
                    <div className="space-y-4 animate-fade-in">
                        <div className="flex items-center justify-center gap-3 mb-6">
                            <Sparkles className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                AICodeX
                            </h1>
                        </div>

                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Welcome back, {user.name}! Ready to explore your codebase with AI?
                        </p>
                    </div>

                    {/* CTA Button */}
                    <div className="mt-12 animate-slide-up">
                        <button
                            onClick={() => navigate('/chat')}
                            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                        >
                            Go to Chat
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Show authentication form if requested
    if (showAuthForm) {
        return (
            <AuthForm
                onSuccess={() => {
                    setShowAuthForm(false);
                    // Navigation will happen automatically after successful authentication
                }}
            />
        );
    }

    // Show landing page for unauthenticated users
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            <div className="max-w-4xl w-full text-center space-y-8">
                {/* Hero Section */}
                <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-center gap-3 mb-6">
                        <Sparkles className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                        <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            AICodeX
                        </h1>
                    </div>

                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Chat with your codebase using advanced AI. Upload your files and get intelligent answers about your code.
                    </p>
                </div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-3 gap-6 mt-12">
                    <FeatureCard
                        icon={<Upload className="w-8 h-8" />}
                        title="Upload Files"
                        description="Drag and drop your code files or entire folders"
                    />
                    <FeatureCard
                        icon={<Code2 className="w-8 h-8" />}
                        title="AI Analysis"
                        description="Powered by Gemini AI for deep code understanding"
                    />
                    <FeatureCard
                        icon={<div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white text-sm font-bold">AI</span>
                        </div>}
                        title="Smart Chat"
                        description="Ask questions and get context-aware responses"
                    />
                </div>

                {/* Authentication Section */}
                <div className="mt-12 animate-slide-up space-y-6">
                    {/* Authentication Required Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md mx-auto p-8">
                        {/* Header */}
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                                <Shield className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                Authentication Required
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400">
                                Please sign in to access AICodeX
                            </p>
                        </div>

                        {/* Authentication Button */}
                        <AccessibleButton
                            onClick={() => {
                                setAuthMode('enhanced');
                                setShowAuthForm(true);
                            }}
                            variant="primary"
                            className="w-full p-4 h-auto text-left"
                        >
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-white/20 rounded-lg">
                                    <User className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 text-left">
                                    <h3 className="font-semibold text-white mb-1">
                                        Sign In or Create Account
                                    </h3>
                                    <p className="text-sm text-white/80">
                                        Get access to AICodeX with your account
                                    </p>
                                </div>
                            </div>
                        </AccessibleButton>

                        {/* Info about requirements */}
                        <div className="text-center text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800 mt-4">
                            <div className="flex items-center justify-center mb-2">
                                <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2" />
                                <p className="font-medium text-blue-900 dark:text-blue-100">Account Required</p>
                            </div>
                            <p className="text-blue-800 dark:text-blue-200">
                                All users must create an account to access the chat interface and upload files.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
    return (
        <div className="p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow duration-200">
            <div className="text-blue-600 dark:text-blue-400 mb-4 flex justify-center">
                {icon}
            </div>
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
        </div>
    );
}
