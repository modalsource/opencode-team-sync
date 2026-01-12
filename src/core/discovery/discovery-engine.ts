import path from 'path';
import { minimatch } from 'minimatch';
import type { ConfigEntry, ConfigType, Manifest, ManifestConfig } from '../../types/index.js';
import { FileSystemManager } from '../fs/fs-manager.js';
import { AgentValidator, SkillValidator } from '../validator/validators.js';
import { parseYamlContent } from '../../utils/yaml-utils.js';
import { getLogger } from '../../utils/logger.js';
import { DiscoveryError, ValidationError, ErrorCode } from '../../utils/errors.js';
import {
  MANIFEST_ALIASES,
  DISCOVERY_PATTERNS,
  DEFAULT_EXCLUDE_PATTERNS,
} from '../../utils/constants.js';

/**
 * Discovery options for fine-grained control
 */
export interface DiscoveryOptions {
  /** Base directory to discover from */
  baseDir: string;
  /** Whether to use manifest-based discovery (if manifest exists) */
  useManifest?: boolean;
  /** Additional exclude patterns */
  excludePatterns?: string[];
  /** Whether to validate discovered configs */
  validate?: boolean;
  /** Whether to compute content hash */
  computeHash?: boolean;
}

/**
 * Result of a discovery operation
 */
export interface DiscoveryResult {
  /** Discovered configuration entries */
  configs: ConfigEntry[];
  /** Manifest (if found and loaded) */
  manifest?: Manifest;
  /** Discovery errors (non-fatal) */
  errors: DiscoveryErrorInfo[];
}

/**
 * Discovery error information
 */
export interface DiscoveryErrorInfo {
  /** Path where error occurred */
  path: string;
  /** Error message */
  message: string;
  /** Error type */
  type: 'validation' | 'parsing' | 'file-access';
}

/**
 * Discovery Engine
 * Handles auto-discovery of agents, skills, and MCP servers
 */
export class DiscoveryEngine {
  private fs: FileSystemManager;
  private logger = getLogger();
  private agentValidator: AgentValidator;
  private skillValidator: SkillValidator;

  constructor(fsManager?: FileSystemManager) {
    this.fs = fsManager ?? new FileSystemManager();
    this.agentValidator = new AgentValidator();
    this.skillValidator = new SkillValidator();
  }

  /**
   * Discover all configurations in a directory
   */
  async discover(options: DiscoveryOptions): Promise<DiscoveryResult> {
    const { baseDir, useManifest = true, validate = true, computeHash = true } = options;

    this.logger.info(`Starting discovery in: ${baseDir}`);
    const errors: DiscoveryErrorInfo[] = [];

    try {
      // Check if directory exists
      const dirExists = await this.fs.fileExists(baseDir);
      if (!dirExists) {
        throw new DiscoveryError(`Directory not found: ${baseDir}`, ErrorCode.DISCOVERY_ERROR, {
          baseDir,
        });
      }

      // Try to load manifest
      let manifest: Manifest | undefined;
      if (useManifest) {
        try {
          manifest = await this.loadManifest(baseDir);
          if (manifest) {
            this.logger.info('Manifest found, using manifest-based discovery');
          }
        } catch (error) {
          // Manifest is optional, log but continue
          this.logger.debug('No manifest found, using auto-discovery');
        }
      }

      // Determine discovery mode
      let configs: ConfigEntry[];
      if (manifest?.configs && manifest.configs.length > 0) {
        // Manifest-based discovery
        configs = await this.discoverFromManifest(
          baseDir,
          manifest.configs,
          manifest.globalTags || [],
          { validate, computeHash }
        );
      } else {
        // Auto-discovery
        const excludePatterns = [
          ...DEFAULT_EXCLUDE_PATTERNS,
          ...(options.excludePatterns || []),
          ...(manifest?.exclude || []),
        ];
        configs = await this.autoDiscover(baseDir, excludePatterns, { validate, computeHash });
      }

      // Apply global tags from manifest
      if (manifest?.globalTags && manifest.globalTags.length > 0) {
        configs = configs.map((config) => ({
          ...config,
          tags: [...new Set([...config.tags, ...manifest.globalTags!])],
        }));
      }

      this.logger.info(`Discovery complete: found ${configs.length} configurations`);

      return { configs, manifest, errors };
    } catch (error) {
      if (error instanceof DiscoveryError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new DiscoveryError('Discovery failed', ErrorCode.DISCOVERY_ERROR, { baseDir }, error);
      }
      throw error;
    }
  }

