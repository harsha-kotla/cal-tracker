"use client";

import { SetupScreen, SignInScreen, Splash } from "@/components/AuthScreens";
import { Tracker } from "@/components/Tracker";
import { AuthProvider, useAuth } from "@/context/AuthProvider";

function Gate() {
  const { configured, loading, user, profile } = useAuth();
  if (!configured) return <SetupScreen />;
  if (loading || (user && !profile)) return <Splash />;
  if (!user) return <SignInScreen />;
  return <Tracker />;
}

export function App() {
  return (
    <div className="app-stage">
      <div className="app-device">
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </div>
    </div>
  );
}
