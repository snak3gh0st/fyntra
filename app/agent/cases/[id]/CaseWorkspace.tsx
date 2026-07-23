"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { CaseStagePill, PolicyStatusPill } from "@/components/StatusPill";
import { caseStageLabel, type CaseStage } from "@/lib/case-workflow";
import { transitionCase, updateRequirement } from "./actions";

type Requirement = { id: string; title: string; status: string };
type Application = { id: string; status: string; requirements: Requirement[] };

type CaseData = {
  id: string;
  stage: CaseStage;
  status: string;
  objective: string | null;
  productType: string | null;
  carrier: string | null;
  targetCoverage: string | null;
  monthlyBudget: string | null;
  nextStages: CaseStage[];
  prospect: {
    name: string;
    email: string | null;
    phone: string | null;
    state: string | null;
    tobaccoStatus: string | null;
    dateOfBirth: string | null;
  };
  agentName: string;
  illustrations: { id: string; kind: string; productName: string | null; faceAmount: string | null; premium: string | null }[];
  applications: Application[];
  policies: { id: string; policyNumber: string; carrier: string; product: string; status: string }[];
  timeline: { id: string; title: string; body: string | null; createdAt: string }[];
};

const PRODUCT_LABEL: Record<string, string> = { TERM: "Term", IUL: "IUL", UNDECIDED: "A definir" };
const OBJECTIVE_LABEL: Record<string, string> = {
  PROTECTION: "Proteção",
  ACCUMULATION: "Acumulação",
  RETIREMENT: "Aposentadoria",
  LEGACY: "Legado",
};
const REQ_LABEL: Record<string, string> = { OPEN: "Pendente", RECEIVED: "Recebido", WAIVED: "Dispensado" };

function ageFrom(iso: string | null): number | null {
  if (!iso) return null;
  const dob = new Date(iso);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-border-steel bg-paper p-5">
      <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-ink-muted">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-ink-muted">{children}</p>;
}

