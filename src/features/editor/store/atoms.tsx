import type { ReactFlowInstance } from "@xyflow/react";
import { atom } from "jotai";

export const editorAtom = atom<ReactFlowInstance | null>(null);

export type ViewMode = 'workflow' | 'executions';
export const viewModeAtom = atom<ViewMode>('workflow');