  /**
   * Load manifest file from directory
   */
  private async loadManifest(baseDir: string): Promise<Manifest | undefined> {
    for (const manifestName of MANIFEST_ALIASES) {
      const manifestPath = path.join(baseDir, manifestName);
      const exists = await this.fs.fileExists(manifestPath);

      if (exists) {
        this.logger.debug(`Found manifest: ${manifestPath}`);
        try {
          const content = await this.fs.readFile(manifestPath);
          const manifest = parseYamlContent<Manifest>(content);
          return manifest;
        } catch (error) {
          this.logger.warn(`Failed to parse manifest at ${manifestPath}`);
          this.logger.debug('Error details:', error);
          // Try next manifest alias
          continue;
        }
      }
    }

    return undefined;
  }

  /**
   * Discover configurations based on manifest
   */
  private async discoverFromManifest(
    baseDir: string,
    manifestConfigs: ManifestConfig[],
    globalTags: string[],
    options: { validate: boolean; computeHash: boolean }
  ): Promise<ConfigEntry[]> {
    this.logger.debug(`Discovering ${manifestConfigs.length} configs from manifest`);
    const configs: ConfigEntry[] = [];

    for (const manifestConfig of manifestConfigs) {
      try {
        const configPath = path.join(baseDir, manifestConfig.path);
        const exists = await this.fs.fileExists(configPath);

        if (!exists) {
          this.logger.warn(`Manifest config not found: ${manifestConfig.path}`);
          continue;
        }

        const config = await this.createConfigEntry(
          baseDir,
          configPath,
          manifestConfig.type,
          options
        );

        // Override with manifest data
        if (manifestConfig.name) {
          config.name = manifestConfig.name;
        }
        if (manifestConfig.tags) {
          config.tags = [...new Set([...config.tags, ...manifestConfig.tags, ...globalTags])];
        }
        if (manifestConfig.description) {
          config.description = manifestConfig.description;
        }

        configs.push(config);
      } catch (error) {
        this.logger.warn(`Failed to load manifest config: ${manifestConfig.path}`);
        this.logger.debug('Error details:', error);
        // Continue with other configs
      }
    }

    return configs;
  }

  /**
   * Auto-discover configurations using file patterns
   */
  private async autoDiscover(
    baseDir: string,
    excludePatterns: string[],
    options: { validate: boolean; computeHash: boolean }
  ): Promise<ConfigEntry[]> {
    this.logger.debug('Starting auto-discovery');
    const configs: ConfigEntry[] = [];

    // Discover each config type
    for (const type of ['agent', 'skill'] as ConfigType[]) {
      const typeConfigs = await this.discoverType(baseDir, type, excludePatterns, options);
      configs.push(...typeConfigs);
    }

    return configs;
  }

  /**
   * Discover configurations of a specific type
   */
  private async discoverType(
    baseDir: string,
    type: ConfigType,
    excludePatterns: string[],
    options: { validate: boolean; computeHash: boolean }
  ): Promise<ConfigEntry[]> {
    this.logger.debug(`Discovering ${type} configurations`);
    const configs: ConfigEntry[] = [];
    const patterns = DISCOVERY_PATTERNS[type];

    for (const pattern of patterns) {
      const files = await this.findMatchingFiles(baseDir, pattern, excludePatterns);

      for (const filePath of files) {
        try {
          const config = await this.createConfigEntry(baseDir, filePath, type, options);
          configs.push(config);
        } catch (error) {
          this.logger.debug(`Skipping invalid ${type}: ${filePath}`, error);
          // Continue with next file
        }
      }
    }

    this.logger.debug(`Found ${configs.length} ${type} configurations`);
    return configs;
  }

