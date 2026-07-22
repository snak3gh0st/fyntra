"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { Field, Input, Select } from "@/components/Field";
import { createPolicy } from "./new/actions";
import {
  type MarketAgeBand,
  calculateMarketPremium,
  getAvailableAgeBands,
  getAvailableFaceBands,
  getAvailableQuoteProducts,
  parseFaceBand,
} from "@/lib/policy-quote";

type ClientOption = { id: string; name: string; email: string | null };

type Message = { ok: boolean; text: string };

const STATUS_OPTIONS = [
  { value: "PENDING", label: "PENDENTE" },
  { value: "APPROVED", label: "APROVADA" },
  { value: "INFORCE", label: "EM VIGOR" },
  { value: "LAPSED", label: "LAPSADA" },
  { value: "CANCELLED", label: "CANCELADA" },
];

export function NewPolicyForm({ clients }: { clients: ClientOption[] }) {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [createdPolicyId, setCreatedPolicyId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [pricingMode, setPricingMode] = useState<"market" | "manual">("market");
  const [productPreview, setProductPreview] = useState("Term 20");
  const [faceAmountPreview, setFaceAmountPreview] = useState("");
  const [quoteAgeBand, setQuoteAgeBand] = useState<MarketAgeBand>("AGE_31_45");

  const marketProducts = getAvailableQuoteProducts();
  const ageBands = getAvailableAgeBands();
  const faceBands = getAvailableFaceBands();

  const filteredClients = useMemo(() => {
    const query = clientSearch.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter((client) => {
      const inName = client.name.toLowerCase().includes(query);
      const inEmail = (client.email ?? "").toLowerCase().includes(query);
      return inName || inEmail;
    });
  }, [clients, clientSearch]);

  const parsedFaceAmount = useMemo(() => {
    const parsed = Number(faceAmountPreview.replace(",", "."));
    return Number.isNaN(parsed) ? null : parsed;
  }, [faceAmountPreview]);

  const quoteFaceBand = useMemo(() => {
    if (parsedFaceAmount === null) return "FACE_UP_TO_100K";
    return parseFaceBand(null, parsedFaceAmount);
  }, [parsedFaceAmount]);

  const selectedProduct = (productPreview || "Term 20").trim() || "Term 20";

  const selectedQuote = useMemo(() => {
    if (parsedFaceAmount === null || parsedFaceAmount <= 0) return null;

    return calculateMarketPremium({
      product: selectedProduct,
      faceAmount: parsedFaceAmount,
      ageBand: quoteAgeBand,
      faceBand: quoteFaceBand,
    });
  }, [parsedFaceAmount, quoteAgeBand, quoteFaceBand, selectedProduct]);

  const productPossibilities = useMemo(() => {
    if (parsedFaceAmount === null || parsedFaceAmount <= 0) return [];

    return marketProducts
      .filter((option) => option.code !== "OTHER")
      .map((option) => ({
        ...option,
        quote: calculateMarketPremium({
          product: option.suggestedInput,
          faceAmount: parsedFaceAmount,
          ageBand: quoteAgeBand,
          faceBand: quoteFaceBand,
        }),
      }));
  }, [marketProducts, parsedFaceAmount, quoteAgeBand, quoteFaceBand]);

  const faceBandPossibilities = useMemo(() => {
    if (parsedFaceAmount === null || parsedFaceAmount <= 0) return [];

    return faceBands.map((faceBand) => ({
      ...faceBand,
      quote: calculateMarketPremium({
        product: selectedProduct,
        faceAmount: parsedFaceAmount,
        ageBand: quoteAgeBand,
        faceBand: faceBand.code,
      }),
    }));
  }, [faceBands, parsedFaceAmount, quoteAgeBand, selectedProduct]);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    setMessage(null);
    setCreatedPolicyId(null);

    const result = await createPolicy(formData);
    if (result.ok) {
      const sourceText = result.premiumSource === "market" ? "Cotação de mercado" : "Prêmio manual";
      setMessage({
        ok: true,
        text: `Apólice ${result.policyNumber} criada com sucesso. ${sourceText}: $${result.premium.toFixed(2)}.`,
      });
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
          <Input
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            placeholder="Digite nome ou email para filtrar..."
          />
        </Field>

        <Field label="Cliente da carteira">
          <Select name="clientId" required className="w-full">
            <option value="new">Novo cliente</option>
            {filteredClients.length === 0 && <option disabled>Nenhum cliente encontrado</option>}
            {filteredClients.map((client) => (
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
          <Input
            name="product"
            required
            value={productPreview}
            onChange={(e) => setProductPreview(e.target.value)}
            list="product-suggestions"
            placeholder="Ex: Term 20"
          />
          <datalist id="product-suggestions">
            {marketProducts.map((option) => (
              <option key={option.code} value={option.suggestedInput} />
            ))}
          </datalist>
        </Field>

        <Field label="Valor segurado">
          <Input
            name="faceAmount"
            type="number"
            step="0.01"
            min={0}
            required
            value={faceAmountPreview}
            onChange={(e) => setFaceAmountPreview(e.target.value)}
            placeholder="10000.00"
          />
        </Field>

        <Field label="Forma de cálculo do prêmio">
          <Select
            name="pricingMode"
            value={pricingMode}
            onChange={(e) => setPricingMode(e.target.value as "market" | "manual")}
            className="w-full"
          >
            <option value="market">Usar cotação de mercado (sugestão inicial)</option>
            <option value="manual">Informar prêmio manual</option>
          </Select>
        </Field>

        {pricingMode === "market" && (
          <>
            <Field label="Faixa etária para cotação">
              <Select
                name="quoteAgeBand"
                value={quoteAgeBand}
                onChange={(e) => setQuoteAgeBand(e.target.value as MarketAgeBand)}
                className="w-full"
              >
                {ageBands.map((ageBand) => (
                  <option key={ageBand.code} value={ageBand.code}>
                    {ageBand.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Resumo de cotação de mercado">
              {!faceAmountPreview || parsedFaceAmount === null || parsedFaceAmount <= 0 ? (
                <p className="text-xs text-ink-muted">
                  Preencha produto e valor segurado para calcular as possibilidades.
                </p>
              ) : (
                <div className="grid gap-2 text-xs text-ink-muted">
                  <p>
                    Produto atual: <strong className="font-semibold text-ink">{selectedProduct}</strong>
                  </p>
                  <p>
                    Faixa etária: <strong className="font-semibold text-ink">{ageBands.find((band) => band.code === quoteAgeBand)?.label}</strong>
                  </p>
                  <p>
                    Faixa de cobertura aplicada: <strong className="font-semibold text-ink">{faceBands.find((band) => band.code === quoteFaceBand)?.label}</strong>
                  </p>
                  <p className="text-ink">
                    Prévia de mercado: <strong>${selectedQuote?.premium.toFixed(2)} /m</strong>
                  </p>

                  <div className="mt-2 border-t border-white/10 pt-2">
                    <p className="mb-1 font-semibold text-ink">Faixas de cobertura (alternativas)</p>
                    <ul className="grid gap-1">
                      {faceBandPossibilities.map((option) => (
                        <li key={option.code} className="flex items-center justify-between">
                          <span>{option.label}</span>
                          <span className="tabular-nums">${option.quote.premium.toFixed(2)} /m</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-2 border-t border-white/10 pt-2">
                    <p className="mb-1 font-semibold text-ink">Faixas por produto</p>
                    <ul className="grid gap-1">
                      {productPossibilities.map((option) => (
                        <li key={option.code} className="flex items-center justify-between">
                          <span>{option.label}</span>
                          <span className="tabular-nums">${option.quote.premium.toFixed(2)} /m</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </Field>

            <input type="hidden" name="quoteFaceBand" value={quoteFaceBand} />
          </>
        )}

        <Field label="Prêmio mensal">
          <Input
            name="premium"
            type="number"
            step="0.01"
            min={0}
            required={pricingMode === "manual"}
            disabled={pricingMode === "market"}
            placeholder={pricingMode === "market" ? "Calculado automaticamente" : "250.00"}
          />
          {pricingMode === "market" && (
            <p className="text-xs text-ink-muted">
              O prêmio será calculado no servidor na mesma lógica usada nesta prévia.
            </p>
          )}
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
