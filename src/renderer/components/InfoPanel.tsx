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
    return <div className="meta-panel empty">Open or create a StoryMode document to view metadata.</div>;
  }

  const narrativeCount = countNodes(world, "narrative");
  const sceneCount = countNodes(world, "scene");

  return (
    <div className="meta-panel">
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

      <section className="meta-section">
        <header>Directives</header>
        {meta.length === 0 ? (
          <div className="meta-empty">No @ directives found near the top of this document.</div>
        ) : (
          <dl className="meta-list">
            {meta.map((item) => (
              <div key={item.key}>
                <dt>{item.key.toUpperCase()}</dt>
                <dd>{item.value || "-"}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
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

