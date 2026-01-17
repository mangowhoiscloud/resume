"use client";

import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Position,
  Handle,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion } from "framer-motion";
import { ReactNode } from "react";

// Custom Node Data Types
interface BaseNodeData {
  icon: ReactNode;
  label: string;
  description: string;
}

interface SubagentNodeData extends BaseNodeData {
  nodeType: string;
  delay?: number;
  timeout?: string;
  failMode?: "FAIL_OPEN" | "FAIL_CLOSE" | "FAIL_FALLBACK";
}

// Color mapping for different node types
const nodeColors: Record<string, { bg: string; border: string; text: string }> = {
  intent: { bg: "from-purple-500/25 to-purple-600/15", border: "border-purple-400", text: "text-purple-200" },
  vision: { bg: "from-cyan-500/25 to-cyan-600/15", border: "border-cyan-400", text: "text-cyan-200" },
  router: { bg: "from-violet-500/25 to-violet-600/15", border: "border-violet-400", text: "text-violet-200" },
  rag: { bg: "from-yellow-500/25 to-yellow-600/15", border: "border-yellow-400", text: "text-yellow-200" },
  character: { bg: "from-pink-500/25 to-pink-600/15", border: "border-pink-400", text: "text-pink-200" },
  location: { bg: "from-green-500/25 to-green-600/15", border: "border-green-400", text: "text-green-200" },
  weather: { bg: "from-sky-500/25 to-sky-600/15", border: "border-sky-400", text: "text-sky-200" },
  collection: { bg: "from-orange-500/25 to-orange-600/15", border: "border-orange-400", text: "text-orange-200" },
  bulk: { bg: "from-red-500/25 to-red-600/15", border: "border-red-400", text: "text-red-200" },
  price: { bg: "from-lime-500/25 to-lime-600/15", border: "border-lime-400", text: "text-lime-200" },
  web: { bg: "from-indigo-500/25 to-indigo-600/15", border: "border-indigo-400", text: "text-indigo-200" },
  image: { bg: "from-fuchsia-500/25 to-fuchsia-600/15", border: "border-fuchsia-400", text: "text-fuchsia-200" },
  feedback: { bg: "from-amber-500/25 to-amber-600/15", border: "border-amber-400", text: "text-amber-200" },
  aggregator: { bg: "from-emerald-500/25 to-emerald-600/15", border: "border-emerald-400", text: "text-emerald-200" },
  answer: { bg: "from-teal-500/25 to-teal-600/15", border: "border-teal-400", text: "text-teal-200" },
  general: { bg: "from-slate-500/25 to-slate-600/15", border: "border-slate-400", text: "text-slate-200" },
};

// Fail mode badge colors
const failModeBadge: Record<string, string> = {
  FAIL_OPEN: "bg-green-500/30 text-green-200",
  FAIL_CLOSE: "bg-red-500/30 text-red-200",
  FAIL_FALLBACK: "bg-amber-500/30 text-amber-200",
};

// Generic Pipeline Node with timeout and fail mode
function PipelineNode({ data }: { data: SubagentNodeData }) {
  const colors = nodeColors[data.nodeType] || nodeColors.rag;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: data.delay || 0 }}
      className={`px-3 py-2 rounded-lg bg-gradient-to-br ${colors.bg} border ${colors.border} min-w-[95px] backdrop-blur-sm`}
    >
      <Handle type="target" position={Position.Left} className="!bg-white/40 !w-2 !h-2" />
      <div className="text-center">
        <div className="text-base mb-0.5">{data.icon}</div>
        <div className="font-semibold text-white text-[10px]">{data.label}</div>
        <div className={`text-[8px] ${colors.text} opacity-90`}>{data.description}</div>
        {(data.timeout || data.failMode) && (
          <div className="flex gap-1 justify-center mt-1 flex-wrap">
            {data.timeout && (
              <span className="px-1 py-0.5 bg-white/10 rounded text-[7px] text-white/70">{data.timeout}</span>
            )}
            {data.failMode && (
              <span className={`px-1 py-0.5 rounded text-[7px] ${failModeBadge[data.failMode]}`}>
                {data.failMode.replace("FAIL_", "")}
              </span>
            )}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-white/40 !w-2 !h-2" />
    </motion.div>
  );
}

