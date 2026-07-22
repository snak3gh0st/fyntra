"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { Field, Input, Select } from "@/components/Field";
import { createPolicy } from "./new/actions";

const STATUS_OPTIONS = [
  { value: "PENDING", label: "PENDENTE" },
  { value: "APPROVED", label: "APROVADA" },
  { value: "INFORCE", label: "EM VIGOR" },
  { value: "LAPSED", label: "LAPSADA" },
  { value: "CANCELLED", label: "CANCELADA" },
];

type ClientOption = { id: string; name: string; email: string | null };

type Message = { ok: boolean; text: string };

export function NewPolicyForm({ clients }: { clients: ClientOption[] }) {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [createdPolicyId, setCreatedPolicyId] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    setMessage(null);
    setCreatedPolicyId(null);

    const result = await createPolicy(formData);
    if (result.ok) {
      setMessage({ ok: true, text: `Apólice ${result.policyNumber} criada com sucesso.` });
      setCreatedPolicyId(result.policyId);
    } else {
      setMessage({ ok: false, text: result.message });
    }

    setSubmitting(false);
  }

  return (
    <div className="rounded-md border border-border-steel bg-paper p-5">
      <h2 className="text-base font-semibold text-ink">Preencha os dados da apólice</h2>
      <form action={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Cliente">
          <Select name="clientId" required className="w-full">
            <option value="new">Novo cliente</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
                {client.email ? ` (${client.email})` : ""}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Número da apólice">
          <Input name="policyNumber" required placeholder="Ex: APL-2026-001" />
        </Field>

        <Field label="Cliente (nome)">
          <Input name="clientName" placeholder="Obrigatório apenas se cliente for novo" />
        </Field>

        <Field label="Email do cliente">
          <Input name="clientEmail" type="email" placeholder="opcional" />
        </Field>

        <Field label="Seguradora">
          <Input name="carrier" required placeholder="Ex: Porto" />
        </Field>

        <Field label="Produto">
          <Input name="product" required placeholder="Ex: Vida" />
        </Field>

        <Field label="Valor segurado">
          <Input name="faceAmount" type="number" step="0.01" min={0} required placeholder="10000.00" />
        </Field>

        <Field label="Prêmio mensal">
          <Input name="premium" type="number" step="0.01" min={0} required placeholder="250.00" />
        </Field>

        <Field label="Status">
          <Select name="status" required className="w-full">
            {STATUS_OPTIONS.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Início de vigência">
          <Input name="effectiveDate" type="date" />
        </Field>

        <Field label="Último pagamento">
          <Input name="lastPaymentDate" type="date" />
        </Field>

        <div className="sm:col-span-2">
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Criando apólice..." : "Criar apólice"}
          </Button>
          {message && (
            <p role="alert" className={`mt-3 text-sm ${message.ok ? "text-success" : "text-danger"}`}>
              {message.text}
            </p>
          )}
          {createdPolicyId && message?.ok && (
            <Link href={`/agent/policies/${createdPolicyId}`} className="mt-3 inline-flex text-sm text-teal hover:text-teal-deep">
              Abrir esta apólice
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
