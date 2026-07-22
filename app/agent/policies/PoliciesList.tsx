"use client";

import { useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/Table";
import { EntityCard, EntityCardList } from "@/components/EntityCard";
import { PolicyStatusPill } from "@/components/StatusPill";
import { Pagination, clampPage } from "@/components/Pagination";

type Policy = {
  id: string;
  policyNumber: string;
  carrier: string;
  product: string;
  premium: string;
  status: string;
  clientName: string;
};

const PAGE_SIZE = 12;

export function PoliciesList({ policies }: { policies: Policy[] }) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(policies.length / PAGE_SIZE));
  const currentPage = clampPage(page, pageCount);
  const pagePolicies = policies.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (policies.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState>Nenhuma apólice ainda.</EmptyState>
        <div className="space-y-3">
          <Link
            href="/agent/policies/new"
            className="inline-flex w-full justify-center rounded-md border border-teal px-4 py-2.5 text-sm font-semibold text-teal transition-[background-color,border-color,color,transform] duration-150 hover:border-teal-deep hover:bg-teal-pale"
          >
            Criar primeira apólice
          </Link>
          <Link
            href="/agent/illustrations/new"
            className="inline-flex w-full justify-center rounded-md border border-teal px-4 py-2.5 text-sm font-semibold text-teal transition-[background-color,border-color,color,transform] duration-150 hover:border-teal-deep hover:bg-teal-pale"
          >
            Criar primeira ilustração
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <EntityCardList>
        {pagePolicies.map((policy, i) => (
          <EntityCard key={policy.id} index={i} href={`/agent/policies/${policy.id}`}>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink">{policy.clientName}</p>
              <p className="truncate text-xs text-ink-muted">
                <span className="font-mono">{policy.policyNumber}</span> · {policy.carrier} · {policy.product}
              </p>
            </div>
            <span className="shrink-0 font-mono font-medium tabular-nums text-ink">${policy.premium}</span>
            <PolicyStatusPill status={policy.status} />
          </EntityCard>
        ))}
      </EntityCardList>
      <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}
