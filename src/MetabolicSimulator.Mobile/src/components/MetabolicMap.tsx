import React, { useMemo } from 'react';
import ReactFlow, { 
  Node, 
  Edge, 
  Background, 
  Handle, 
  Position,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';

interface MapProps {
  pathway: any; // The active pathway data
}

// Custom Node for Metabolites (Mobile Optimized)
const MetaboliteNode = ({ data }: any) => (
  <div style={{ 
      padding: '5px', 
      borderRadius: '50%', 
      background: 'rgba(255, 255, 255, 0.95)', 
      border: '2px solid #2ecc71', 
      width: '60px', 
      height: '60px',
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center',
      textAlign: 'center',
      fontSize: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      overflow: 'hidden'
  }}>
    <Handle type="target" position={Position.Top} style={{ background: '#555', width: '4px', height: '4px' }} />
    <div style={{fontWeight: 'bold', lineHeight: '1.1', marginBottom: '2px'}}>{data.label}</div>
    <div style={{color: '#666', fontSize: '7px'}}>{data.conc?.toFixed(2)}</div>
    <Handle type="source" position={Position.Bottom} style={{ background: '#555', width: '4px', height: '4px' }} />
  </div>
);

const nodeTypes = { metabolite: MetaboliteNode };

const MetabolicMap: React.FC<MapProps> = ({ pathway }) => {
  
  const { nodes, edges } = useMemo(() => {
    const layoutNodes: Node[] = [];
    const layoutEdges: Edge[] = [];
    
    // --- Layout Strategies ---

    const getLinearCoordinates = (index: number) => ({ x: 0, y: index * 100 });
    
    const getCircularCoordinates = (index: number, count: number) => {
        const radius = 120;
        // Start from top (3/2 PI) and go clockwise
        const angle = (index / count) * 2 * Math.PI - (Math.PI / 2);
        return { 
            x: radius * Math.cos(angle), 
            y: radius * Math.sin(angle) 
        };
    };

    const getMethylationCoordinates = (id: string) => {
        // Biologically Accurate "Figure-8" Layout
        
        // Center Points (Shifted to positive space)
        const folateCenter = { x: 100, y: 200 };
        const metCenter = { x: 300, y: 200 };
        const radius = 80;

        const positions: Record<string, {x: number, y: number}> = {
            // --- Methionine Cycle (Right) ---
            'met':  { x: metCenter.x, y: metCenter.y - radius }, // Top
            'sam':  { x: metCenter.x + radius, y: metCenter.y }, // Right
            'sah':  { x: metCenter.x, y: metCenter.y + radius }, // Bottom
            'hcy':  { x: 200, y: 200 }, // Center Intersection (The Hub)

            // --- Folate Cycle (Left) ---
            'thf':          { x: folateCenter.x, y: folateCenter.y - radius }, // Top
            'methylene_thf':{ x: folateCenter.x - radius, y: folateCenter.y }, // Left
            'methyl_thf':   { x: folateCenter.x, y: folateCenter.y + radius }, // Bottom (Feeds Hcy)

            // --- Transsulfuration (Down from Hcy) ---
            'cysta': { x: 200, y: 300 },
            'cys':   { x: 200, y: 380 },

            // --- Betaine (Alternative Input to Met) ---
            'bet':   { x: 280, y: 120 },
            'dmg':   { x: 340, y: 160 },

            // --- Cofactors ---
            'atp_cyto': { x: 380, y: 120 }
        };
        return positions[id] || { x: Math.random() * 200, y: Math.random() * 200 };
    };

    // Determine Strategy
    const metaboliteCount = pathway.Metabolites.length;
    const pathwayId = pathway.Id || pathway.id || ''; // Handle both casing
    const isLinear = pathwayId.includes('glycolysis') || pathwayId.includes('fat');
    const isMethylation = pathwayId.includes('methylation');
    
    // Create Nodes with Layout
    pathway.Metabolites.forEach((m: any, index: number) => {
        let pos;
        if (isMethylation) {
            pos = getMethylationCoordinates(m.Id);
        } else if (isLinear) {
            pos = getLinearCoordinates(index);
        } else {
            // Default to Circular (Krebs, Urea)
            pos = getCircularCoordinates(index, metaboliteCount);
        }

        layoutNodes.push({
            id: m.Id,
            type: 'metabolite',
            data: { label: m.Name, conc: m.InitialConcentration },
            position: pos,
        });
    });

    // Create Edges (Reactions)
    pathway.Reactions.forEach((r: any) => {
        if (r.Substrates?.[0] && r.Products?.[0]) {
            layoutEdges.push({
                id: r.Id,
                source: r.Substrates[0].MetaboliteId,
                target: r.Products[0].MetaboliteId,
                label: r.Name.split(' ')[0], 
                animated: true,
                style: { stroke: '#555', strokeWidth: 1.5 },
                labelStyle: { fill: '#555', fontWeight: 600, fontSize: 8 },
                markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15 },
            });
        }
    });

    return { nodes: layoutNodes, edges: layoutEdges };
  }, [pathway]);

  return (
    <div style={{ height: '300px', border: '1px solid #eee', borderRadius: '12px', background: '#fafafa', overflow: 'hidden' }}>
      <ReactFlow 
        nodes={nodes} 
        edges={edges} 
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.5}
        maxZoom={2}
      >
        <Background color="#ddd" gap={20} size={1} />
      </ReactFlow>
    </div>
  );
};

export default MetabolicMap;
