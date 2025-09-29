import React, { useMemo } from "react";
import { useStore, selectFile } from "../store/store.js";
import { parseWorldStructure, type WorldNode } from "../utils/world.js";

interface MetaItem {
  key: string;
  value: string;
}

export const InfoPanel: React.FC = () => {
  const file = useStore(selectFile);
  const content = file.content || "";

  const meta = useMemo(() => extractMeta(content), [content]);
  const world = useMemo(() => parseWorldStructure(content), [content]);

  if (!content) {
    return (
      <div className="meta-panel empty">
        <h3>Start writing</h3>
        <p>Open a story to view metadata.</p>
      </div>
    );
  }

  const narrativeCount = countNodes(world, "narrative");
  const sceneCount = countNodes(world, "scene");
  const hasMetadata = meta.length > 0;
  const hasWorldOutline = world.length > 0;

  return (
    <div className="meta-panel">
      <section className="meta-section">
        <header>Document metadata</header>
        {hasMetadata ? (
          <dl className="meta-list">
            {meta.map((item: MetaItem) => (
              <div key={item.key}>
                <dt>{item.key.toUpperCase()}</dt>
                <dd>{item.value || "-"}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="meta-empty">No @ directives found near the top of this document.</div>
        )}
      </section>

      {hasWorldOutline && (
        <section className="meta-section">
          <header>World outline</header>
          <div className="meta-summary" role="list">
            <div className="meta-summary-item" role="listitem">
              <span className="meta-summary-label">Stories</span>
              <span className="meta-summary-value">{world.length}</span>
            </div>
            <div className="meta-summary-item" role="listitem">
              <span className="meta-summary-label">Narratives</span>
              <span className="meta-summary-value">{narrativeCount}</span>
            </div>
            <div className="meta-summary-item" role="listitem">
              <span className="meta-summary-label">Scenes</span>
              <span className="meta-summary-value">{sceneCount}</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

function extractMeta(text: string): MetaItem[] {
  const lines = text.split(/\r?\n/);
  const out: MetaItem[] = [];
  for (let i = 0; i < Math.min(lines.length, 200); i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const match = /^@([a-zA-Z0-9_]+):\s*(.*)$/.exec(line);
    if (match) {
      out.push({ key: match[1], value: match[2].trim() });
      continue;
    }
    if (out.length > 0 && !line.startsWith("@")) break;
  }
  return out;
}

function countNodes(tree: WorldNode[], type: WorldNode["type"]): number {
  let total = 0;
  const stack = [...tree];
  while (stack.length) {
    const node = stack.pop()!;
    if (node.type === type) total += 1;
    stack.push(...node.children);
  }
  return total;
}





