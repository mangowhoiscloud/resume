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
interface InfraNodeData {
  icon: ReactNode;
  label: string;
  description: string;
  nodeType: string;
  tech?: string;
  badges?: string[];
  delay?: number;
}

// Layer colors
const layerColors: Record<string, { bg: string; border: string; text: string; glow?: string }> = {
  client: { bg: "from-cyan-500/20 to-cyan-600/10", border: "border-cyan-400/60", text: "text-cyan-200" },
  api: { bg: "from-blue-500/20 to-blue-600/10", border: "border-blue-400/60", text: "text-blue-200" },
  worker: { bg: "from-purple-500/20 to-purple-600/10", border: "border-purple-400/60", text: "text-purple-200" },
  queue: { bg: "from-orange-500/20 to-orange-600/10", border: "border-orange-400/60", text: "text-orange-200" },
  redis: { bg: "from-red-500/20 to-red-600/10", border: "border-red-400/60", text: "text-red-200" },
  gateway: { bg: "from-emerald-500/25 to-emerald-600/15", border: "border-emerald-400", text: "text-emerald-200", glow: "shadow-emerald-500/20" },
  db: { bg: "from-indigo-500/20 to-indigo-600/10", border: "border-indigo-400/60", text: "text-indigo-200" },
  router: { bg: "from-rose-500/20 to-rose-600/10", border: "border-rose-400/60", text: "text-rose-200" },
};

// Standard Infrastructure Node
function InfraNode({ data }: { data: InfraNodeData }) {
  const colors = layerColors[data.nodeType] || layerColors.api;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: data.delay || 0 }}
      className={`px-3 py-2.5 rounded-lg bg-gradient-to-br ${colors.bg} border ${colors.border} min-w-[100px] backdrop-blur-sm ${colors.glow || ""}`}
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
        {data.badges && data.badges.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-0.5 justify-center">
            {data.badges.map((badge, i) => (
              <span key={i} className="px-1 py-0.5 bg-white/5 rounded text-[6px] text-white/60">
                {badge}
              </span>
            ))}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-white/30 !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-white/30 !w-2 !h-2" />
    </motion.div>
  );
}

// Gateway Node (SSE)
function GatewayNode({ data }: { data: InfraNodeData }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: data.delay || 0 }}
      className="px-5 py-4 rounded-xl bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 border-2 border-emerald-400 min-w-[120px] backdrop-blur-sm shadow-xl shadow-emerald-500/30"
    >
      <Handle type="target" position={Position.Left} className="!bg-emerald-400 !w-3 !h-3" />
      <div className="text-center">
        <div className="text-2xl mb-1">{data.icon}</div>
        <div className="font-bold text-emerald-300 text-sm">{data.label}</div>
        <div className="text-[10px] text-emerald-200/80">{data.description}</div>
        {data.tech && (
          <div className="mt-2 px-2 py-0.5 bg-emerald-500/20 rounded text-[8px] text-emerald-200/80">
            {data.tech}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-emerald-400 !w-3 !h-3" />
    </motion.div>
  );
}

// Event Router Node (Composite Event Bus core)
function EventRouterNode({ data }: { data: InfraNodeData }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: data.delay || 0 }}
      className="px-4 py-3 rounded-xl bg-gradient-to-br from-rose-500/25 to-rose-600/15 border-2 border-rose-400 min-w-[140px] backdrop-blur-sm"
    >
      <Handle type="target" position={Position.Left} className="!bg-rose-400 !w-2.5 !h-2.5" />
      <div className="text-center">
        <div className="text-xl mb-1">{data.icon}</div>
        <div className="font-bold text-white text-sm">{data.label}</div>
        <div className="text-[9px] text-rose-200">{data.description}</div>
        <div className="mt-2 flex flex-wrap gap-1 justify-center">
          <span className="px-1.5 py-0.5 bg-rose-500/30 rounded text-[7px] text-rose-100">XREADGROUP</span>
          <span className="px-1.5 py-0.5 bg-rose-500/20 rounded text-[7px] text-rose-200">Lua Script</span>
          <span className="px-1.5 py-0.5 bg-rose-500/20 rounded text-[7px] text-rose-200">PUBLISH</span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-rose-400 !w-2.5 !h-2.5" />
    </motion.div>
  );
}

