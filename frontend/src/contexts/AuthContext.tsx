import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User } from '@/types';
import {
  registerStudent,
  registerTutor,
  login as apiLogin,
  getProfile,
} from '@/services/api';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Handle authentication events
  useEffect(() => {
    const handleTokenExpired = (event: CustomEvent) => {
      console.log('AuthContext: Token expired event received', event.detail);
      setUser(null);
      localStorage.removeItem('token');
      
      // Redirect to login page
      navigate('/login');
    };

    const handleUserDeleted = (event: CustomEvent) => {
      console.log('AuthContext: User deleted event received', event.detail);
      setUser(null);
      localStorage.removeItem('token');
      
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
  }, [navigate]);

  // Fetch user profile if token exists
  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('AuthContext: token on mount:', token);
    if (token) {
      getProfile()
        .then((res) => {
          console.log('AuthContext: profile response', res.data);
          setUser(res.data.data);
          setLoading(false);
        })
        .catch((err) => {
          console.log('AuthContext: profile error', err);
          setUser(null);
          localStorage.removeItem('token');
          setLoading(false);
          
          // Handle specific error cases
          if (err.response?.status === 404) {
            // User not found - likely deleted
            navigate('/login');
          } else if (err.response?.status === 401 || err.response?.status === 403) {
            // Token expired or invalid
            navigate('/login');
          }
        });
    } else {
      setUser(null);
      setLoading(false);
    }
  }, [navigate]);

  // Periodic user validation check (every 5 minutes)
  useEffect(() => {
    if (!user || !localStorage.getItem('token')) return;

    const interval = setInterval(async () => {
      try {
        await getProfile();
      } catch (err: any) {
        console.log('AuthContext: periodic validation failed', err);
        
        if (err.response?.status === 404) {
          // User not found - likely deleted
          setUser(null);
          localStorage.removeItem('token');
          navigate('/login');
        } else if (err.response?.status === 401 || err.response?.status === 403) {
          // Token expired or invalid
          setUser(null);
          localStorage.removeItem('token');
          navigate('/login');
        }
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [user, navigate]);

  const login = async (email: string, password: string) => {
    const response = await apiLogin(email, password);
    const { token, user: userData } = response.data.data;
    if (token) {
      localStorage.setItem('token', token);
      setUser(userData);
    } else {
      throw new Error('No token returned from API');
    }
  };

  const register = async (data: any) => {
    let response;
    if (data.role === 'tutor') {
      response = await registerTutor(data);
    } else {
      response = await registerStudent(data);
    }
    
    // Don't automatically log in since user needs admin approval
    // Return the response data for the registration page to handle
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        loading,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
