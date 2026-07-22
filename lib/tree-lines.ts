// Turns a pre-order (DFS) list of { depth } nodes into per-row rail guides
// for drawing file-tree-style connector lines: for each row, which ancestor
// columns (0..depth-1) still have a sibling coming later (so the vertical
// line continues past this row), plus whether the row itself has a next
// sibling (so its own elbow's line continues down to it).
// ponytail: O(n^2) lookahead: fine for hierarchy sizes in the hundreds, revisit if it ever needs thousands.
export function computeTreeGuides<T extends { depth: number }>(
  nodes: T[],
): { ancestorGuides: boolean[]; hasNextSibling: boolean }[] {
  return nodes.map((node, i) => {
    let hasNextSibling = false;
    for (let j = i + 1; j < nodes.length; j++) {
      if (nodes[j].depth < node.depth) break;
      if (nodes[j].depth === node.depth) {
        hasNextSibling = true;
        break;
      }
    }
    const ancestorGuides: boolean[] = [];
    for (let level = 0; level < node.depth; level++) {
      let continues = false;
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[j].depth < level) break;
        if (nodes[j].depth === level) {
          continues = true;
          break;
        }
      }
      ancestorGuides.push(continues);
    }
    return { ancestorGuides, hasNextSibling };
  });
}
