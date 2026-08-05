import { useCallback, useState } from 'react';
import {
  MAX_PLATE_LIST_NAME_LENGTH,
  MAX_PLATE_LIST_DESCRIPTION_LENGTH,
  MAX_PLATE_LIST_PLATES,
  type PlateList,
  type PlateListSimulationDefaults,
} from '@plate-runner/shared';
import {
  getPlateLists,
  savePlateList,
  deletePlateList,
  duplicatePlateList,
  resetPlateListStorage,
  generateListId,
} from './plateListStorage';

export interface PlateListDraft {
  name: string;
  description?: string;
  plates: string[];
  simulationDefaults: PlateListSimulationDefaults;
}

export interface MutationResult {
  ok: boolean;
  error?: string;
}

export interface PlateListsControls {
  lists: PlateList[];
  storageError: string | null;

  createList: (draft: PlateListDraft) => MutationResult;
  updateList: (id: string, draft: PlateListDraft) => MutationResult;
  deleteList: (id: string) => void;
  duplicateList: (id: string) => void;
  resetStorage: () => void;
}

function validateDraft(draft: PlateListDraft): string | null {
  const name = draft.name.trim();
  if (!name) return 'Name is required.';
  if (name.length > MAX_PLATE_LIST_NAME_LENGTH) return `Name cannot exceed ${MAX_PLATE_LIST_NAME_LENGTH} characters.`;
  if (draft.description && draft.description.length > MAX_PLATE_LIST_DESCRIPTION_LENGTH) {
    return `Description cannot exceed ${MAX_PLATE_LIST_DESCRIPTION_LENGTH} characters.`;
  }
  if (draft.plates.length > MAX_PLATE_LIST_PLATES) {
    return `Too many plates: ${draft.plates.length} detected, max is ${MAX_PLATE_LIST_PLATES}.`;
  }
  return null;
}

export function usePlateLists(): PlateListsControls {
  const [{ lists, error: storageError }, setStore] = useState(() => getPlateLists());

  const refresh = useCallback(() => {
    setStore(getPlateLists());
  }, []);

  const createList = useCallback((draft: PlateListDraft): MutationResult => {
    const validationError = validateDraft(draft);
    if (validationError) return { ok: false, error: validationError };

    const timestamp = new Date().toISOString();
    const list: PlateList = {
      id: generateListId(),
      name: draft.name.trim(),
      description: draft.description?.trim() || undefined,
      plates: draft.plates,
      simulationDefaults: draft.simulationDefaults,
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1,
    };
    savePlateList(list);
    refresh();
    return { ok: true };
  }, [refresh]);

  const updateList = useCallback((id: string, draft: PlateListDraft): MutationResult => {
    const validationError = validateDraft(draft);
    if (validationError) return { ok: false, error: validationError };

    const existing = lists.find(l => l.id === id);
    if (!existing) return { ok: false, error: 'List not found.' };

    const updated: PlateList = {
      ...existing,
      name: draft.name.trim(),
      description: draft.description?.trim() || undefined,
      plates: draft.plates,
      simulationDefaults: draft.simulationDefaults,
      updatedAt: new Date().toISOString(),
    };
    savePlateList(updated);
    refresh();
    return { ok: true };
  }, [lists, refresh]);

  const deleteList = useCallback((id: string) => {
    deletePlateList(id);
    refresh();
  }, [refresh]);

  const duplicateList = useCallback((id: string) => {
    duplicatePlateList(id);
    refresh();
  }, [refresh]);

  const resetStorage = useCallback(() => {
    resetPlateListStorage();
    refresh();
  }, [refresh]);

  return {
    lists,
    storageError,
    createList,
    updateList,
    deleteList,
    duplicateList,
    resetStorage,
  };
}
