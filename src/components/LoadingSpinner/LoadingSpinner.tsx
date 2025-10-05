import React from 'react';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className = '',
}) => {
  const spinnerClasses = [
    'loading-spinner',
    `loading-spinner--${size}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={spinnerClasses}>
      <div className="loading-spinner__circle"></div>
    </div>
  );
};

export default LoadingSpinner;