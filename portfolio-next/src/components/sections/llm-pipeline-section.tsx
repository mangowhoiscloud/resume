"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChatWorkflowDiagram } from "@/components/diagrams/chat-workflow-diagram";
import { ScanPipelineDiagram } from "@/components/diagrams/scan-pipeline-diagram";
import { InfrastructureDiagram } from "@/components/diagrams/infrastructure-diagram";

type TabType = "chat" | "scan" | "infra";

export function LLMPipelineSection() {
  const [activeTab, setActiveTab] = useState<TabType>("chat");

  const tabs = [
    { id: "chat" as const, label: "Chat Agentic Workflow", icon: "🤖", status: "in-progress" },
    { id: "scan" as const, label: "Scan AI Pipeline", icon: "🧠", status: "stable" },
    { id: "infra" as const, label: "Infrastructure", icon: "📦", status: "stable" },
  ];

  return (
    <section className="py-16">
      <div className="max-w-6xl mx-auto px-4">
        {/* Section Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm font-mono text-[var(--primary)]">03</span>
            <h2 className="text-2xl font-bold text-white">
              LLM Pipeline + Async SSE
            </h2>
          </div>
          <p className="text-[var(--text-secondary)] max-w-2xl">
            LangGraph 기반 Multi-Agent 파이프라인과 Redis Streams 기반 비동기 이벤트 릴레이 아키텍처
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-lg w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                ${activeTab === tab.id
                  ? "bg-[var(--primary)]/20 text-[var(--primary)]"
                  : "text-[var(--text-muted)] hover:text-white hover:bg-white/5"
                }
              `}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.status === "in-progress" && (
                <span className="px-1.5 py-0.5 text-[10px] bg-yellow-500/20 text-yellow-400 rounded">
                  진행중
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "chat" && (
            <div className="space-y-4">
              {/* Diagram Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-white">
                    Chat Agentic Workflow
                  </h3>
                  <a
                    href="https://github.com/langchain-ai/langgraph"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                  >
                    LangGraph ↗
                  </a>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    Intent Router
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Aggregator
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[var(--primary)]"></span>
                    Output
                  </span>
                </div>
              </div>

              {/* React Flow Diagram */}
              <ChatWorkflowDiagram />

              {/* Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <InfoCard
                  icon="🎯"
                  title="9 Intent Categories"
                  description="Multi-Intent + Chain-of-Intent 전이 부스트"
                />
                <InfoCard
                  icon="🔀"
                  title="Send API Fanout"
                  description="병렬 라우팅 + Enrichment 규칙 (WASTE→Weather)"
                />
                <InfoCard
                  icon="🛡️"
                  title="Circuit Breaker"
                  description="FAIL_OPEN/CLOSE/FALLBACK 3모드 회복"
                />
              </div>
            </div>
          )}

          {activeTab === "scan" && (
            <div className="space-y-4">
              {/* Diagram Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-white">
                    Scan AI Pipeline
                  </h3>
                  <span className="text-xs text-[var(--text-muted)]">
                    4-Stage Celery Chain
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                    Vision
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Rule
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Answer
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    Reward
                  </span>
                </div>
              </div>

              {/* React Flow Diagram */}
              <ScanPipelineDiagram />

              {/* Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <InfoCard
                  icon="⏱️"
                  title="10-35초 → <100ms"
                  description="동기 대기 제거로 즉시 응답 + 5분 처리"
                />
                <InfoCard
                  icon="⚠️"
                  title="DLQ + Beat"
                  description="단계별 실패 격리 + 5분 주기 재처리"
                />
                <InfoCard
                  icon="🔔"
                  title="Webhook + SSE"
                  description="결과 콜백 + 실시간 진행상황 스트리밍"
                />
              </div>
            </div>
          )}

          {activeTab === "infra" && (
            <div className="space-y-4">
              {/* Diagram Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-white">
                    Infrastructure
                  </h3>
                  <span className="text-xs text-[var(--text-muted)]">
                    Kubernetes + Event-Driven Architecture
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    API
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    Worker
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    Redis
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#00ff88]"></span>
                    SSE
                  </span>
                </div>
              </div>

              {/* React Flow Diagram */}
              <InfrastructureDiagram />

              {/* Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <InfoCard
                  icon="⚡"
                  title="Composite Event Bus"
                  description="Streams(Durable) + Pub/Sub(Fan-out) + KV(Recovery)"
                />
                <InfoCard
                  icon="🔄"
                  title="Event Router"
                  description="XREADGROUP → Lua Script → PUBLISH 파이프라인"
                />
                <InfoCard
                  icon="📡"
                  title="<1ms Latency"
                  description="Redis Pub/Sub 기반 저지연 SSE 전송"
                />
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

function InfoCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="p-4 rounded-lg bg-white/5 border border-white/10 hover:border-[var(--primary)]/30 transition-colors">
      <div className="flex items-start gap-3">
        <span className="text-xl">{icon}</span>
        <div>
          <h4 className="font-medium text-white text-sm">{title}</h4>
          <p className="text-xs text-[var(--text-muted)] mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}
