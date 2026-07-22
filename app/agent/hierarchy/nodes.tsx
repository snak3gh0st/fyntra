"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Avatar } from "@/components/Avatar";
import { NODE_WIDTH } from "@/lib/hierarchy-layout";

export type ViewNodeData = {
  name: string;
  rank: string;
  level: number | null;
  isYou: boolean;
};

export type ViewFlowNode = Node<ViewNodeData, "view">;

export function ViewNode({ data }: NodeProps<ViewFlowNode>) {
  return (
    <div style={{ width: NODE_WIDTH }}>
      <Handle type="target" position={Position.Top} className="!h-0 !w-0 !border-0 !opacity-0" isConnectable={false} />
      <div
        className={`flex cursor-grab items-center gap-3 rounded-lg border bg-paper px-4 py-3 shadow-[var(--shadow-overlay)] transition-[border-color] duration-150 active:cursor-grabbing ${
          data.isYou ? "border-teal ring-2 ring-teal-pale" : "border-border-steel hover:border-teal"
        }`}
      >
        <Avatar name={data.name} rank={data.rank} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink">
            {data.name} {data.isYou && <span className="font-mono text-xs font-semibold text-teal">· você</span>}
          </p>
          <p className="truncate text-xs text-ink-muted">{data.level !== null ? `Nível ${data.level}` : data.rank}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-0 !w-0 !border-0 !opacity-0" isConnectable={false} />
    </div>
  );
}
