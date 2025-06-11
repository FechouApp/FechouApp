import fechouLogoPath from "@assets/ChatGPT Image 11 de jun. de 2025, 16_19_11alterado.png";

interface LogoProps {
  className?: string;
  showText?: boolean;
  showSlogan?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ 
  className = "", 
  showText = false, 
  showSlogan = false,
  size = 'md'
}: LogoProps) {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-12',  
    lg: 'h-16'
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo Image */}
      <img 
        src={fechouLogoPath}
        alt="Fechou!"
        className={`${sizeClasses[size]} object-contain`}
      />
      
      {/* Optional text content - usually not needed since logo contains text */}
      {showText && (
        <div className="flex flex-col">
          <h1 className="font-bold text-blue-900 text-lg">
            Fechou!
          </h1>
          {showSlogan && (
            <p className="text-gray-600 text-sm leading-tight">
              O jeito moderno de fechar negócios
            </p>
          )}
        </div>
      )}
    </div>
  );
}