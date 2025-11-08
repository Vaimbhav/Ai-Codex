import { useNavigate } from 'react-router-dom';
import { Sparkles, Code2, Upload } from 'lucide-react';

export default function HomePage() {
    const navigate = useNavigate();

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

                {/* CTA Button */}
                <div className="mt-12 animate-slide-up">
                    <button
                        onClick={() => navigate('/chat')}
                        className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                    >
                        Sign In to Get Started
                    </button>
                    <p className="text-sm text-muted-foreground mt-4">
                        <strong>Account Required:</strong> You must create an account and sign in to access AICodeX
                    </p>
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
