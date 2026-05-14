import { useState, useEffect, useCallback, useRef } from 'react';
import useUndo from 'use-undo';

export function useHistory<T>(initialState: T, debounceMs = 500) {
  // Current "live" state for the UI
  const [liveState, setLiveState] = useState<T>(initialState);
  
  // History management using the package
  const [
    historyState, 
    { 
      set: setHistory, 
      undo: internalUndo, 
      redo: internalRedo, 
      canUndo, 
      canRedo,
      reset
    }
  ] = useUndo(initialState);

  const { present: historyPresent } = historyState;
  const isInternalChange = useRef(false);

  // When live state changes, debounce the save to history
  useEffect(() => {
    // Skip if the change came from an undo/redo
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    // Don't save to history if it's the same as what's already there
    if (liveState === historyPresent) return;

    const timer = setTimeout(() => {
      setHistory(liveState);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [liveState, historyPresent, setHistory, debounceMs]);

  // Sync live state when history changes (undo/redo)
  useEffect(() => {
    setLiveState(historyPresent);
  }, [historyPresent]);

  const undo = useCallback(() => {
    if (canUndo) {
      isInternalChange.current = true;
      internalUndo();
    }
  }, [canUndo, internalUndo]);

  const redo = useCallback(() => {
    if (canRedo) {
      isInternalChange.current = true;
      internalRedo();
    }
  }, [canRedo, internalRedo]);

  const setState = useCallback((newState: T | ((prev: T) => T)) => {
    setLiveState(newState);
  }, []);

  const resetState = useCallback((newState: T) => {
    setLiveState(newState);
    reset(newState);
  }, [reset]);

  return [
    liveState,
    {
      undo,
      redo,
      canUndo,
      canRedo,
      set: setState,
      reset: resetState
    }
  ] as const;
}
