import type { ValidationResult, ValidationIssue, ConfigEntry } from '../../types/index.js';
import {
  AgentFrontmatterSchema,
  SkillFrontmatterSchema,
  ManifestSchema,
  LockfileSchema,
  type AgentFrontmatter,
  type SkillFrontmatter,
  type ManifestType,
  type LockfileType,
} from '../../schemas/index.js';
import { extractFrontmatter, hasFrontmatter } from '../../utils/yaml-utils.js';
import { SchemaValidationError } from '../../utils/errors.js';
import { getLogger } from '../../utils/logger.js';
import { ZodError } from 'zod';

/**
 * Base validator class
 */
abstract class BaseValidator {
  protected logger = getLogger();

  /**
   * Convert Zod errors to validation issues
   */
  protected zodErrorsToIssues(error: ZodError): ValidationIssue[] {
    return error.errors.map((err) => ({
      message: err.message,
      path: err.path.join('.'),
      suggestion: this.getSuggestionForError(err),
    }));
  }

  /**
   * Get suggestion for a Zod error
   */
  private getSuggestionForError(error: { code: string; message: string }): string | undefined {
    if (error.code === 'invalid_type') {
      return 'Check the data type of this field';
    }
    if (error.code === 'too_small') {
      return 'Value is too short or small';
    }
    if (error.code === 'too_big') {
      return 'Value is too long or large';
    }
    if (error.message.includes('pattern')) {
      return 'Value does not match the required pattern';
    }
    return undefined;
  }
}

/**
 * Agent configuration validator
 */
export class AgentValidator extends BaseValidator {
  /**
   * Validate an agent configuration file
   */
  validate(content: string, configEntry: ConfigEntry): ValidationResult {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    try {
      // Check for frontmatter
      if (!hasFrontmatter(content)) {
        warnings.push({
          message: 'Agent file has no frontmatter',
          suggestion: 'Add YAML frontmatter with name, description, and tags',
        });
      }

      // Extract and validate frontmatter
      const { frontmatter, body } = extractFrontmatter(content);

      try {
        AgentFrontmatterSchema.parse(frontmatter);
      } catch (error) {
        if (error instanceof ZodError) {
          errors.push(...this.zodErrorsToIssues(error));
        }
      }

      // Check body exists
      if (!body || body.trim().length === 0) {
        errors.push({
          message: 'Agent file has no content after frontmatter',
          suggestion: 'Add instructions for the agent',
        });
      }

      // Warn if body is very short
      if (body && body.trim().length < 100) {
        warnings.push({
          message: 'Agent instructions are very short',
          suggestion: 'Consider adding more detailed instructions',
        });
      }

      return {
        valid: errors.length === 0,
        config: configEntry,
        errors,
        warnings,
      };
    } catch (error) {
      if (error instanceof Error) {
        return {
          valid: false,
          config: configEntry,
          errors: [{ message: error.message }],
          warnings,
        };
      }
      throw error;
    }
  }

  /**
   * Validate just the frontmatter
   */
  validateFrontmatter(frontmatter: unknown): AgentFrontmatter {
    try {
      return AgentFrontmatterSchema.parse(frontmatter);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new SchemaValidationError('AgentFrontmatter', error.errors);
      }
      throw error;
    }
  }
}

/**
 * Skill configuration validator
 */
export class SkillValidator extends BaseValidator {
  /**
   * Validate a skill configuration file
   */
  validate(content: string, configEntry: ConfigEntry): ValidationResult {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    try {
      // Check for frontmatter
      if (!hasFrontmatter(content)) {
        warnings.push({
          message: 'Skill file has no frontmatter',
          suggestion: 'Add YAML frontmatter with name, description, and tags',
        });
      }

      // Extract and validate frontmatter
      const { frontmatter, body } = extractFrontmatter(content);

      try {
        SkillFrontmatterSchema.parse(frontmatter);
      } catch (error) {
        if (error instanceof ZodError) {
          errors.push(...this.zodErrorsToIssues(error));
        }
      }

      // Check body exists
      if (!body || body.trim().length === 0) {
        errors.push({
          message: 'Skill file has no content after frontmatter',
          suggestion: 'Add documentation for the skill',
        });
      }

      return {
        valid: errors.length === 0,
        config: configEntry,
        errors,
        warnings,
      };
    } catch (error) {
      if (error instanceof Error) {
        return {
          valid: false,
          config: configEntry,
          errors: [{ message: error.message }],
          warnings,
        };
      }
      throw error;
    }
  }

  /**
   * Validate just the frontmatter
   */
  validateFrontmatter(frontmatter: unknown): SkillFrontmatter {
    try {
      return SkillFrontmatterSchema.parse(frontmatter);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new SchemaValidationError('SkillFrontmatter', error.errors);
      }
      throw error;
    }
  }

  /**
   * Validate skill name format
   */
  validateName(name: string): boolean {
    // Skill names can include directory separator
    return /^[a-z0-9-_/]+$/i.test(name);
  }
}

/**
 * Manifest validator
 */
export class ManifestValidator extends BaseValidator {
  /**
   * Validate a manifest file
   */
  validate(content: string): ManifestType {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const manifest = JSON.parse(content);
      return ManifestSchema.parse(manifest);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new SchemaValidationError('Manifest', error.errors);
      }
      if (error instanceof Error) {
        throw new Error(`Invalid manifest: ${error.message}`);
      }
      throw error;
    }
  }
}

/**
 * Lockfile validator
 */
export class LockfileValidator extends BaseValidator {
  /**
   * Validate a lockfile
   */
  validate(content: string): LockfileType {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const lockfile = JSON.parse(content);
      return LockfileSchema.parse(lockfile);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new SchemaValidationError('Lockfile', error.errors);
      }
      if (error instanceof Error) {
        throw new Error(`Invalid lockfile: ${error.message}`);
      }
      throw error;
    }
  }
}
