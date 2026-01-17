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
interface StageNodeData {
  icon: ReactNode;
  label: string;
  description: string;
  stage: number;
  tech?: string;
  duration?: string;
  delay?: number;
}

interface ServiceNodeData {
  icon: ReactNode;
  label: string;
  description: string;
  nodeType: string;
  tech?: string;
  delay?: number;
}

// Stage Node (Main Celery Chain)
function StageNode({ data }: { data: StageNodeData }) {
  const stageColors = [
    { bg: "from-cyan-500/25 to-cyan-600/15", border: "border-cyan-400", text: "text-cyan-200", badge: "bg-cyan-500/30" },
    { bg: "from-amber-500/25 to-amber-600/15", border: "border-amber-400", text: "text-amber-200", badge: "bg-amber-500/30" },
    { bg: "from-emerald-500/25 to-emerald-600/15", border: "border-emerald-400", text: "text-emerald-200", badge: "bg-emerald-500/30" },
    { bg: "from-purple-500/25 to-purple-600/15", border: "border-purple-400", text: "text-purple-200", badge: "bg-purple-500/30" },
  ];

  const colors = stageColors[data.stage - 1] || stageColors[0];

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: data.delay || 0 }}
      className={`px-5 py-4 rounded-xl bg-gradient-to-br ${colors.bg} border-2 ${colors.border} min-w-[140px] backdrop-blur-sm relative`}
    >
      <Handle type="target" position={Position.Left} className="!bg-white/50 !w-3 !h-3" />
      {/* Stage number badge */}
      <div className={`absolute -top-2.5 -left-2.5 w-7 h-7 rounded-full ${colors.badge} border-2 ${colors.border} flex items-center justify-center text-xs font-bold text-white shadow-lg`}>
        {data.stage}
      </div>
      <div className="text-center">
        <div className="text-2xl mb-1">{data.icon}</div>
        <div className="font-bold text-white text-sm">{data.label}</div>
        <div className={`text-[10px] ${colors.text} mt-0.5`}>{data.description}</div>
        <div className="mt-2 flex flex-col gap-1">
          {data.tech && (
            <span className="px-2 py-0.5 bg-white/10 rounded text-[8px] text-white/80">
              {data.tech}
            </span>
          )}
          {data.duration && (
            <span className={`px-2 py-0.5 ${colors.badge} rounded text-[8px] ${colors.text}`}>
              {data.duration}
            </span>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-white/50 !w-3 !h-3" />
    </motion.div>
  );
}

// Service Node (Supporting services)
function ServiceNode({ data }: { data: ServiceNodeData }) {
  const typeColors: Record<string, { bg: string; border: string; text: string }> = {
    queue: { bg: "from-orange-500/20 to-orange-600/10", border: "border-orange-400/60", text: "text-orange-200" },
    redis: { bg: "from-red-500/20 to-red-600/10", border: "border-red-400/60", text: "text-red-200" },
    dlq: { bg: "from-rose-500/20 to-rose-600/10", border: "border-rose-400/60", text: "text-rose-200" },
    input: { bg: "from-blue-500/20 to-blue-600/10", border: "border-blue-400/60", text: "text-blue-200" },
    webhook: { bg: "from-violet-500/20 to-violet-600/10", border: "border-violet-400/60", text: "text-violet-200" },
  };

  const colors = typeColors[data.nodeType] || typeColors.queue;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: data.delay || 0 }}
      className={`px-3 py-2 rounded-lg bg-gradient-to-br ${colors.bg} border ${colors.border} min-w-[100px] backdrop-blur-sm`}
    >
      <Handle type="target" position={Position.Left} className="!bg-white/30 !w-2 !h-2" />
      <Handle type="target" position={Position.Top} id="top" className="!bg-white/30 !w-2 !h-2" />
      <div className="text-center">
        <div className="text-lg mb-0.5">{data.icon}</div>
        <div className="font-semibold text-white text-[10px]">{data.label}</div>
        <div className={`text-[8px] ${colors.text}`}>{data.description}</div>
        {data.tech && (
          <div className="mt-1 px-1.5 py-0.5 bg-white/10 rounded text-[7px] text-white/70">
            {data.tech}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-white/30 !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-white/30 !w-2 !h-2" />
    </motion.div>
  );
}

