"use client";

import { useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/Table";
import { EntityCard, EntityCardList } from "@/components/EntityCard";
import { Pagination, clampPage } from "@/components/Pagination";

type Record_ = {
  id: string;
  policyNumber: string | null;
  policyId: string | null;
  agentName: string;
  typeLabel: string;
  level: number;
  amount: string;
};

type PeriodGroup = { period: string; rows: Record_[]; subtotal: string };

const PERIODS_PER_PAGE = 4;

export function CommissionsList({ byPeriod }: { byPeriod: PeriodGroup[] }) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(byPeriod.length / PERIODS_PER_PAGE));
  const currentPage = clampPage(page, pageCount);
  const pagePeriods = byPeriod.slice((currentPage - 1) * PERIODS_PER_PAGE, currentPage * PERIODS_PER_PAGE);

  if (byPeriod.length === 0) {
    return <EmptyState>Nenhuma comissão registrada ainda.</EmptyState>;
  }

  return (
    <div>
      {pagePeriods.map(({ period, rows, subtotal }) => (
        <div key={period} className="mb-6">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-mono text-sm font-semibold text-ink-muted">{period}</h2>
            <span className="font-mono text-xs text-ink-muted">
              Subtotal <span className="font-semibold text-ink">${subtotal}</span>
            </span>
          </div>
          <EntityCardList>
            {rows.map((record, i) => (
              <EntityCard key={record.id} index={i}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {record.policyId ? (
                      <Link href={`/agent/policies/${record.policyId}`} className="font-mono hover:text-teal">
                        {record.policyNumber}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </p>
                  <p className="truncate text-xs text-ink-muted">
                    {record.agentName} · {record.typeLabel} · Nível {record.level}
                  </p>
                </div>
                <span className="shrink-0 font-mono font-medium tabular-nums text-ink">${record.amount}</span>
              </EntityCard>
            ))}
          </EntityCardList>
        </div>
      ))}
      <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}
