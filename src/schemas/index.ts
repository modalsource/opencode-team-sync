import { z } from 'zod';
import { TAG_PATTERN, MAX_TAG_LENGTH } from '../utils/constants.js';

/**
 * Tag validation schema
 */
export const TagSchema = z
  .string()
  .min(2)
  .max(MAX_TAG_LENGTH)
  .regex(TAG_PATTERN, 'Tag must match pattern: ^[a-z0-9][a-z0-9-]*[a-z0-9]$');

/**
 * Agent configuration frontmatter schema
 */
export const AgentFrontmatterSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(1024).optional(),
  tags: z.array(TagSchema).optional(),
  mode: z.enum(['primary', 'subagent', 'all']).optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
});

export type AgentFrontmatter = z.infer<typeof AgentFrontmatterSchema>;

/**
 * Skill configuration frontmatter schema
 */
export const SkillFrontmatterSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(1024).optional(),
  tags: z.array(TagSchema).optional(),
  commands: z.array(z.string().min(1)).optional(),
  version: z.string().optional(),
});

export type SkillFrontmatter = z.infer<typeof SkillFrontmatterSchema>;

/**
 * Manifest configuration entry schema
 */
export const ManifestConfigSchema = z.object({
  type: z.enum(['agent', 'skill']),
  path: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  tags: z.array(TagSchema).optional(),
  description: z.string().optional(),
});

export type ManifestConfigType = z.infer<typeof ManifestConfigSchema>;

/**
 * Manifest schema
 */
export const ManifestSchema = z.object({
  version: z.string().default('1.0.0'),
  metadata: z
    .object({
      name: z.string().optional(),
      description: z.string().optional(),
      author: z.string().optional(),
      homepage: z.string().url().optional(),
    })
    .optional(),
  globalTags: z.array(TagSchema).optional(),
  configs: z.array(ManifestConfigSchema).optional(),
  exclude: z.array(z.string()).optional(),
});

export type ManifestType = z.infer<typeof ManifestSchema>;

/**
 * Lockfile schema
 */
export const LockfileSchema = z.object({
  version: z.string(),
  repository: z
    .string()
    .min(1)
    .refine(
      (val) => {
        // Accept URLs (http, https, git, ssh)
        if (val.match(/^(https?|git|ssh):\/\/.+/)) return true;
        // Accept absolute paths (for local testing)
        if (val.startsWith('/') || val.match(/^[a-zA-Z]:\\/)) return true;
        // Reject relative paths and other invalid formats
        return false;
      },
      { message: 'Repository must be a valid URL or absolute path' }
    ),
  ref: z.string().min(1),
  commit: z.string().min(1),
  scope: z.enum(['global', 'project']),
  lastSync: z.string().datetime(),
  tags: z.array(z.string()).optional(),
  excludeTags: z.array(z.string()).optional(),
  configs: z.record(
    z.object({
      path: z.string(),
      type: z.enum(['agent', 'skill']),
      name: z.string(),
      hash: z.string(),
      tags: z.array(z.string()),
      description: z.string().optional(),
    })
  ),
});

export type LockfileType = z.infer<typeof LockfileSchema>;
