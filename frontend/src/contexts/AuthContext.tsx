import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AuthState, AuthMode, UserProfile } from '@/types';
import { useChatStore } from '../store/chatStore';

interface AuthContextType extends AuthState {
    setApiKey: (apiKey: string) => void;
    setAuthMode: (mode: AuthMode) => void;
    login: (user: UserProfile, token: string) => void;
    logout: () => void;
    clearApiKey: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction =
    | { type: 'SET_API_KEY'; payload: string }
    | { type: 'SET_AUTH_MODE'; payload: AuthMode }
    | { type: 'LOGIN'; payload: { user: UserProfile; token: string } }
    | { type: 'LOGOUT' }
    | { type: 'CLEAR_API_KEY' }
    | { type: 'INITIALIZE'; payload: AuthState };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
    switch (action.type) {
        case 'SET_API_KEY':
            // API key mode is no longer supported for authentication
            // Only allow setting API key if user is already authenticated
            return {
                ...state,
                apiKey: state.user ? action.payload : null,
            };

        case 'SET_AUTH_MODE':
            return {
                ...state,
                mode: 'enhanced', // Force enhanced mode only
                isAuthenticated: !!state.user,
            };

        case 'LOGIN':
            return {
                ...state,
                mode: 'enhanced',
                user: action.payload.user,
                isAuthenticated: true,
            };

        case 'LOGOUT':
            return {
                ...state,
                user: null,
                isAuthenticated: false,
                apiKey: null, // Clear API key on logout
            };

        case 'CLEAR_API_KEY':
            return {
                ...state,
                apiKey: null,
            };

        case 'INITIALIZE':
            return {
                ...action.payload,
                mode: 'enhanced', // Force enhanced mode
                isAuthenticated: !!action.payload.user, // Only authenticated if user exists
            };

        default:
            return state;
    }
};

const initialState: AuthState = {
    mode: 'enhanced',
    apiKey: null,
    user: null,
    isAuthenticated: false,
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [state, dispatch] = useReducer(authReducer, initialState);
    const { setAuthenticationStatus, initializeFromBackend, clearSessions } = useChatStore();

    // Initialize auth state from localStorage - only support enhanced mode
    useEffect(() => {
        const savedAuthToken = localStorage.getItem('auth_token');
        const savedUser = localStorage.getItem('user_profile');

        // Clear old API key mode data
        localStorage.removeItem('gemini_api_key');
        localStorage.setItem('auth_mode', 'enhanced');

        const initialAuthState: AuthState = {
            mode: 'enhanced',
            apiKey: null,
            user: null,
            isAuthenticated: false,
        };

        if (savedAuthToken && savedUser) {
            try {
                const user = JSON.parse(savedUser);
                initialAuthState.user = user;
                initialAuthState.isAuthenticated = true;

                // Load API key for authenticated users
                const savedApiKey = localStorage.getItem('user_gemini_api_key');
                if (savedApiKey) {
                    initialAuthState.apiKey = savedApiKey;
                }
            } catch (error) {
                console.error('Failed to parse saved user profile:', error);
                localStorage.removeItem('user_profile');
                localStorage.removeItem('auth_token');
            }
        }

        dispatch({ type: 'INITIALIZE', payload: initialAuthState });

        // Update chat store authentication status
        setAuthenticationStatus(initialAuthState.isAuthenticated);

        // Load chat history if user is authenticated
        if (initialAuthState.isAuthenticated) {
            setTimeout(() => {
                initializeFromBackend();
            }, 100);
        }
    }, [setAuthenticationStatus, initializeFromBackend]);

    const setApiKey = (apiKey: string) => {
        // Only allow setting API key if user is authenticated
        if (state.user) {
            // Store API key for authenticated users (for their personal use)
            localStorage.setItem('user_gemini_api_key', apiKey);
            dispatch({ type: 'SET_API_KEY', payload: apiKey });
        }
    };

    const setAuthMode = () => {
        // Always set to enhanced mode - ignore input
        localStorage.setItem('auth_mode', 'enhanced');
        dispatch({ type: 'SET_AUTH_MODE', payload: 'enhanced' });
    };

    const login = (user: UserProfile, token: string) => {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user_profile', JSON.stringify(user));
        localStorage.setItem('auth_mode', 'enhanced');
        localStorage.removeItem('gemini_api_key'); // Clear API key in enhanced mode

        dispatch({ type: 'LOGIN', payload: { user, token } });

        // Update chat store and load user's chat history
        setAuthenticationStatus(true);
        setTimeout(() => {
            initializeFromBackend();
        }, 100);
    };

    const logout = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_profile');

        dispatch({ type: 'LOGOUT' });

        // Clear chat sessions when logging out
        setAuthenticationStatus(false);
        clearSessions();
    };

    const clearApiKey = () => {
        localStorage.removeItem('gemini_api_key');
        dispatch({ type: 'CLEAR_API_KEY' });
    };

    const value: AuthContextType = {
        ...state,
        setApiKey,
        setAuthMode,
        login,
        logout,
        clearApiKey,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};