// Redis 3-Tier Node
function RedisTierNode({ data }: { data: InfraNodeData }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: data.delay || 0 }}
      className="px-4 py-3 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/10 border-2 border-red-400/70 min-w-[150px] backdrop-blur-sm"
    >
      <Handle type="target" position={Position.Left} className="!bg-red-400 !w-2.5 !h-2.5" />
      <Handle type="target" position={Position.Top} id="top" className="!bg-red-400 !w-2.5 !h-2.5" />
      <div className="text-center">
        <div className="text-xl mb-1">{data.icon}</div>
        <div className="font-bold text-white text-sm">{data.label}</div>
        <div className="text-[9px] text-red-200">{data.description}</div>
        <div className="mt-2 grid grid-cols-3 gap-1">
          <div className="px-1 py-1 bg-red-500/25 rounded">
            <div className="text-[7px] text-red-100 font-medium">Streams</div>
            <div className="text-[6px] text-red-300">Durable</div>
          </div>
          <div className="px-1 py-1 bg-red-500/20 rounded">
            <div className="text-[7px] text-red-100 font-medium">Pub/Sub</div>
            <div className="text-[6px] text-red-300">Fan-out</div>
          </div>
          <div className="px-1 py-1 bg-red-500/15 rounded">
            <div className="text-[7px] text-red-100 font-medium">State KV</div>
            <div className="text-[6px] text-red-300">Recovery</div>
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-red-400 !w-2.5 !h-2.5" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-red-400 !w-2.5 !h-2.5" />
    </motion.div>
  );
}

const nodeTypes = {
  infra: InfraNode,
  gateway: GatewayNode,
  eventRouter: EventRouterNode,
  redisTier: RedisTierNode,
};

// Infrastructure Nodes - Composite Event Bus Architecture
const initialNodes: Node[] = [
  // === Client Layer ===
  {
    id: "client",
    type: "infra",
    position: { x: 0, y: 80 },
    data: { icon: "📱", label: "Mobile App", description: "React Native", nodeType: "client", delay: 0 },
  },
  {
    id: "web",
    type: "infra",
    position: { x: 0, y: 170 },
    data: { icon: "🌐", label: "Web Client", description: "Vite + React", nodeType: "client", delay: 0.05 },
  },

  // === API Gateway Layer ===
  {
    id: "envoy",
    type: "infra",
    position: { x: 140, y: 125 },
    data: { icon: "🚪", label: "Envoy Gateway", description: "L7 Routing", nodeType: "api", tech: "ext_authz", delay: 0.1 },
  },

  // === API Services ===
  {
    id: "chat-api",
    type: "infra",
    position: { x: 290, y: 40 },
    data: { icon: "💬", label: "Chat API", description: "REST + WebSocket", nodeType: "api", delay: 0.15 },
  },
  {
    id: "scan-api",
    type: "infra",
    position: { x: 290, y: 125 },
    data: { icon: "📷", label: "Scan API", description: "이미지 업로드", nodeType: "api", delay: 0.18 },
  },
  {
    id: "auth-api",
    type: "infra",
    position: { x: 290, y: 210 },
    data: { icon: "🔐", label: "Auth API", description: "OAuth 2.0 + JWT", nodeType: "api", delay: 0.21 },
  },

  // === Message Queue ===
  {
    id: "rabbitmq",
    type: "infra",
    position: { x: 450, y: 125 },
    data: { icon: "🐰", label: "RabbitMQ", description: "Task Queue", nodeType: "queue", tech: "Quorum Queue", badges: ["DLX", "Fanout"], delay: 0.25 },
  },

  // === Workers ===
  {
    id: "chat-worker",
    type: "infra",
    position: { x: 610, y: 40 },
    data: { icon: "🤖", label: "Chat Worker", description: "LangGraph Pipeline", nodeType: "worker", tech: "Send API", delay: 0.3 },
  },
  {
    id: "scan-worker",
    type: "infra",
    position: { x: 610, y: 125 },
    data: { icon: "🧠", label: "Scan Worker", description: "4-Stage Chain", nodeType: "worker", tech: "Celery", delay: 0.33 },
  },
  {
    id: "character-worker",
    type: "infra",
    position: { x: 610, y: 210 },
    data: { icon: "👤", label: "Character Worker", description: "gRPC Server", nodeType: "worker", delay: 0.36 },
  },

  // === Event Bus Layer (Composite) ===
  // Redis 3-Tier (Streams + Pub/Sub + State KV)
  {
    id: "redis-tier",
    type: "redisTier",
    position: { x: 780, y: 30 },
    data: { icon: "⚡", label: "Redis 3-Tier", description: "Composite Event Bus", delay: 0.4 },
  },

  // Event Router
  {
    id: "event-router",
    type: "eventRouter",
    position: { x: 780, y: 175 },
    data: { icon: "🔄", label: "Event Router", description: "Consumer + Processor", delay: 0.42 },
  },

  // === SSE Gateway ===
  {
    id: "sse-gateway",
    type: "gateway",
    position: { x: 990, y: 90 },
    data: { icon: "📡", label: "SSE Gateway", description: "실시간 스트리밍", nodeType: "gateway", tech: "Sub → SSE", delay: 0.5 },
  },

  // === Database Layer ===
  {
    id: "postgres",
    type: "infra",
    position: { x: 450, y: 290 },
    data: { icon: "🐘", label: "PostgreSQL", description: "Primary DB", nodeType: "db", tech: "pgvector", delay: 0.2 },
  },
  {
    id: "redis-cache",
    type: "infra",
    position: { x: 610, y: 290 },
    data: { icon: "💾", label: "Redis Sentinel", description: "Cache + Session", nodeType: "redis", tech: "3-Node HA", delay: 0.25 },
  },
];

