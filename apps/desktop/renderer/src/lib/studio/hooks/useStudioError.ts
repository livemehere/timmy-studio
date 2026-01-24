import { createContext, useContext } from 'react';

export const StudioErrorContext = createContext<boolean>(false);
StudioErrorContext.displayName = 'StudioErrorContext';

export function useStudioError(): boolean {
  const isError = useContext(StudioErrorContext);
  return isError;
}
