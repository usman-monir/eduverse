import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './use-toast';

export const useAuthErrorHandler = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleTokenExpired = (event: CustomEvent) => {
      console.log('AuthErrorHandler: Token expired event received', event.detail);
      
      toast({
        title: "Session Expired",
        description: event.detail.message || "Your session has expired. Please log in again.",
        variant: "destructive"
      });
      
      // Redirect to login page
      navigate('/login');
    };

    const handleUserDeleted = (event: CustomEvent) => {
      console.log('AuthErrorHandler: User deleted event received', event.detail);
      
      toast({
        title: "Account Deleted",
        description: event.detail.message || "Your account has been deleted. Please contact an administrator.",
        variant: "destructive"
      });
      
      // Redirect to login page
      navigate('/login');
    };

    // Listen for authentication events
    window.addEventListener('auth:tokenExpired', handleTokenExpired as EventListener);
    window.addEventListener('auth:userDeleted', handleUserDeleted as EventListener);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('auth:tokenExpired', handleTokenExpired as EventListener);
      window.removeEventListener('auth:userDeleted', handleUserDeleted as EventListener);
    };
  }, [navigate, toast]);
};
