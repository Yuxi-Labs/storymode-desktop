import React from "react";
import {
  useStore,
  selectFile,
  selectNavigation,
  selectParse,
} from "../store/store.js";

interface JumpTarget {
  id: string;
  line: number;
}

export const FileList: React.FC = () => {
  const file = useStore(selectFile);
  const navigation = useStore(selectNavigation);
  const parse = useStore(selectParse);

  const handleJump = (scene: JumpTarget) => {
    if (!scene?.id) return;
    window.dispatchEvent(
      new CustomEvent("reveal-position", {
        detail: { line: (scene.line ?? 0) + 1, column: 1 },
      }),
    );
    useStore.getState().recordJump(scene.id);
  };

  const name = file.path ? file.path.split(/[/\\\\]/).pop() : "Untitled";
  const filePath = file.path ?? "Unsaved document";
  const kindLabel = (() => {
    switch (parse.fileKind ?? file.fileType) {
      case "story":
        return "Story";
      case "narrative":
        return "Narrative";
      default:
        return "Document";
    }
  })();

  const scenes = navigation.sceneIndex ?? [];

  return (
    <div className="file-list-root">
      <div className="file-node">
        <div className="file-label">{kindLabel}</div>
        <div className="file-name">{name}</div>
        <div className="file-path" title={filePath}>
          {filePath}
        </div>
      </div>

      <div className="file-list-section">
        <div className="file-section-title">Scenes</div>
        {scenes.length > 0 ? (
          <ul className="file-children">
            {scenes.map((scene) => (
              <li key={scene.id}>
                <button type="button" onClick={() => handleJump(scene)}>
                  <span className="file-child-id">{scene.id}</span>
                  <span className="file-child-meta">Ln {scene.line + 1}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="file-empty">
            Scenes appear after a successful parse.
          </div>
        )}
      </div>
    </div>
  );
};
