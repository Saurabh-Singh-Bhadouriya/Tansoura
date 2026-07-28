import { createContext, useContext, useState, useEffect } from 'react';

const DataRefreshContext = createContext(null);

export function DataRefreshProvider({ children }) {
  const [refreshKey, setRefreshKey] = useState(Date.now());

  const triggerRefresh = () => {
    setRefreshKey(Date.now());
  };

  return (
    <DataRefreshContext.Provider value={{ refreshKey, triggerRefresh }}>
      {children}
    </DataRefreshContext.Provider>
  );
}

export const useRefreshKey = () => useContext(DataRefreshContext);