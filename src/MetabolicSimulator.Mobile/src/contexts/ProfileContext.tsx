import React, { createContext, useState, useContext, useEffect } from 'react';
import profileData from '../data/profile.json';
import { UserProfile } from '../engine/MetabolicAdjuster';

interface ProfileContextType {
  profile: UserProfile;
  updateProfile: (newProfile: UserProfile) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile>({
      age: 35,
      weightKg: 75,
      heightCm: 175,
      gender: 'Male',
      sleepHours: 7.5,
      sleepQuality: 85
  });

  // Load initial data
  useEffect(() => {
      const raw: any = profileData;
      setProfile({
          age: raw.Age || 35,
          weightKg: raw.WeightKg || 75,
          heightCm: raw.HeightCm || 175,
          gender: raw.Gender || 'Male',
          sleepHours: raw.SleepHours || 7.5,
          sleepQuality: raw.SleepQuality || 85
      });
  }, []);

  const updateProfile = (newProfile: UserProfile) => {
      setProfile(newProfile);
      // In a real app, we would save to localStorage or FS here
  };

  return (
    <ProfileContext.Provider value={{ profile, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
