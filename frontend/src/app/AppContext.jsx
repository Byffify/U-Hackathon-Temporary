import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { service, mode } from "../services/index.js";
const Context = createContext(null);
export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const currentUser = useRef(null);
  const expiredRef = useRef(false);
  const checking = useRef(false);
  const refreshSession = useCallback(async (background = false) => {
    if (background && checking.current) return null;
    checking.current = true;
    try {
      const next = await service.call("auth.session");
      if (
        !background &&
        expiredRef.current &&
        next?.id !== currentUser.current?.id
      )
        return null;
      if (background && !next && currentUser.current) {
        expiredRef.current = true;
        setSessionExpired(true);
      } else {
        setUser(next);
        currentUser.current = next;
        expiredRef.current = false;
        setSessionExpired(false);
      }
      setSessionError(null);
      return next;
    } catch (error) {
      if ((background || expiredRef.current) && currentUser.current) {
        expiredRef.current = true;
        setSessionExpired(true);
      } else {
        setUser(null);
        currentUser.current = null;
        setSessionError(error);
      }
      return null;
    } finally {
      checking.current = false;
      setSessionLoading(false);
    }
  }, []);
  useEffect(() => {
    refreshSession();
    const expired = () => refreshSession(true);
    window.addEventListener("utopia:unauthorized", expired);
    return () => window.removeEventListener("utopia:unauthorized", expired);
  }, [refreshSession]);
  return (
    <Context.Provider
      value={{
        service,
        mode,
        user,
        sessionLoading,
        sessionError,
        sessionExpired,
        refreshSession,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useApp = () => useContext(Context);