// Output Node (SSE)
function OutputNode({ data }: { data: ServiceNodeData }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: data.delay || 0 }}
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

// DLQ Node
function DLQNode({ data }: { data: ServiceNodeData }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: data.delay || 0 }}
      className="px-2 py-1.5 rounded-md bg-rose-500/15 border border-dashed border-rose-400/50 min-w-[60px]"
    >
      <Handle type="target" position={Position.Top} className="!bg-rose-400/50 !w-1.5 !h-1.5" />
      <div className="text-center">
        <div className="text-xs">{data.icon}</div>
        <div className="text-[7px] text-rose-300">{data.label}</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-rose-400/50 !w-1.5 !h-1.5" />
    </motion.div>
  );
}

const nodeTypes = {
  stage: StageNode,
  service: ServiceNode,
  output: OutputNode,
  dlq: DLQNode,
};

// Scan AI Pipeline: Vision → Rule → Answer → Reward (4-Stage Celery Chain)
const initialNodes: Node[] = [
  // Input
  {
    id: "input",
    type: "service",
    position: { x: 0, y: 130 },
    data: { icon: "📷", label: "Image Upload", description: "POST /v1/scan", nodeType: "input", delay: 0 },
  },

  // Stage 1: Vision (GPT-4V)
  {
    id: "vision",
    type: "stage",
    position: { x: 150, y: 115 },
    data: {
      icon: "👁️",
      label: "Vision",
      description: "이미지 분석 + 분류",
      stage: 1,
      tech: "GPT-4V",
      duration: "5-15초",
      delay: 0.1,
    },
  },

  // Stage 2: Rule (RAG Retrieval)
  {
    id: "rule",
    type: "stage",
    position: { x: 340, y: 115 },
    data: {
      icon: "📋",
      label: "Rule",
      description: "배출 규정 검색",
      stage: 2,
      tech: "JSON RAG",
      duration: "<1초",
      delay: 0.2,
    },
  },

  // Stage 3: Answer (GPT-4)
  {
    id: "answer",
    type: "stage",
    position: { x: 530, y: 115 },
    data: {
      icon: "💬",
      label: "Answer",
      description: "최종 답변 생성",
      stage: 3,
      tech: "GPT-4 Turbo",
      duration: "3-10초",
      delay: 0.3,
    },
  },

  // Stage 4: Reward (gRPC)
  {
    id: "reward",
    type: "stage",
    position: { x: 720, y: 115 },
    data: {
      icon: "🏆",
      label: "Reward",
      description: "리워드 평가 + 지급",
      stage: 4,
      tech: "gRPC → Character",
      duration: "1-3초",
      delay: 0.4,
    },
  },

  // RabbitMQ (Celery Broker)
  {
    id: "rabbitmq",
    type: "service",
    position: { x: 340, y: 280 },
    data: { icon: "🐰", label: "RabbitMQ", description: "Celery Broker", nodeType: "queue", tech: "chain()", delay: 0.15 },
  },

  // DLQ Nodes
  {
    id: "dlq-vision",
    type: "dlq",
    position: { x: 170, y: 250 },
    data: { icon: "⚠️", label: "DLQ", nodeType: "dlq", delay: 0.25 },
  },
  {
    id: "dlq-rule",
    type: "dlq",
    position: { x: 360, y: 250 },
    data: { icon: "⚠️", label: "DLQ", nodeType: "dlq", delay: 0.28 },
  },
  {
    id: "dlq-answer",
    type: "dlq",
    position: { x: 550, y: 250 },
    data: { icon: "⚠️", label: "DLQ", nodeType: "dlq", delay: 0.31 },
  },
  {
    id: "dlq-reward",
    type: "dlq",
    position: { x: 740, y: 250 },
    data: { icon: "⚠️", label: "DLQ", nodeType: "dlq", delay: 0.34 },
  },

  // Beat (DLQ Reprocessor)
  {
    id: "beat",
    type: "service",
    position: { x: 530, y: 330 },
    data: { icon: "⏰", label: "Celery Beat", description: "DLQ 재처리", nodeType: "queue", tech: "5분 주기", delay: 0.35 },
  },

  // Event Relay (Redis Streams)
  {
    id: "redis",
    type: "service",
    position: { x: 720, y: 280 },
    data: { icon: "⚡", label: "Redis Streams", description: "Event Relay", nodeType: "redis", delay: 0.4 },
  },

  // Webhook
  {
    id: "webhook",
    type: "service",
    position: { x: 600, y: 15 },
    data: { icon: "🔔", label: "Webhook", description: "결과 콜백", nodeType: "webhook", delay: 0.35 },
  },

  // SSE Output
  {
    id: "sse",
    type: "output",
    position: { x: 900, y: 120 },
    data: { icon: "📡", label: "SSE Stream", description: "실시간 진행상황", nodeType: "sse", delay: 0.5 },
  },
];

