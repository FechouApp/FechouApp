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
          viewBox="0 0 100 100" 
          className="w-full h-full"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Speech bubble background */}
          <path 
            d="M20 15 C15 15 10 20 10 25 L10 55 C10 60 15 65 20 65 L25 65 L35 75 L35 65 L80 65 C85 65 90 60 90 55 L90 25 C90 20 85 15 80 15 Z" 
            fill="#1e3a8a" 
          />
          {/* Check mark */}
          <path 
            d="M25 40 L40 55 L75 25" 
            stroke="#10b981" 
            strokeWidth="8" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            fill="none"
          />
        </svg>
      </div>

      {/* Text */}
      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold ${textSizes[size]} leading-none ${className.includes('text-white') ? 'text-white' : 'text-gray-800'}`}>
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