// Intent Node with 9 categories badge
function IntentNode({ data }: { data: BaseNodeData }) {
  const colors = nodeColors.intent;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`px-4 py-3 rounded-xl bg-gradient-to-br ${colors.bg} border-2 ${colors.border} min-w-[120px] backdrop-blur-sm`}
    >
      <Handle type="target" position={Position.Left} className="!bg-purple-400 !w-2.5 !h-2.5" />
      <div className="text-center">
        <div className="text-xl mb-1">{data.icon}</div>
        <div className="font-bold text-white text-sm">{data.label}</div>
        <div className={`text-[9px] ${colors.text}`}>{data.description}</div>
        <div className="mt-1.5 px-2 py-0.5 bg-purple-500/30 rounded text-[8px] text-purple-100">
          9 Categories
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-purple-400 !w-2.5 !h-2.5" />
    </motion.div>
  );
}

// Dynamic Router Node with Send API
function RouterNode({ data }: { data: BaseNodeData }) {
  const colors = nodeColors.router;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.1 }}
      className={`px-4 py-3 rounded-xl bg-gradient-to-br ${colors.bg} border-2 ${colors.border} min-w-[130px] backdrop-blur-sm shadow-lg shadow-violet-500/20`}
    >
      <Handle type="target" position={Position.Left} className="!bg-violet-400 !w-2.5 !h-2.5" />
      <div className="text-center">
        <div className="text-xl mb-1">{data.icon}</div>
        <div className="font-bold text-white text-sm">{data.label}</div>
        <div className={`text-[9px] ${colors.text}`}>{data.description}</div>
        <div className="mt-1.5 flex gap-1 justify-center flex-wrap">
          <span className="px-1.5 py-0.5 bg-violet-500/30 rounded text-[7px] text-violet-100">Send API</span>
          <span className="px-1.5 py-0.5 bg-violet-500/20 rounded text-[7px] text-violet-200">Parallel</span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-violet-400 !w-2.5 !h-2.5" />
    </motion.div>
  );
}

// Aggregator Node
function AggregatorNode({ data }: { data: BaseNodeData }) {
  const colors = nodeColors.aggregator;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.4 }}
      className={`px-4 py-3 rounded-xl bg-gradient-to-br ${colors.bg} border-2 ${colors.border} min-w-[115px] backdrop-blur-sm`}
    >
      <Handle type="target" position={Position.Left} className="!bg-emerald-400 !w-2.5 !h-2.5" />
      <div className="text-center">
        <div className="text-xl mb-1">{data.icon}</div>
        <div className="font-bold text-white text-sm">{data.label}</div>
        <div className={`text-[9px] ${colors.text}`}>{data.description}</div>
        <div className="mt-1.5 px-2 py-0.5 bg-emerald-500/20 rounded text-[7px] text-emerald-200">
          State Merge
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-emerald-400 !w-2.5 !h-2.5" />
    </motion.div>
  );
}

// Output Node (SSE)
function OutputNode({ data }: { data: BaseNodeData }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="px-5 py-4 rounded-xl bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 border-2 border-emerald-400 min-w-[110px] backdrop-blur-sm shadow-xl shadow-emerald-500/30"
    >
      <Handle type="target" position={Position.Left} className="!bg-emerald-400 !w-3 !h-3" />
      <div className="text-center">
        <div className="text-2xl mb-1">{data.icon}</div>
        <div className="font-bold text-emerald-300 text-sm">{data.label}</div>
        <div className="text-[10px] text-emerald-200/80">{data.description}</div>
      </div>
    </motion.div>
  );
}

// Enrichment Label Node (for weather auto-add)
function EnrichmentNode({ data }: { data: SubagentNodeData }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: data.delay || 0 }}
      className="px-2 py-1 rounded-md bg-sky-500/20 border border-dashed border-sky-400/50 min-w-[70px]"
    >
      <Handle type="target" position={Position.Left} className="!bg-sky-400/50 !w-1.5 !h-1.5" />
      <div className="text-center">
        <div className="text-sm">{data.icon}</div>
        <div className="text-[8px] text-sky-300">{data.label}</div>
        <div className="text-[7px] text-sky-400/80">Auto-add</div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-sky-400/50 !w-1.5 !h-1.5" />
    </motion.div>
  );
}

const nodeTypes = {
  pipeline: PipelineNode,
  intent: IntentNode,
  router: RouterNode,
  aggregator: AggregatorNode,
  output: OutputNode,
  enrichment: EnrichmentNode,
};

