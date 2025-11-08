import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { motion, MotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface AccessibleButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof MotionProps> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    loadingText?: string;
    icon?: ReactNode;
    iconPosition?: 'left' | 'right';
    children: ReactNode;
}

const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
    (
        {
            variant = 'primary',
            size = 'md',
            loading = false,
            loadingText,
            icon,
            iconPosition = 'left',
            children,
            disabled,
            className = '',
            ...props
        },
        ref
    ) => {
        const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

        const variants = {
            primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 hover:shadow-lg transform hover:scale-[1.02]',
            secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 hover:shadow-lg transform hover:scale-[1.02]',
            outline: 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 focus:ring-blue-500 hover:shadow-md transform hover:scale-[1.02]',
            ghost: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-blue-500',
            danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 hover:shadow-lg transform hover:scale-[1.02]',
        };

        const sizes = {
            sm: 'px-3 py-2 text-sm gap-2',
            md: 'px-4 py-2 text-base gap-2',
            lg: 'px-6 py-3 text-lg gap-3',
        };

        const buttonClasses = `${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`;

        const isDisabled = disabled || loading;

        return (
            <motion.button
                ref={ref}
                className={buttonClasses}
                disabled={isDisabled}
                whileTap={!isDisabled ? { scale: 0.98 } : undefined}
                aria-busy={loading}
                aria-describedby={loading && loadingText ? `${props.id}-loading` : undefined}
                {...props}
            >
                {loading ? (
                    <>
                        <Loader2 className={`animate-spin ${size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'}`} />
                        {loadingText || children}
                        {loading && loadingText && (
                            <span id={`${props.id}-loading`} className="sr-only">
                                {loadingText}
                            </span>
                        )}
                    </>
                ) : (
                    <>
                        {icon && iconPosition === 'left' && (
                            <span className="flex-shrink-0">{icon}</span>
                        )}
                        {children}
                        {icon && iconPosition === 'right' && (
                            <span className="flex-shrink-0">{icon}</span>
                        )}
                    </>
                )}
            </motion.button>
        );
    }
);

AccessibleButton.displayName = 'AccessibleButton';

export default AccessibleButton;