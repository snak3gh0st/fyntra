"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { Field, Input, Select } from "@/components/Field";
import { createIllustrationRequest } from "./new/actions";

type RequestPayload = {
  firstName: string
  lastName: string
  dateOfBirth: string
  age: number
  tobaccoStatus: "YES" | "NO" | "FORMER"
}

type Message =
  | {
      ok: true
      text: string
      requestUrl: string | null
      requestQuery: string
      requestPayload: RequestPayload
      submitted: boolean
      executionMessage: string
      executionStatusCode: number | null
      partnerResponseSnippet?: string
    }
  | {
      ok: false
      text: string
    }

export function NewIllustrationForm() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    setMessage(null);

    const result = await createIllustrationRequest(formData);
    if (result.ok) {
      const text = result.submitted
        ? "Solicitação enviada com sucesso para o endpoint de ilustração."
        : "Prévia de solicitação pronta. Abra o link abaixo para enviar ao parceiro."
      setMessage({
        ok: true,
        text,
        requestUrl: result.requestUrl,
        requestQuery: result.requestQuery,
        requestPayload: result.requestPayload,
        submitted: result.submitted,
        executionMessage: result.executionMessage,
        executionStatusCode: result.executionStatusCode,
        partnerResponseSnippet: result.partnerResponseSnippet,
      });
    } else {
      setMessage({ ok: false, text: result.message });
    }

    setSubmitting(false);
  }

  return (
    <div className="rounded-md border border-border-steel bg-paper p-5">
      <h2 className="text-base font-semibold text-ink">Informações para ilustração</h2>
      <form action={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Nome">
          <Input name="firstName" required placeholder="Maria" />
        </Field>
        <Field label="Sobrenome">
          <Input name="lastName" required placeholder="Silva" />
        </Field>
        <Field label="Data de nascimento (DOB)">
          <Input name="dateOfBirth" type="date" required />
        </Field>
        <Field label="Idade">
          <Input name="age" type="number" min={0} max={120} required placeholder="38" />
        </Field>
        <Field label="Informação tabagista">
          <Select name="tobaccoStatus" required className="w-full">
            <option value="">Selecione...</option>
            <option value="NO">Não fumante</option>
            <option value="YES">Fumante</option>
            <option value="FORMER">Ex-fumante</option>
          </Select>
        </Field>

        <div className="sm:col-span-2">
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Gerando solicitação..." : "Criar solicitação de ilustração"}
          </Button>
        </div>
      </form>

      {message && (
        <div className="mt-4 space-y-2">
          <p role="alert" className={`text-sm ${message.ok ? "text-success" : "text-danger"}`}>
            {message.text}
          </p>
          {message.ok && (
            <>
              <p className="text-sm text-ink-muted">{message.executionMessage}</p>
              {message.requestUrl ? (
                <a
                  href={message.requestUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-10 items-center rounded-md border border-border-steel bg-paper px-4 py-2.5 text-sm font-semibold text-ink transition-[background-color,border-color,color,transform] duration-150 hover:border-teal hover:bg-teal-pale/40 focus-visible:ring-[3px] focus-visible:ring-teal-pale focus-visible:outline-none"
                >
                  Abrir resposta do parceiro
                </a>
              ) : (
                <>
                  <p className="text-sm text-ink-muted">
                    ILLUSTRATION_REQUEST_URL não está definida no ambiente.
                  </p>
                  <p className="text-xs text-ink-muted">Use estes dados para disparar a solicitação no parceiro:</p>
                  <pre className="overflow-x-auto rounded-md border border-border-steel bg-panel p-3 text-xs">
                    {JSON.stringify(message.requestPayload, null, 2)}
                  </pre>
                  <p className="text-xs text-ink-muted">Query string:</p>
                  <pre className="overflow-x-auto rounded-md border border-border-steel bg-panel p-3 text-xs">
                    {message.requestQuery}
                  </pre>
                </>
              )}
              {message.partnerResponseSnippet ? (
                <details>
                  <summary className="cursor-pointer text-xs font-semibold text-ink-muted">Resposta do parceiro</summary>
                  <pre className="mt-2 overflow-x-auto rounded-md border border-border-steel bg-panel p-3 text-xs">
                    {message.partnerResponseSnippet}
                  </pre>
                </details>
              ) : null}
              {message.executionStatusCode ? (
                <p className="text-xs text-ink-muted">Status HTTP: {message.executionStatusCode}</p>
              ) : null}
              {message.submitted ? null : (
                <p className="text-xs text-ink-muted">Sem envio automático configurado no momento.</p>
              )}
            </>
          )}
          <p>
            <Link href="/agent/policies" className="text-sm text-ink-muted hover:text-ink">
              Voltar para apólices
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