// LangGraph Chat Workflow Nodes - Enhanced with actual architecture
const initialNodes: Node[] = [
  // Entry: Intent Classification (9 categories)
  {
    id: "intent",
    type: "intent",
    position: { x: 0, y: 180 },
    data: { icon: "🎯", label: "Intent Classifier", description: "Multi-Intent + Confidence" },
  },
  // Optional Vision
  {
    id: "vision",
    type: "pipeline",
    position: { x: 160, y: 180 },
    data: { icon: "👁️", label: "Vision", description: "이미지 분석", nodeType: "vision", delay: 0.05, timeout: "30s", failMode: "FAIL_OPEN" as const },
  },
  // Dynamic Router with Send API
  {
    id: "router",
    type: "router",
    position: { x: 310, y: 170 },
    data: { icon: "🔀", label: "Dynamic Router", description: "Intent-based Fanout" },
  },

  // === Subagent Nodes (9 categories) ===
  // RAG Node (WASTE intent)
  {
    id: "rag",
    type: "pipeline",
    position: { x: 500, y: 0 },
    data: { icon: "📚", label: "RAG", description: "폐기물 지식 검색", nodeType: "rag", delay: 0.15, timeout: "10s", failMode: "FAIL_FALLBACK" as const },
  },
  // Character Node (gRPC)
  {
    id: "character",
    type: "pipeline",
    position: { x: 500, y: 70 },
    data: { icon: "🤖", label: "Character", description: "gRPC Subagent", nodeType: "character", delay: 0.18, timeout: "3s", failMode: "FAIL_OPEN" as const },
  },
  // Location Node (Kakao API)
  {
    id: "location",
    type: "pipeline",
    position: { x: 500, y: 140 },
    data: { icon: "📍", label: "Location", description: "Kakao Place API", nodeType: "location", delay: 0.21, timeout: "5s", failMode: "FAIL_FALLBACK" as const },
  },
  // Bulk Waste Node (MOIS API)
  {
    id: "bulk",
    type: "pipeline",
    position: { x: 500, y: 210 },
    data: { icon: "🛋️", label: "Bulk Waste", description: "행안부 API", nodeType: "bulk", delay: 0.24, timeout: "5s", failMode: "FAIL_FALLBACK" as const },
  },
  // Collection Point Node (KECO API)
  {
    id: "collection",
    type: "pipeline",
    position: { x: 500, y: 280 },
    data: { icon: "🗑️", label: "Collection", description: "KECO 12,800+", nodeType: "collection", delay: 0.27, timeout: "5s", failMode: "FAIL_OPEN" as const },
  },
  // Recyclable Price Node (KECO)
  {
    id: "price",
    type: "pipeline",
    position: { x: 500, y: 350 },
    data: { icon: "💰", label: "Price", description: "시세 조회", nodeType: "price", delay: 0.30, timeout: "5s", failMode: "FAIL_OPEN" as const },
  },
  // Web Search Node (DuckDuckGo)
  {
    id: "web",
    type: "pipeline",
    position: { x: 500, y: 420 },
    data: { icon: "🔍", label: "Web Search", description: "DuckDuckGo", nodeType: "web", delay: 0.33, timeout: "10s", failMode: "FAIL_OPEN" as const },
  },
  // Image Generation Node (DALL-E)
  {
    id: "image",
    type: "pipeline",
    position: { x: 500, y: 490 },
    data: { icon: "🎨", label: "Image Gen", description: "Responses API", nodeType: "image", delay: 0.36, timeout: "60s", failMode: "FAIL_OPEN" as const },
  },

  // Enrichment: Weather (auto-added for WASTE/BULK)
  {
    id: "weather",
    type: "enrichment",
    position: { x: 640, y: 105 },
    data: { icon: "🌤️", label: "Weather", description: "기상청 API", nodeType: "weather", delay: 0.28 },
  },

  // Feedback Node (RAG quality check)
  {
    id: "feedback",
    type: "pipeline",
    position: { x: 640, y: 0 },
    data: { icon: "📊", label: "Feedback", description: "품질 평가", nodeType: "feedback", delay: 0.38, timeout: "5s" },
  },

  // General Fallback
  {
    id: "general",
    type: "pipeline",
    position: { x: 640, y: 420 },
    data: { icon: "💬", label: "General", description: "Fallback LLM", nodeType: "general", delay: 0.35, failMode: "FAIL_CLOSE" as const },
  },

  // Aggregator
  {
    id: "aggregator",
    type: "aggregator",
    position: { x: 780, y: 200 },
    data: { icon: "🔄", label: "Aggregator", description: "결과 병합 + 검증" },
  },

  // Answer Generation
  {
    id: "answer",
    type: "pipeline",
    position: { x: 930, y: 200 },
    data: { icon: "✍️", label: "Answer", description: "응답 생성", nodeType: "answer", delay: 0.45, timeout: "30s" },
  },

  // SSE Output
  {
    id: "output",
    type: "output",
    position: { x: 1070, y: 195 },
    data: { icon: "📡", label: "SSE Stream", description: "실시간 스트리밍" },
  },
];

