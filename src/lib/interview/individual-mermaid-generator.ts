import type { IndividualProcessSchema } from '@/lib/schema/workflow';

/**
 * Converts a Process Schema to a Mermaid.js flowchart definition string.
 * Uses vertical (top-down) orientation with rounded rectangles for steps
 * and diamonds for decision points.
 */
export function generateIndividualMermaid(schema: IndividualProcessSchema): string {
  const lines: string[] = ['flowchart TD'];

  // Render step/decision nodes
  for (const step of schema.steps) {
    const nodeId = sanitizeNodeId(step.id);
    const label = escapeMermaidLabel(step.label);

    if (step.type === 'decision') {
      // Diamond syntax for decisions
      lines.push(`  ${nodeId}{"${label}?"}`);
    } else {
      // Rounded rectangle syntax for steps
      lines.push(`  ${nodeId}("${label}")`);
    }
  }

  // Render connections
  for (const conn of schema.connections) {
    const fromId = sanitizeNodeId(conn.from);
    const toId = sanitizeNodeId(conn.to);

    if (conn.label) {
      lines.push(`  ${fromId} -->|"${escapeMermaidLabel(conn.label)}"| ${toId}`);
    } else {
      lines.push(`  ${fromId} --> ${toId}`);
    }
  }

  return lines.join('\n');
}

/**
 * Produces a structured plain-text description of the process
 * for the <details><summary> accessibility fallback.
 */
export function generateTextAlternative(schema: IndividualProcessSchema): string {
  const lines: string[] = [];

  // Steps list
  lines.push('Steps:');
  schema.steps
    .filter((s) => s.type === 'step')
    .forEach((s, i) => {
      lines.push(`  ${i + 1}. ${s.label}`);
    });

  // Decision points
  const decisions = schema.steps.filter((s) => s.type === 'decision');
  if (decisions.length > 0) {
    lines.push('');
    lines.push('Decision points:');
    for (const d of decisions) {
      const branches = schema.connections
        .filter((c) => c.from === d.id && c.label)
        .map((c) => c.label)
        .join(', ');
      lines.push(`  - ${d.label}${branches ? ` — ${branches}` : ''}`);
    }
  }

  // Flow description
  lines.push('');
  lines.push('Flow:');
  const flowParts = schema.steps.map((s) => s.label);
  lines.push(`  ${flowParts.join(' leads to ')}`);

  return lines.join('\n');
}

// --- Helpers ---

/**
 * Sanitize step UUIDs into valid Mermaid node IDs.
 * Replace hyphens with underscores, prefix with s_ to avoid reserved words.
 */
export function sanitizeNodeId(uuid: string): string {
  return `s_${uuid.replace(/-/g, '_')}`;
}

function escapeMermaidLabel(text: string): string {
  return text.replace(/"/g, "'");
}
