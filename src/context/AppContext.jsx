import { createContext } from 'preact';
import { useContext } from 'preact/hooks';

const AppContext = createContext(null);

export function AppProvider({ value, children }) {
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
