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
