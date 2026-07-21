type Tone = "success" | "warning" | "danger" | "neutral";

const toneClasses: Record<Tone, string> = {
  success: "bg-success-pale text-success",
  warning: "bg-gold-pale text-gold",
  danger: "bg-danger-pale text-danger",
  neutral: "bg-panel text-ink-muted",
};

const policyStatusTone: Record<string, Tone> = {
  INFORCE: "success",
  APPROVED: "success",
  PENDING: "warning",
  LAPSED: "danger",
  CANCELLED: "danger",
};

const policyStatusLabel: Record<string, string> = {
  INFORCE: "Em vigor",
  APPROVED: "Aprovada",
  PENDING: "Pendente",
  LAPSED: "Lapsada",
  CANCELLED: "Cancelada",
};

const importStatusTone: Record<string, Tone> = {
  COMPLETED: "success",
  COMPLETED_WITH_ERRORS: "warning",
  FAILED: "danger",
  PROCESSING: "neutral",
};

const importStatusLabel: Record<string, string> = {
  COMPLETED: "Concluído",
  COMPLETED_WITH_ERRORS: "Concluído com erros",
  FAILED: "Falhou",
  PROCESSING: "Processando",
};

function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

export function PolicyStatusPill({ status }: { status: string }) {
  return (
    <Pill tone={policyStatusTone[status] ?? "neutral"}>
      {policyStatusLabel[status] ?? status}
    </Pill>
  );
}

export function ImportStatusPill({ status }: { status: string }) {
  return (
    <Pill tone={importStatusTone[status] ?? "neutral"}>
      {importStatusLabel[status] ?? status}
    </Pill>
  );
}

export function RolePill({ role }: { role: string }) {
  const label =
    role === "ADMIN" ? "Admin" : role === "AGENT" ? "Agente" : "Cliente";
  return <Pill tone="neutral">{label}</Pill>;
}
