import yaml from 'yaml';

/**
 * Extract YAML frontmatter from markdown content
 * Returns the frontmatter object and the remaining content
 */
export function extractFrontmatter(content: string): {
  frontmatter: unknown;
  body: string;
} {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return {
      frontmatter: {},
      body: content,
    };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const frontmatter = yaml.parse(match[1]);
    const body = match[2];
    return { frontmatter: frontmatter || {}, body };
  } catch (error) {
    throw new Error(
      `Failed to parse YAML frontmatter: ${error instanceof Error ? error.message : 'unknown error'}`
    );
  }
}

/**
 * Check if content has YAML frontmatter
 */
export function hasFrontmatter(content: string): boolean {
  return /^---\s*\n/.test(content);
}

/**
 * Stringify YAML frontmatter
 */
export function stringifyFrontmatter(data: unknown): string {
  return yaml.stringify(data);
}

/**
 * Parse YAML content (for non-markdown YAML files)
 */
export function parseYamlContent<T = unknown>(content: string, filePath?: string): T {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const parsed = yaml.parse(content);
    return parsed as T;
  } catch (error) {
    const location = filePath ? ` in ${filePath}` : '';
    throw new Error(
      `Failed to parse YAML${location}: ${error instanceof Error ? error.message : 'unknown error'}`
    );
  }
}
