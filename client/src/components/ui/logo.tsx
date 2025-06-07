interface LogoProps {
  className?: string;
  showText?: boolean;
  showSlogan?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ 
  className = "", 
  showText = true, 
  showSlogan = false,
  size = 'md'
}: LogoProps) {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-12',
    lg: 'h-16'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl'
  };

  const sloganSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo Icon */}
      <div className={`${sizeClasses[size]} aspect-square`}>
        <svg 
          viewBox="0 0 80 80" 
          className="w-full h-full"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Main square with rounded corners */}
          <rect 
            x="10" 
            y="10" 
            width="50" 
            height="50" 
            rx="12" 
            ry="12" 
            fill="#1e3a8a" 
          />
          {/* Speech bubble tail */}
          <path 
            d="M25 60 L35 70 L45 60" 
            fill="#1e3a8a" 
          />
          {/* Check mark */}
          <path 
            d="M22 35 L32 45 L48 25" 
            stroke="#10b981" 
            strokeWidth="6" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            fill="none"
          />
        </svg>
      </div>

      {/* Text */}
      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold italic ${textSizes[size]} leading-none ${className.includes('text-white') ? 'text-white' : 'text-gray-800'}`}>
            Fechou!
          </span>
          {showSlogan && (
            <span className={`${sloganSizes[size]} mt-1 ${className.includes('text-white') ? 'text-white/80' : 'text-gray-600'}`}>
              O jeito moderno de fechar negócios
            </span>
          )}
        </div>
      )}
    </div>
  );
}