  /**
   * Find files matching a glob pattern with exclusions
   */
  private async findMatchingFiles(
    baseDir: string,
    pattern: string,
    excludePatterns: string[]
  ): Promise<string[]> {
    // Get all files in directory
    const allFiles = await this.fs.walkDir(baseDir);

    // Filter by pattern
    const matchedFiles = allFiles.filter((filePath) => {
      const relativePath = path.relative(baseDir, filePath);

      // Check if matches include pattern
      const matches = minimatch(relativePath, pattern, { dot: false });
      if (!matches) return false;

      // Check if matches any exclude pattern
      const excluded = excludePatterns.some((excludePattern) =>
        minimatch(relativePath, excludePattern, { dot: false })
      );

      return !excluded;
    });

    return matchedFiles;
  }

  /**
   * Create a ConfigEntry from a file path
   */
  private async createConfigEntry(
    baseDir: string,
    filePath: string,
    type: ConfigType,
    options: { validate: boolean; computeHash: boolean }
  ): Promise<ConfigEntry> {
    const relativePath = path.relative(baseDir, filePath);

    // Read file content
    const content = await this.fs.readFile(filePath);

    // Validate if requested
    if (options.validate) {
      this.validateConfig(type, content, filePath);
    }

    // Extract metadata based on type
    const metadata = this.extractMetadata(type, content, filePath);

    // Compute hash if requested
    let hash = '';
    if (options.computeHash) {
      hash = await this.fs.getFileHash(filePath);
    }

    // Derive name from path
    const name = this.deriveName(type, relativePath);

    return {
      path: relativePath,
      type,
      name: metadata.name || name,
      hash,
      tags: metadata.tags || [],
      description: metadata.description,
    };
  }

  /**
   * Validate configuration content
   */
  private validateConfig(type: ConfigType, content: string, filePath: string): void {
    const configEntry: ConfigEntry = {
      path: filePath,
      type,
      name: path.basename(filePath),
      hash: '',
      tags: [],
    };

    let result;
    try {
      switch (type) {
        case 'agent':
          result = this.agentValidator.validate(content, configEntry);
          break;
        case 'skill':
          result = this.skillValidator.validate(content, configEntry);
          break;
        default: {
          const exhaustiveCheck: never = type;
          throw new Error(`Unknown config type: ${String(exhaustiveCheck)}`);
        }
      }

      if (!result.valid) {
        throw new ValidationError(
          `Validation failed for ${type}: ${filePath}`,
          ErrorCode.VALIDATION_FAILED,
          { filePath, errors: result.errors }
        );
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new ValidationError(
          `Validation failed for ${type}: ${filePath}`,
          ErrorCode.VALIDATION_FAILED,
          { filePath }
        );
      }
      throw error;
    }
  }

  /**
   * Extract metadata from configuration content
   */
  private extractMetadata(
    type: ConfigType,
    content: string,
    _filePath: string
  ): { name?: string; tags?: string[]; description?: string } {
    try {
      switch (type) {
        case 'agent':
          return this.extractAgentMetadata(content);
        case 'skill':
          return this.extractSkillMetadata(content);
        default:
          return {};
      }
    } catch {
      return {};
    }
  }

  /**
   * Extract metadata from agent markdown file
   */
  private extractAgentMetadata(content: string): {
    name?: string;
    tags?: string[];
    description?: string;
  } {
    // Extract YAML frontmatter
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return {};
    }

    try {
      const frontmatter = parseYamlContent<{
        name?: string;
        tags?: string[];
        description?: string;
      }>(frontmatterMatch[1]);

      return {
        name: frontmatter.name,
        tags: frontmatter.tags,
        description: frontmatter.description,
      };
    } catch {
      return {};
    }
  }

  /**
   * Extract metadata from skill markdown file
   */
  private extractSkillMetadata(content: string): {
    name?: string;
    tags?: string[];
    description?: string;
  } {
    // Same as agent - skills also use YAML frontmatter
    return this.extractAgentMetadata(content);
  }

  /**
   * Derive configuration name from file path
   */
  private deriveName(type: ConfigType, relativePath: string): string {
    const parsed = path.parse(relativePath);

    switch (type) {
      case 'agent': {
        // agents/frontend-dev.md -> frontend-dev
        // frontend-dev.agent.md -> frontend-dev
        return parsed.name.replace('.agent', '');
      }

      case 'skill': {
        // skills/git-release/SKILL.md -> git-release
        // Get parent directory name
        const skillDir = path.dirname(relativePath);
        const skillName = path.basename(skillDir);
        return skillName;
      }

      default:
        return parsed.name;
    }
  }
}
