import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer
} from 'react';

const initialState = {
  activeWarehouseId: '',
  isOnline:
    typeof navigator === 'undefined' ? true : navigator.onLine !== false,
  offlineQueueSize: 0,
  session: {
    userId: null,
    role: null,
    organizationId: null
  }
};

const AppStateContext = createContext(initialState);
const AppActionsContext = createContext(null);

const reducer = (state, action) => {
  switch (action.type) {
    case 'SET_ACTIVE_WAREHOUSE_ID':
      return {
        ...state,
        activeWarehouseId: String(action.payload || '')
      };
    case 'SET_NETWORK_STATUS':
      return {
        ...state,
        isOnline: Boolean(action.payload)
      };
    case 'SET_OFFLINE_QUEUE_SIZE':
      return {
        ...state,
        offlineQueueSize: Math.max(0, Number(action.payload || 0))
      };
    case 'SET_SESSION':
      return {
        ...state,
        session: {
          userId: action.payload?.userId || null,
          role: action.payload?.role || null,
          organizationId: action.payload?.organizationId || null
        }
      };
    default:
      return state;
  }
};

export const AppStateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setActiveWarehouseId = useCallback(
    (warehouseId) =>
      dispatch({
        type: 'SET_ACTIVE_WAREHOUSE_ID',
        payload: warehouseId
      }),
    []
  );

  const setIsOnline = useCallback(
    (isOnline) =>
      dispatch({
        type: 'SET_NETWORK_STATUS',
        payload: isOnline
      }),
    []
  );

  const setOfflineQueueSize = useCallback(
    (size) =>
      dispatch({
        type: 'SET_OFFLINE_QUEUE_SIZE',
        payload: size
      }),
    []
  );

  const setSession = useCallback(
    ({ userId, role, organizationId }) =>
      dispatch({
        type: 'SET_SESSION',
        payload: { userId, role, organizationId }
      }),
    []
  );

  const actions = useMemo(
    () => ({
      setActiveWarehouseId,
      setIsOnline,
      setOfflineQueueSize,
      setSession
    }),
    [setActiveWarehouseId, setIsOnline, setOfflineQueueSize, setSession]
  );

  return (
    <AppStateContext.Provider value={state}>
      <AppActionsContext.Provider value={actions}>
        {children}
      </AppActionsContext.Provider>
    </AppStateContext.Provider>
  );
};

export const useAppState = () => useContext(AppStateContext);

export const useAppActions = () => {
  const actions = useContext(AppActionsContext);
  if (!actions) {
    throw new Error('useAppActions must be used within AppStateProvider');
  }
  return actions;
};

export default {
  AppStateProvider,
  useAppState,
  useAppActions
};
