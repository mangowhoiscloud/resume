import { LLMPipelineSection } from "@/components/sections/llm-pipeline-section";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      {/* Hero Section - Placeholder */}
      <section className="py-20 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Eco² Portfolio
          </h1>
          <p className="text-lg text-[var(--text-secondary)] mb-8">
            Multi-LLM Agent 기반 비동기 분산 클러스터
          </p>
          <div className="flex justify-center gap-8 text-sm">
            <StatItem value="24" label="Cluster Nodes" />
            <StatItem value="2,500 VU" label="1,200+ RPS" />
            <StatItem value="300 VU" label="SLA (Scan SSE)" />
            <StatItem value="83+ · 51+" label="Dev Logs · KB" />
          </div>
        </div>
      </section>

      {/* LLM Pipeline Section */}
      <LLMPipelineSection />

      {/* Placeholder for other sections */}
      <section className="py-16 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 text-center text-[var(--text-muted)]">
          <p>더 많은 섹션이 추가될 예정입니다...</p>
          <p className="text-sm mt-2">
            기존 HTML 포트폴리오:{" "}
            <a
              href="/eco2-portfolio.html"
              className="text-[var(--primary)] hover:underline"
            >
              eco2-portfolio.html
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-2xl font-bold text-[var(--primary)]">{value}</div>
      <div className="text-[var(--text-muted)]">{label}</div>
    </div>
  );
}
