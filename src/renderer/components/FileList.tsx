import React, { useMemo } from "react";
import { useStore, selectFile, selectParse } from "../store/store.js";
import { parseWorldStructure, type WorldNode } from "../utils/world.js";

export const FileList: React.FC = () => {
  const file = useStore(selectFile);
  const parse = useStore(selectParse);

  const world = useMemo(
    () => parseWorldStructure(file.content || ""),
    [file.content],
  );

  const filePath = file.path ?? "Unsaved document";
  const fileKind = parse.fileKind ?? file.fileType ?? "unknown";

  const handleJump = (line: number) => {
    window.dispatchEvent(
      new CustomEvent("reveal-position", {
        detail: { line: line + 1, column: 1 },
      }),
    );
    useStore.getState().recordJump(`world-${line}`);
  };

  return (
    <div className="world-panel">
      <header className="world-header">
        <div className="world-file">{filePath}</div>
        <span className="world-kind">{fileKind.toUpperCase()}</span>
      </header>
      <div className="world-tree" role="tree">
        {world.length === 0 ? (
          <div className="world-empty">Add ::story, ::narrative, and ::scene directives to populate the world.</div>
        ) : (
          world.map((node) => (
            <WorldNodeRow key={`${node.type}-${node.id}`} node={node} depth={0} onJump={handleJump} />
          ))
        )}
      </div>
    </div>
  );
};

const WorldNodeRow: React.FC<{ node: WorldNode; depth: number; onJump: (line: number) => void }> = ({
  node,
  depth,
  onJump,
}) => {
  const label = node.title ? `${node.id} - ${node.title}` : node.id;
  return (
    <div className={`world-node ${node.type}`} style={{ paddingLeft: depth * 14 }}>
      <button type="button" onClick={() => onJump(node.line)}>
        <span className="world-node-label">{label || node.type.toUpperCase()}</span>
        <span className="world-node-meta">Ln {node.line + 1}</span>
      </button>
      {node.children.length > 0 && (
        <div className="world-children">
          {node.children.map((child) => (
            <WorldNodeRow
              key={`${child.type}-${child.id}-${child.line}`}
              node={child}
              depth={depth + 1}
              onJump={onJump}
            />
          ))}
        </div>
      )}
    </div>
  );
};