const initialEdges: Edge[] = [
  // Client to Gateway
  { id: "e-client-envoy", source: "client", target: "envoy", animated: true, style: { stroke: "#06b6d4" } },
  { id: "e-web-envoy", source: "web", target: "envoy", animated: true, style: { stroke: "#06b6d4" } },

  // Gateway to APIs
  { id: "e-envoy-chat", source: "envoy", target: "chat-api", style: { stroke: "#3b82f6" } },
  { id: "e-envoy-scan", source: "envoy", target: "scan-api", style: { stroke: "#3b82f6" } },
  { id: "e-envoy-auth", source: "envoy", target: "auth-api", style: { stroke: "#3b82f6" } },

  // APIs to RabbitMQ
  { id: "e-chat-rabbit", source: "chat-api", target: "rabbitmq", animated: true, style: { stroke: "#f97316" } },
  { id: "e-scan-rabbit", source: "scan-api", target: "rabbitmq", animated: true, style: { stroke: "#f97316" } },

  // RabbitMQ to Workers
  { id: "e-rabbit-chatw", source: "rabbitmq", target: "chat-worker", animated: true, style: { stroke: "#a855f7" } },
  { id: "e-rabbit-scanw", source: "rabbitmq", target: "scan-worker", animated: true, style: { stroke: "#a855f7" } },
  { id: "e-rabbit-charw", source: "rabbitmq", target: "character-worker", animated: true, style: { stroke: "#a855f7" } },

  // Workers to Redis Streams (Event Publishing)
  { id: "e-chatw-redis", source: "chat-worker", target: "redis-tier", animated: true, style: { stroke: "#ef4444", strokeWidth: 2 }, label: "XADD" },
  { id: "e-scanw-redis", source: "scan-worker", target: "redis-tier", animated: true, style: { stroke: "#ef4444", strokeWidth: 2 } },
  { id: "e-charw-redis", source: "character-worker", target: "redis-tier", animated: true, style: { stroke: "#ef4444", strokeWidth: 2 } },

  // Redis Streams to Event Router (XREADGROUP)
  { id: "e-redis-router", source: "redis-tier", target: "event-router", animated: true, style: { stroke: "#f43f5e", strokeWidth: 2 }, sourceHandle: "bottom" },

  // Event Router to Redis Pub/Sub (PUBLISH)
  { id: "e-router-pubsub", source: "event-router", target: "redis-tier", style: { stroke: "#fb7185", strokeDasharray: "4,4" }, targetHandle: "bottom" },

  // Redis Pub/Sub to SSE Gateway
  { id: "e-redis-sse", source: "redis-tier", target: "sse-gateway", animated: true, style: { stroke: "#34d399", strokeWidth: 3 } },

  // SSE to Clients (reverse flow indicator)
  { id: "e-sse-client", source: "sse-gateway", target: "client", animated: true, style: { stroke: "#34d399", strokeDasharray: "5,5" }, label: "SSE" },

  // Database connections (dashed for persistence)
  { id: "e-chat-pg", source: "chat-api", target: "postgres", style: { stroke: "#6366f1", strokeDasharray: "4,4" }, sourceHandle: "bottom", targetHandle: "top" },
  { id: "e-auth-pg", source: "auth-api", target: "postgres", style: { stroke: "#6366f1", strokeDasharray: "4,4" }, sourceHandle: "bottom", targetHandle: "top" },
  { id: "e-workers-cache", source: "chat-worker", target: "redis-cache", style: { stroke: "#ef4444", strokeDasharray: "4,4" }, sourceHandle: "bottom", targetHandle: "top" },
  { id: "e-scan-cache", source: "scan-worker", target: "redis-cache", style: { stroke: "#ef4444", strokeDasharray: "4,4" }, sourceHandle: "bottom", targetHandle: "top" },
];

export function InfrastructureDiagram() {
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
        fitViewOptions={{ padding: 0.12 }}
        minZoom={0.3}
        maxZoom={1.5}
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#1a1a2e" />
        <Controls className="!bg-[#1a1a2e] !border-white/10 !rounded-lg" />
      </ReactFlow>
    </div>
  );
}
