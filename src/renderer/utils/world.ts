export type WorldNode = {
  type: "story" | "narrative" | "scene";
  id: string;
  title?: string;
  line: number;
  children: WorldNode[];
};

export function parseWorldStructure(content: string): WorldNode[] {
  const lines = content.split(/\r?\n/);
  const stories: WorldNode[] = [];
  let currentStory: WorldNode | null = null;
  let currentNarrative: WorldNode | null = null;

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line.length) return;

    const storyMatch = /^::story:\s*(.+)$/i.exec(line);
    if (storyMatch) {
      const node = createNode("story", storyMatch[1], index);
      stories.push(node);
      currentStory = node;
      currentNarrative = null;
      return;
    }

    const narrativeMatch = /^::narrative:\s*(.+)$/i.exec(line);
    if (narrativeMatch) {
      const node = createNode("narrative", narrativeMatch[1], index);
      if (!currentStory) {
        currentStory = createNode("story", "Untitled Story", index);
        stories.push(currentStory);
      }
      currentStory.children.push(node);
      currentNarrative = node;
      return;
    }

    const sceneMatch = /^::scene:\s*(.+)$/i.exec(line);
    if (sceneMatch) {
      const node = createNode("scene", sceneMatch[1], index);
      if (!currentNarrative) {
        if (!currentStory) {
          currentStory = createNode("story", "Untitled Story", index);
          stories.push(currentStory);
        }
        currentNarrative = createNode("narrative", "Untitled Narrative", index);
        currentStory.children.push(currentNarrative);
      }
      currentNarrative.children.push(node);
    }
  });

  return stories;
}

function createNode(type: WorldNode["type"], raw: string, line: number): WorldNode {
  const { id, title } = parseDirectiveValue(raw);
  return {
    type,
    id: id || defaultLabel(type),
    title,
    line,
    children: [],
  };
}

function parseDirectiveValue(raw: string): { id: string; title?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { id: "" };
  const tokens = trimmed.split(/\s+/);
  const id = tokens.shift() ?? "";
  const remainder = tokens.join(" ");
  const titleMatch = remainder.match(/@title:([^@]+)/i);
  return {
    id: id.replace(/^"|"$/g, ""),
    title: titleMatch ? titleMatch[1].trim() : undefined,
  };
}

function defaultLabel(type: WorldNode["type"]): string {
  switch (type) {
    case "scene":
      return "Scene";
    case "narrative":
      return "Narrative";
    default:
      return "Story";
  }
}
