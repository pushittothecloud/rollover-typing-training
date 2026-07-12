import { create } from 'zustand'
import { addEdge, applyEdgeChanges, applyNodeChanges } from '@xyflow/react'
import type {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
} from '@xyflow/react'

export type LensKey = 'S' | 'C' | 'A' | 'M' | 'P' | 'E' | 'R'

type ToulminField = 'claim' | 'evidence' | 'warrant'

type ToulminState = {
  claim: string
  evidence: string
  warrant: string
}

type AppState = {
  started: boolean
  toulmin: ToulminState
  activeLenses: Record<LensKey, boolean>
  activePrompt: string | null
  nodes: Node[]
  edges: Edge[]
  setToulminField: (field: ToulminField, value: string) => void
  beginDrafting: () => void
  toggleLens: (lens: LensKey, prompt: string) => void
  clearPrompt: () => void
  addTextlet: (content: string) => void
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
}

const defaultLenses: Record<LensKey, boolean> = {
  S: false,
  C: false,
  A: false,
  M: false,
  P: false,
  E: false,
  R: false,
}

export const useAppStore = create<AppState>((set, get) => ({
  started: false,
  toulmin: {
    claim: '',
    evidence: '',
    warrant: '',
  },
  activeLenses: defaultLenses,
  activePrompt: null,
  nodes: [],
  edges: [],
  setToulminField: (field, value) =>
    set((state) => ({
      toulmin: {
        ...state.toulmin,
        [field]: value,
      },
    })),
  beginDrafting: () => set({ started: true }),
  toggleLens: (lens, prompt) =>
    set((state) => {
      const next = !state.activeLenses[lens]

      return {
        activeLenses: {
          ...state.activeLenses,
          [lens]: next,
        },
        activePrompt: next ? prompt : null,
      }
    }),
  clearPrompt: () => set({ activePrompt: null }),
  addTextlet: (content) => {
    if (!content.trim()) {
      return
    }

    const id = crypto.randomUUID()
    const currentCount = get().nodes.length

    const node: Node = {
      id,
      position: {
        x: 40 + (currentCount % 4) * 220,
        y: 40 + Math.floor(currentCount / 4) * 140,
      },
      data: {
        label: content,
      },
      type: 'default',
      style: {
        width: 200,
        borderRadius: 12,
        border: '1px solid rgba(142, 119, 91, 0.45)',
        background: 'rgba(247, 242, 235, 0.97)',
        boxShadow: '0 8px 24px rgba(35, 24, 13, 0.18)',
        color: '#23180d',
        padding: 10,
        fontSize: 14,
        lineHeight: 1.35,
      },
    }

    set((state) => ({
      nodes: [...state.nodes, node],
    }))
  },
  onNodesChange: (changes) =>
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
    })),
  onEdgesChange: (changes) =>
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    })),
  onConnect: (connection) =>
    set((state) => ({
      edges: addEdge(
        {
          ...connection,
          animated: true,
          style: {
            stroke: '#5c4730',
            strokeWidth: 1.4,
          },
        },
        state.edges,
      ),
    })),
}))