const initialEdges: Edge[] = [
  // Main pipeline flow (Celery Chain)
  { id: "e-input-vision", source: "input", target: "vision", animated: true, style: { stroke: "#3b82f6", strokeWidth: 2 } },
  { id: "e-vision-rule", source: "vision", target: "rule", animated: true, style: { stroke: "#06b6d4", strokeWidth: 3 }, label: "chain" },
  { id: "e-rule-answer", source: "rule", target: "answer", animated: true, style: { stroke: "#f59e0b", strokeWidth: 3 } },
  { id: "e-answer-reward", source: "answer", target: "reward", animated: true, style: { stroke: "#10b981", strokeWidth: 3 } },
  { id: "e-reward-sse", source: "reward", target: "sse", animated: true, style: { stroke: "#34d399", strokeWidth: 3 } },

  // Webhook from Answer
  { id: "e-answer-webhook", source: "answer", target: "webhook", style: { stroke: "#8b5cf6", strokeDasharray: "4,4" } },

  // Stages to RabbitMQ (task dispatch)
  { id: "e-vision-rabbit", source: "vision", target: "rabbitmq", style: { stroke: "#f97316", strokeDasharray: "3,3" }, sourceHandle: "bottom", targetHandle: "top" },
  { id: "e-rule-rabbit", source: "rule", target: "rabbitmq", style: { stroke: "#f97316", strokeDasharray: "3,3" }, sourceHandle: "bottom", targetHandle: "top" },
  { id: "e-answer-rabbit", source: "answer", target: "rabbitmq", style: { stroke: "#f97316", strokeDasharray: "3,3" }, sourceHandle: "bottom", targetHandle: "top" },
  { id: "e-reward-rabbit", source: "reward", target: "rabbitmq", style: { stroke: "#f97316", strokeDasharray: "3,3" }, sourceHandle: "bottom", targetHandle: "top" },

  // DLQ connections (failures)
  { id: "e-vision-dlq", source: "vision", target: "dlq-vision", style: { stroke: "#f43f5e", strokeDasharray: "2,2" }, sourceHandle: "bottom" },
  { id: "e-rule-dlq", source: "rule", target: "dlq-rule", style: { stroke: "#f43f5e", strokeDasharray: "2,2" }, sourceHandle: "bottom" },
  { id: "e-answer-dlq", source: "answer", target: "dlq-answer", style: { stroke: "#f43f5e", strokeDasharray: "2,2" }, sourceHandle: "bottom" },
  { id: "e-reward-dlq", source: "reward", target: "dlq-reward", style: { stroke: "#f43f5e", strokeDasharray: "2,2" }, sourceHandle: "bottom" },

  // Beat reprocesses DLQs
  { id: "e-beat-dlq1", source: "beat", target: "dlq-vision", style: { stroke: "#fb923c", strokeDasharray: "4,4" } },
  { id: "e-beat-dlq2", source: "beat", target: "dlq-rule", style: { stroke: "#fb923c", strokeDasharray: "4,4" } },
  { id: "e-beat-dlq3", source: "beat", target: "dlq-answer", style: { stroke: "#fb923c", strokeDasharray: "4,4" } },
  { id: "e-beat-dlq4", source: "beat", target: "dlq-reward", style: { stroke: "#fb923c", strokeDasharray: "4,4" } },

  // Event relay to SSE
  { id: "e-rabbit-redis", source: "rabbitmq", target: "redis", animated: true, style: { stroke: "#ef4444" } },
  { id: "e-redis-sse", source: "redis", target: "sse", animated: true, style: { stroke: "#34d399", strokeWidth: 2 } },
];

export function ScanPipelineDiagram() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="w-full h-[450px] rounded-xl overflow-hidden border border-white/10 bg-[#0a0a12]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.3}
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
