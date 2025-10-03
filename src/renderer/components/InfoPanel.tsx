import React, { useMemo } from "react";
import { t } from '../i18n.js';
import { useStore, selectFile } from "../store/store.js";
import { parseStoryStructure, type StoryStructureNode } from "../utils/world.js";

interface MetaItem {
  key: string;
  value: string;
}

export const InfoPanel: React.FC = () => {
  const file = useStore(selectFile);
  const content = file.content || "";

  const meta = useMemo(() => extractMeta(content), [content]);
  const world = useMemo(() => parseStoryStructure(content), [content]);

  if (!content) {
    return (
      <div className="meta-panel empty">
        <h3>{t('meta.empty.title')}</h3>
        <p>{t('meta.empty.body')}</p>
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
  <header>{t('meta.section.doc')}</header>
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
          <div className="meta-empty">{t('meta.noneFound')}</div>
        )}
      </section>

      {hasWorldOutline && (
        <section className="meta-section">
          <header>{t('meta.section.world')}</header>
          <div className="meta-summary" role="list">
            <div className="meta-summary-item" role="listitem">
              <span className="meta-summary-label">{t('count.stories')}</span>
              <span className="meta-summary-value">{world.length}</span>
            </div>
            <div className="meta-summary-item" role="listitem">
              <span className="meta-summary-label">{t('count.narratives')}</span>
              <span className="meta-summary-value">{narrativeCount}</span>
            </div>
            <div className="meta-summary-item" role="listitem">
              <span className="meta-summary-label">{t('count.scenes')}</span>
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

function countNodes(tree: StoryStructureNode[], type: StoryStructureNode["type"]): number {
  let total = 0;
  const stack = [...tree];
  while (stack.length) {
    const node = stack.pop()!;
    if (node.type === type) total += 1;
    stack.push(...node.children);
  }
  return total;
}





