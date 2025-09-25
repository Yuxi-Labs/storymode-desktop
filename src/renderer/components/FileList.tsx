import React from "react";
import { useStore, selectFile } from "../store/store.js";

// Hierarchical model rendering

const interact = (
  event: React.MouseEvent | React.KeyboardEvent,
  action: () => void,
) => {
  if ("key" in event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      action();
    }
  } else {
    action();
  }
};

export const FileList: React.FC = () => {
  const file = useStore(selectFile);
  const storyModel = useStore((s) => s.storyModel);
  const addNarrative = useStore((s) => s.addNarrative);
  const addScene = useStore((s) => s.addScene);
  const setActiveScene = useStore((s) => s.setActiveScene);

  const hasStory = Boolean(storyModel.story);
  if (!hasStory) return null;

  const story = storyModel.story!;
  const name = file.path ? file.path.split(/[/\\]/).pop() : story.title || "Story";

  const handleAddNarrative = () => {
    const id = addNarrative();
    if (id) {
      // Auto add first scene for new narrative
      const sceneId = addScene(id);
      if (sceneId) setActiveScene(sceneId);
    }
  };

  const handleAddScene = (narrativeId: string) => {
    const sceneId = addScene(narrativeId);
    if (sceneId) setActiveScene(sceneId);
  };

  return (
    <div className="world-panel" role="region" aria-label="Story Structure">
      <header className="world-header">
        <div className="world-file" data-tip="Story Root">
          <span className="world-key">STORY</span>
          <span className="world-value">{name}</span>
        </div>
        <div className="world-actions" aria-label="Structure actions">
          <span
            className="world-action"
            data-tip="New Narrative"
            role="button"
            tabIndex={0}
            onClick={(e) => interact(e, handleAddNarrative)}
            onKeyDown={(e) => interact(e, handleAddNarrative)}
          >＋N</span>
        </div>
      </header>
      <div className="world-tree" role="tree" aria-label="Narratives">
        {story.narrativeIds.map((nid) => {
          const narrative = storyModel.narratives[nid];
          if (!narrative) return null;
            return (
              <div key={nid} className="world-node narrative" role="treeitem" aria-label={narrative.title} data-tip={narrative.title}>
                <div className="world-node-row">
                  <span className="world-node-label">{narrative.title}</span>
                  <span
                    className="world-action minor"
                    data-tip="New Scene"
                    role="button"
                    tabIndex={0}
                    onClick={(e) => interact(e, () => handleAddScene(nid))}
                    onKeyDown={(e) => interact(e, () => handleAddScene(nid))}
                  >＋S</span>
                </div>
                {narrative.sceneIds.length > 0 && (
                  <div className="world-children" role="group" aria-label={`Scenes of ${narrative.title}`}>
                    {narrative.sceneIds.map((sid) => {
                      const scene = storyModel.scenes[sid];
                      if (!scene) return null;
                      const active = storyModel.activeSceneId === sid;
                      return (
                        <div
                          key={sid}
                          className={`world-node scene${active ? " active" : ""}`}
                          role="treeitem"
                          tabIndex={0}
                          aria-label={scene.title}
                          data-tip={scene.title}
                          onClick={(e) => interact(e, () => setActiveScene(sid))}
                          onKeyDown={(e) => interact(e, () => setActiveScene(sid))}
                        >
                          <div className="world-node-row">
                            <span className="world-node-label">{scene.title}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
        })}
      </div>
    </div>
  );
};
