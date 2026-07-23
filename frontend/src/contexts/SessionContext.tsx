import React, { createContext, useContext, useState } from 'react';
import { getSpeedProfile, SpeedProfile } from '../utils/speedConfig';

interface SessionContextType {
  user: any;
  setUser: (user: any) => void;
  updateUser: (updatedFields: any) => void;
  alwaysShowTranslation: boolean;
  setAlwaysShowTranslation: (show: boolean) => void;
  speedProfile: SpeedProfile;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [alwaysShowTranslation, setAlwaysShowTranslation] = useState(false);

  const updateUser = (updatedFields: any) => {
    setUser((prev: any) => {
      if (!prev) return null;
      return { ...prev, ...updatedFields };
    });
  };

  const speedProfile = getSpeedProfile(user);

  return (
    <SessionContext.Provider value={{
      user,
      setUser,
      updateUser,
      alwaysShowTranslation,
      setAlwaysShowTranslation,
      speedProfile
    }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) throw new Error('useSession must be used within a SessionProvider');
  return context;
};
