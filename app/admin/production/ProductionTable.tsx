"use client";

import { useMemo, useState } from "react";
import { Table, Thead, Th, ThSort, Tr, Td, TdNum } from "@/components/Table";
import { Pagination, clampPage } from "@/components/Pagination";

type Row = { agentId: string; agentName: string; policyCount: number; premiumTotal: number; commissionTotal: number };
type SortKey = "policyCount" | "premiumTotal" | "commissionTotal";

const RANK_TONE = ["bg-gold text-paper", "bg-ink-muted/25 text-ink", "bg-ink-muted/15 text-ink-muted"];
const PAGE_SIZE = 15;

export function ProductionTable({ rows }: { rows: Row[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("commissionTotal");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  // Resetting to page 1 on a new sort belongs here, not in an effect: it's
  // state adjustment during render (React's documented pattern), not a
  // side effect — it avoids an extra render pass with the stale page still
  // showing wrong rows for the new sort order.
  const [prevSort, setPrevSort] = useState({ sortKey, direction });
  if (prevSort.sortKey !== sortKey || prevSort.direction !== direction) {
    setPrevSort({ sortKey, direction });
    setPage(1);
  }

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => (direction === "desc" ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]));
    return copy;
  }, [rows, sortKey, direction]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = clampPage(page, pageCount);
  const pageRows = sorted
    .map((row, rank) => ({ row, rank }))
    .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setDirection((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setDirection("desc");
    }
  }

  return (
    <>
    <Table>
      <Thead>
        <tr>
          <Th>#</Th>
          <Th>Agente</Th>
          <ThSort numeric active={sortKey === "policyCount"} direction={direction} onClick={() => toggleSort("policyCount")}>
            Apólices
          </ThSort>
          <ThSort numeric active={sortKey === "premiumTotal"} direction={direction} onClick={() => toggleSort("premiumTotal")}>
            Prêmio total
          </ThSort>
          <ThSort numeric active={sortKey === "commissionTotal"} direction={direction} onClick={() => toggleSort("commissionTotal")}>
            Comissão total
          </ThSort>
        </tr>
      </Thead>
      <tbody>
        {pageRows.map(({ row, rank }, i) => (
          <Tr key={row.agentId} index={i}>
            <Td>
              <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs font-semibold ${RANK_TONE[rank] ?? "text-ink-muted"}`}>
                {rank + 1}
              </span>
            </Td>
            <Td className="font-medium">{row.agentName}</Td>
            <TdNum>{row.policyCount}</TdNum>
            <TdNum>${row.premiumTotal.toFixed(2)}</TdNum>
            <TdNum>${row.commissionTotal.toFixed(2)}</TdNum>
          </Tr>
        ))}
      </tbody>
    </Table>
    <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
    </>
  );
}