const initialEdges: Edge[] = [
  // Entry flow
  { id: "e-intent-vision", source: "intent", target: "vision", animated: true, style: { stroke: "#a78bfa", strokeWidth: 2 } },
  { id: "e-vision-router", source: "vision", target: "router", animated: true, style: { stroke: "#a78bfa", strokeWidth: 2 } },

  // Send API fanout (parallel routing)
  { id: "e-router-rag", source: "router", target: "rag", animated: true, style: { stroke: "#c4b5fd" } },
  { id: "e-router-character", source: "router", target: "character", animated: true, style: { stroke: "#c4b5fd" } },
  { id: "e-router-location", source: "router", target: "location", animated: true, style: { stroke: "#c4b5fd" } },
  { id: "e-router-bulk", source: "router", target: "bulk", animated: true, style: { stroke: "#c4b5fd" } },
  { id: "e-router-collection", source: "router", target: "collection", animated: true, style: { stroke: "#c4b5fd" } },
  { id: "e-router-price", source: "router", target: "price", animated: true, style: { stroke: "#c4b5fd" } },
  { id: "e-router-web", source: "router", target: "web", animated: true, style: { stroke: "#c4b5fd" } },
  { id: "e-router-image", source: "router", target: "image", animated: true, style: { stroke: "#c4b5fd" } },
  { id: "e-router-general", source: "router", target: "general", style: { stroke: "#94a3b8", strokeDasharray: "4,4" } },

  // Enrichment: WASTE/BULK → Weather (auto-add)
  { id: "e-rag-weather", source: "rag", target: "weather", style: { stroke: "#38bdf8", strokeDasharray: "3,3" }, label: "enrich" },
  { id: "e-bulk-weather", source: "bulk", target: "weather", style: { stroke: "#38bdf8", strokeDasharray: "3,3" } },

  // RAG → Feedback (quality check)
  { id: "e-rag-feedback", source: "rag", target: "feedback", style: { stroke: "#fbbf24" } },

  // Feedback → Web (fallback on low quality)
  { id: "e-feedback-web", source: "feedback", target: "web", style: { stroke: "#f59e0b", strokeDasharray: "5,5" }, label: "low" },

  // All nodes → Aggregator
  { id: "e-feedback-agg", source: "feedback", target: "aggregator", style: { stroke: "#10b981" } },
  { id: "e-weather-agg", source: "weather", target: "aggregator", style: { stroke: "#10b981" } },
  { id: "e-character-agg", source: "character", target: "aggregator", style: { stroke: "#10b981" } },
  { id: "e-location-agg", source: "location", target: "aggregator", style: { stroke: "#10b981" } },
  { id: "e-bulk-agg", source: "bulk", target: "aggregator", style: { stroke: "#10b981" } },
  { id: "e-collection-agg", source: "collection", target: "aggregator", style: { stroke: "#10b981" } },
  { id: "e-price-agg", source: "price", target: "aggregator", style: { stroke: "#10b981" } },
  { id: "e-web-agg", source: "web", target: "aggregator", style: { stroke: "#10b981" } },
  { id: "e-image-agg", source: "image", target: "aggregator", style: { stroke: "#10b981" } },
  { id: "e-general-agg", source: "general", target: "aggregator", style: { stroke: "#10b981" } },

  // Output chain
  { id: "e-agg-answer", source: "aggregator", target: "answer", animated: true, style: { stroke: "#14b8a6", strokeWidth: 2 } },
  { id: "e-answer-output", source: "answer", target: "output", animated: true, style: { stroke: "#34d399", strokeWidth: 3 } },
];

export function ChatWorkflowDiagram() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="w-full h-[550px] rounded-xl overflow-hidden border border-white/10 bg-[#0a0a12]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        minZoom={0.25}
        maxZoom={1.5}
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#1a1a2e" />
        <Controls
          className="!bg-[#1a1a2e] !border-white/10 !rounded-lg"
        />
      </ReactFlow>
    </div>
  );
}
