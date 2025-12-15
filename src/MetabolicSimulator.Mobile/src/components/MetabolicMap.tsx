import React, { useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Handle,
  Position,
  MarkerType
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';

interface MapProps {
  pathway: any;
}

// Enhanced Node Style with concentration-based sizing
const MetaboliteNode = ({ data }: any) => {
  const concentration = data.conc || 0;
  const baseSize = 35;
  const maxSize = 55;
  // Size based on concentration (normalized)
  const size = Math.min(maxSize, baseSize + (concentration * 8));

  // Color based on concentration level
  let nodeColor = '#3498db';
  if (concentration > 1.0) nodeColor = '#2ecc71'; // High
  else if (concentration > 0.1) nodeColor = '#3498db'; // Medium
  else if (concentration > 0.01) nodeColor = '#f39c12'; // Low
  else nodeColor = '#95a5a6'; // Very low

  return (
    <div style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center'
    }}>
      <Handle type="target" position={Position.Top} style={{background: nodeColor, width: '6px', height: '6px', border: 'none'}} />
      <Handle type="target" position={Position.Left} style={{background: nodeColor, width: '6px', height: '6px', border: 'none'}} />

      <div style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${nodeColor}dd, ${nodeColor})`,
          border: `2px solid ${nodeColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 2px 8px ${nodeColor}44`,
          marginBottom: '4px'
      }}>
          <div style={{
              fontSize: `${Math.max(7, size / 6)}px`,
              fontWeight: 'bold',
              color: '#fff',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)'
          }}>
              {data.label.substring(0, Math.floor(size / 8))}
          </div>
      </div>

      <div style={{
          fontSize: '9px',
          color: '#333',
          lineHeight: '1.2',
          fontWeight: '600',
          maxWidth: '70px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
      }}>
          {data.label}
      </div>
      <div style={{fontSize: '8px', color: '#666', fontWeight: '500'}}>
          {concentration.toFixed(3)} mM
      </div>

      <Handle type="source" position={Position.Bottom} style={{background: nodeColor, width: '6px', height: '6px', border: 'none'}} />
      <Handle type="source" position={Position.Right} style={{background: nodeColor, width: '6px', height: '6px', border: 'none'}} />
    </div>
  );
};

const nodeTypes = { metabolite: MetaboliteNode };

const MetabolicMap: React.FC<MapProps> = ({ pathway }) => {
  
  const { nodes, edges } = useMemo(() => {
    const pathwayId = pathway.Id || pathway.id || '';

    // Create dagre graph for automatic layout
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    // Configure layout based on pathway type
    let rankdir = 'TB'; // Top to bottom (default)
    let ranksep = 80;
    let nodesep = 60;

    if (pathwayId.includes('glycolysis')) {
      rankdir = 'TB'; // Vertical waterfall
      ranksep = 70;
    } else if (pathwayId.includes('krebs')) {
      rankdir = 'LR'; // Left to right works better for cycles
      ranksep = 90;
      nodesep = 90;
    } else if (pathwayId.includes('methylation')) {
      rankdir = 'TB';
      ranksep = 80;
    }

    dagreGraph.setGraph({ rankdir, ranksep, nodesep });

    // Add nodes to dagre
    pathway.Metabolites.forEach((m: any) => {
      const conc = m.InitialConcentration || 0;
      const size = Math.min(55, 35 + (conc * 8));
      dagreGraph.setNode(m.Id, { width: size + 40, height: size + 50 });
    });

    // Add edges to dagre
    const edgeList: any[] = [];
    pathway.Reactions.forEach((r: any) => {
      if (r.Substrates && r.Products) {
        r.Substrates.forEach((substrate: any) => {
          r.Products.forEach((product: any) => {
            dagreGraph.setEdge(substrate.MetaboliteId, product.MetaboliteId);
            edgeList.push({
              id: `${r.Id}_${substrate.MetaboliteId}_${product.MetaboliteId}`,
              source: substrate.MetaboliteId,
              target: product.MetaboliteId,
              reactionName: r.Name
            });
          });
        });
      }
    });

    // Run dagre layout algorithm
    dagre.layout(dagreGraph);

    // Build ReactFlow nodes with dagre positions
    const layoutNodes: Node[] = pathway.Metabolites.map((m: any) => {
      const nodeWithPosition = dagreGraph.node(m.Id);
      return {
        id: m.Id,
        type: 'metabolite',
        data: { label: m.Name, conc: m.InitialConcentration },
        position: {
          x: nodeWithPosition.x - nodeWithPosition.width / 2,
          y: nodeWithPosition.y - nodeWithPosition.height / 2
        },
        draggable: false
      };
    });

    // Build ReactFlow edges with better styling
    const layoutEdges: Edge[] = edgeList.map((e: any) => {
      // Calculate flux/importance (for now, use a default)
      const strokeWidth = 2;
      const color = '#3498db';

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        animated: true,
        style: {
          stroke: color,
          strokeWidth: strokeWidth
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: color,
          width: 15,
          height: 15
        },
        label: e.reactionName || '',
        labelStyle: { fontSize: 9, fill: '#555', fontWeight: '500' },
        labelBgStyle: { fill: '#fff', fillOpacity: 0.9, rx: 4, ry: 4 },
        labelBgPadding: [4, 4] as [number, number],
        labelBgBorderRadius: 4
      };
    });

    return { nodes: layoutNodes, edges: layoutEdges };
  }, [pathway]);

  return (
    <div style={{ height: '500px', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', borderRadius: '12px', border: '1px solid #e1e4e8', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, minZoom: 0.4, maxZoom: 1.2 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        zoomOnScroll={true}
        panOnScroll={true}
        zoomOnPinch={true}
        panOnDrag={true}
        minZoom={0.2}
        maxZoom={2.5}
      >
        {/* Clean Background - No Grid */}
      </ReactFlow>
    </div>
  );
};

export default MetabolicMap;