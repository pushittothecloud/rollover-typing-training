import '@xyflow/react/dist/style.css'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
} from '@xyflow/react'
import { useAppStore } from '../../state/appStore'

export function TextletCanvas() {
  const nodes = useAppStore((state) => state.nodes)
  const edges = useAppStore((state) => state.edges)
  const onNodesChange = useAppStore((state) => state.onNodesChange)
  const onEdgesChange = useAppStore((state) => state.onEdgesChange)
  const onConnect = useAppStore((state) => state.onConnect)

  return (
    <div className="h-full min-h-[280px] overflow-hidden rounded-2xl border border-stone-700/70 bg-stone-950/75">
      <ReactFlow
        fitView
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        defaultViewport={{ x: 0, y: 0, zoom: 0.95 }}
      >
        <Background color="rgba(214, 198, 173, 0.2)" gap={24} />
        <MiniMap
          pannable
          zoomable
          nodeStrokeColor="rgba(111, 78, 47, 0.8)"
          nodeColor="rgba(247, 242, 235, 0.92)"
          style={{ backgroundColor: 'rgba(12, 11, 9, 0.7)' }}
        />
        <Controls />
      </ReactFlow>
    </div>
  )
}
