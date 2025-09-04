import React from 'react';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

interface GoogleAuthProps {
  onSuccess: (userData: {
    email: string;
    name: string;
    picture?: string;
  }) => void;
  onError?: () => void;
}

interface GoogleJwtPayload {
  email: string;
  name: string;
  picture?: string;
  sub: string;
}

const GoogleAuth: React.FC<GoogleAuthProps> = ({ onSuccess, onError }) => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) {
    console.warn('Google Client ID not configured');
    return null;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <div className="w-full">
        <GoogleLogin
          onSuccess={(credentialResponse) => {
            if (credentialResponse.credential) {
              try {
                const decoded = jwtDecode<GoogleJwtPayload>(credentialResponse.credential);
                onSuccess({
                  email: decoded.email,
                  name: decoded.name,
                  picture: decoded.picture
                });
              } catch (error) {
                console.error('Error decoding JWT:', error);
                onError?.();
              }
            }
          }}
          onError={() => {
            console.error('Google login failed');
            onError?.();
          }}
          text="signin_with"
          shape="rectangular"
          theme="outline"
          size="large"
          width="100%"
        />
      </div>
    </GoogleOAuthProvider>
  );
};

export default GoogleAuth;