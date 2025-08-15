import { Button } from '@/components/ui/button';
import { AuthModal } from './AuthModal';

interface AuthButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
}

export function AuthButton({ 
  variant = 'default', 
  size = 'default', 
  className, 
  children = 'Get Started'
}: AuthButtonProps) {
  return (
    <AuthModal>
      <Button variant={variant} size={size} className={className}>
        {children}
      </Button>
    </AuthModal>
  );
}