import { motion } from 'framer-motion';
import { Loader2, Brain, Code2, Sparkles } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'brain' | 'code' | 'sparkles';
  text?: string;
}

export default function LoadingSpinner({ 
  size = 'md', 
  variant = 'default',
  text 
}: LoadingSpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const renderIcon = () => {
    const iconClass = `${sizes[size]} animate-spin`;
    
    switch (variant) {
      case 'brain':
        return <Brain className={iconClass} />;
      case 'code':
        return <Code2 className={iconClass} />;
      case 'sparkles':
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles className={sizes[size]} />
          </motion.div>
        );
      default:
        return <Loader2 className={iconClass} />;
    }
  };

  return (
    <div className="flex items-center justify-center gap-3">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {renderIcon()}
      </motion.div>
      {text && (
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className={`${textSizes[size]} text-muted-foreground`}
        >
          {text}
        </motion.span>
      )}
    </div>
  );
}

interface PulsingDotsProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export function PulsingDots({ size = 'md', color = 'bg-blue-500' }: PulsingDotsProps) {
  const dotSizes = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3'
  };

  const containerClass = size === 'sm' ? 'gap-1' : size === 'md' ? 'gap-1.5' : 'gap-2';

  return (
    <div className={`flex items-center ${containerClass}`}>
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className={`${dotSizes[size]} ${color} rounded-full`}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: index * 0.2,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

interface ProgressBarProps {
  progress: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  showPercentage?: boolean;
  animated?: boolean;
}

export function ProgressBar({ 
  progress, 
  size = 'md', 
  color = 'bg-blue-500',
  showPercentage = false,
  animated = true
}: ProgressBarProps) {
  const heights = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  return (
    <div className="w-full">
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full ${heights[size]} overflow-hidden`}>
        <motion.div
          className={`${color} ${heights[size]} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          transition={animated ? { duration: 0.5, ease: 'easeOut' } : { duration: 0 }}
        />
      </div>
      {showPercentage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-muted-foreground mt-1 text-center"
        >
          {Math.round(progress)}%
        </motion.div>
      )}
    </div>
  );
}