export function CaseWorkspace({ caseData: c }: { caseData: CaseData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const forward = c.nextStages.filter((s) => s !== "WITHDRAWN");
  const primary = forward[0] ?? null;
  const age = ageFrom(c.prospect.dateOfBirth);

  function move(stage: CaseStage) {
    setMessage(null);
    startTransition(async () => {
      const result = await transitionCase(c.id, stage);
      if (result.ok) router.refresh();
      else setMessage(result.message);
    });
  }

  function setRequirement(id: string, status: "RECEIVED" | "WAIVED" | "OPEN") {
    startTransition(async () => {
      const result = await updateRequirement(id, status);
      if (result.ok) router.refresh();
      else setMessage(result.message);
    });
  }

  return (
    <div className="space-y-6">
      <Link href="/agent/cases" className="text-sm font-semibold text-teal hover:text-teal-deep">
        ← Voltar aos casos
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-ink">{c.prospect.name}</h1>
            <CaseStagePill stage={c.stage} />
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            {OBJECTIVE_LABEL[c.objective ?? ""] ?? "—"} · {PRODUCT_LABEL[c.productType ?? ""] ?? c.productType ?? "—"} · {c.carrier ?? "—"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {primary && (
            <Button variant="primary" disabled={pending} onClick={() => move(primary)}>
              Avançar para {caseStageLabel[primary]}
            </Button>
          )}
          {c.nextStages
            .filter((s) => s !== primary)
            .map((s) => (
              <Button key={s} variant="secondary" disabled={pending} onClick={() => move(s)}>
                {caseStageLabel[s]}
              </Button>
            ))}
          {c.nextStages.length === 0 && <span className="text-sm text-ink-muted">Caso encerrado.</span>}
        </div>
      </div>
      {message && <p role="alert" className="text-sm text-danger">{message}</p>}

      <Section title="Resumo">
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          <div><dt className="text-xs text-ink-muted">Agente</dt><dd className="text-sm text-ink">{c.agentName}</dd></div>
          <div><dt className="text-xs text-ink-muted">Estado</dt><dd className="text-sm text-ink">{c.prospect.state ?? "—"}</dd></div>
          <div><dt className="text-xs text-ink-muted">Idade</dt><dd className="text-sm text-ink">{age ?? "—"}</dd></div>
          <div><dt className="text-xs text-ink-muted">Tabaco</dt><dd className="text-sm text-ink">{c.prospect.tobaccoStatus ?? "—"}</dd></div>
          <div><dt className="text-xs text-ink-muted">E-mail</dt><dd className="text-sm text-ink">{c.prospect.email ?? "—"}</dd></div>
          <div><dt className="text-xs text-ink-muted">Telefone</dt><dd className="text-sm text-ink">{c.prospect.phone ?? "—"}</dd></div>
          <div><dt className="text-xs text-ink-muted">Cobertura alvo</dt><dd className="text-sm text-ink">{c.targetCoverage ? `$${c.targetCoverage}` : "—"}</dd></div>
          <div><dt className="text-xs text-ink-muted">Orçamento mensal</dt><dd className="text-sm text-ink">{c.monthlyBudget ? `$${c.monthlyBudget}/m` : "—"}</dd></div>
        </dl>
      </Section>

      <Section title="Ilustrações">
        {c.illustrations.length === 0 ? (
          <Empty>Nenhuma ilustração ainda. Ilustrações formais chegam da seguradora ou por importação — nenhum valor é inventado aqui.</Empty>
        ) : (
          <ul className="divide-y divide-border-steel">
            {c.illustrations.map((il) => (
              <li key={il.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink">{il.productName ?? "Ilustração"} · {il.kind === "PRELIMINARY" ? "Estimativa" : "Oficial"}</span>
                <span className="font-mono text-ink-muted">{il.faceAmount ? `$${il.faceAmount}` : "—"} · {il.premium ? `$${il.premium}/m` : "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Aplicação">
        {c.applications.length === 0 ? (
          <Empty>Nenhuma aplicação iniciada. A aplicação aparece ao avançar o caso para a etapa de aplicação.</Empty>
        ) : (
          <ul className="space-y-2">
            {c.applications.map((app) => (
              <li key={app.id} className="text-sm text-ink">Aplicação · {app.status}</li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Requirements">
        {c.applications.flatMap((a) => a.requirements).length === 0 ? (
          <Empty>Nenhum requirement. Eles aparecem quando a seguradora solicita documentos na análise.</Empty>
        ) : (
          <ul className="divide-y divide-border-steel">
            {c.applications.flatMap((app) =>
              app.requirements.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-sm text-ink">{r.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-ink-muted">{REQ_LABEL[r.status] ?? r.status}</span>
                    {r.status === "OPEN" && (
                      <>
                        <Button variant="secondary" disabled={pending} onClick={() => setRequirement(r.id, "RECEIVED")}>Recebido</Button>
                        <Button variant="secondary" disabled={pending} onClick={() => setRequirement(r.id, "WAIVED")}>Dispensar</Button>
                      </>
                    )}
                  </div>
                </li>
              )),
            )}
          </ul>
        )}
      </Section>

      <Section title="Policy">
        {c.policies.length === 0 ? (
          <Empty>Nenhuma apólice vinculada. A apólice surge após a emissão do caso ou importação de histórico autorizada.</Empty>
        ) : (
          <ul className="divide-y divide-border-steel">
            {c.policies.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <Link href={`/agent/policies/${p.id}`} className="text-sm font-medium text-teal hover:text-teal-deep">
                  <span className="font-mono">{p.policyNumber}</span> · {p.carrier} · {p.product}
                </Link>
                <PolicyStatusPill status={p.status} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Timeline">
        {c.timeline.length === 0 ? (
          <Empty>Sem eventos ainda.</Empty>
        ) : (
          <ol className="space-y-3">
            {c.timeline.map((t) => (
              <li key={t.id} className="border-l-2 border-border-steel pl-3">
                <p className="text-sm font-medium text-ink">{t.title}</p>
                {t.body && <p className="text-xs text-ink-muted">{t.body}</p>}
                <p className="text-xs text-ink-muted">{new Date(t.createdAt).toLocaleString("pt-BR")}</p>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}
