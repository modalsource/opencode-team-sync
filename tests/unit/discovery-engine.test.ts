import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DiscoveryEngine } from '../../src/core/discovery/discovery-engine.js';
import { FileSystemManager } from '../../src/core/fs/fs-manager.js';
import { DiscoveryError } from '../../src/utils/errors.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('DiscoveryEngine', () => {
  let discoveryEngine: DiscoveryEngine;
  let testDir: string;

  beforeEach(async () => {
    discoveryEngine = new DiscoveryEngine();
    // Create a unique test directory
    testDir = path.join(os.tmpdir(), `oct-discovery-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('discover()', () => {
    it('should throw error if directory does not exist', async () => {
      const nonExistentDir = path.join(testDir, 'non-existent');

      await expect(
        discoveryEngine.discover({
          baseDir: nonExistentDir,
        })
      ).rejects.toThrow(DiscoveryError);
    });

    it('should discover agent configurations', async () => {
      // Create agents directory
      const agentsDir = path.join(testDir, 'agents');
      await fs.mkdir(agentsDir, { recursive: true });

      // Create agent file
      const agentContent = `---
name: test-agent
description: A test agent
tags: [test, agent]
---

This is the agent content.`;

      await fs.writeFile(path.join(agentsDir, 'test-agent.md'), agentContent, 'utf-8');

      const result = await discoveryEngine.discover({
        baseDir: testDir,
        validate: false,
      });

      expect(result.configs).toHaveLength(1);
      expect(result.configs[0]).toMatchObject({
        type: 'agent',
        name: 'test-agent',
        tags: ['test', 'agent'],
        description: 'A test agent',
      });
    });

    it('should discover skill configurations', async () => {
      // Create skills directory
      const skillsDir = path.join(testDir, 'skills', 'test-skill');
      await fs.mkdir(skillsDir, { recursive: true });

      // Create SKILL.md file
      const skillContent = `---
name: test-skill
description: A test skill
tags: [test, skill]
---

This is the skill content.`;

      await fs.writeFile(path.join(skillsDir, 'SKILL.md'), skillContent, 'utf-8');

      const result = await discoveryEngine.discover({
        baseDir: testDir,
        validate: false,
      });

      expect(result.configs).toHaveLength(1);
      expect(result.configs[0]).toMatchObject({
        type: 'skill',
        name: 'test-skill',
        tags: ['test', 'skill'],
        description: 'A test skill',
      });
    });

    it('should discover MCP server configurations', async () => {
      // Create mcp directory
      const mcpDir = path.join(testDir, 'mcp');
      await fs.mkdir(mcpDir, { recursive: true });

      // Create MCP config file
      const mcpConfig = {
        name: 'test-mcp',
        command: 'node',
        args: ['server.js'],
        tags: ['test', 'mcp'],
        description: 'A test MCP server',
      };

      await fs.writeFile(
        path.join(mcpDir, 'test-mcp.json'),
        JSON.stringify(mcpConfig, null, 2),
        'utf-8'
      );

      const result = await discoveryEngine.discover({
        baseDir: testDir,
        validate: false,
      });

      expect(result.configs).toHaveLength(1);
      expect(result.configs[0]).toMatchObject({
        type: 'mcp',
        name: 'test-mcp',
        tags: ['test', 'mcp'],
        description: 'A test MCP server',
      });
    });

    it('should discover all configuration types together', async () => {
      // Create agents directory
      const agentsDir = path.join(testDir, 'agents');
      await fs.mkdir(agentsDir, { recursive: true });

      const agentContent = `---
name: test-agent
description: A test agent
---

Agent content.`;
      await fs.writeFile(path.join(agentsDir, 'test-agent.md'), agentContent, 'utf-8');

      // Create skills directory
      const skillsDir = path.join(testDir, 'skills', 'test-skill');
      await fs.mkdir(skillsDir, { recursive: true });

      const skillContent = `---
name: test-skill
description: A test skill
---

Skill content.`;
      await fs.writeFile(path.join(skillsDir, 'SKILL.md'), skillContent, 'utf-8');

      // Create mcp directory
      const mcpDir = path.join(testDir, 'mcp');
      await fs.mkdir(mcpDir, { recursive: true });

      const mcpConfig = {
        name: 'test-mcp',
        command: 'node',
        args: ['server.js'],
      };
      await fs.writeFile(
        path.join(mcpDir, 'test-mcp.json'),
        JSON.stringify(mcpConfig, null, 2),
        'utf-8'
      );

      const result = await discoveryEngine.discover({
        baseDir: testDir,
        validate: false,
      });

      expect(result.configs).toHaveLength(3);
      expect(result.configs.map((c) => c.type).sort()).toEqual(['agent', 'mcp', 'skill']);
    });

    it('should exclude files matching exclude patterns', async () => {
      // Create agents directory
      const agentsDir = path.join(testDir, 'agents');
      await fs.mkdir(agentsDir, { recursive: true });

      // Create multiple agent files
      const agentContent = `---
name: test-agent
---

Content.`;

      await fs.writeFile(path.join(agentsDir, 'test-agent.md'), agentContent, 'utf-8');
      await fs.writeFile(path.join(agentsDir, 'test-agent.test.md'), agentContent, 'utf-8');

      const result = await discoveryEngine.discover({
        baseDir: testDir,
        validate: false,
      });

      // .test.md files should be excluded by default
      expect(result.configs).toHaveLength(1);
      expect(result.configs[0].name).toBe('test-agent');
    });

    it('should compute file hashes when requested', async () => {
      // Create agents directory
      const agentsDir = path.join(testDir, 'agents');
      await fs.mkdir(agentsDir, { recursive: true });

      const agentContent = `---
name: test-agent
---

Content.`;

      await fs.writeFile(path.join(agentsDir, 'test-agent.md'), agentContent, 'utf-8');

      const result = await discoveryEngine.discover({
        baseDir: testDir,
        computeHash: true,
        validate: false,
      });

      expect(result.configs[0].hash).toBeTruthy();
      expect(result.configs[0].hash).toHaveLength(64); // SHA-256 hex length
    });

    it('should skip hash computation when not requested', async () => {
      // Create agents directory
      const agentsDir = path.join(testDir, 'agents');
      await fs.mkdir(agentsDir, { recursive: true });

      const agentContent = `---
name: test-agent
---

Content.`;

      await fs.writeFile(path.join(agentsDir, 'test-agent.md'), agentContent, 'utf-8');

      const result = await discoveryEngine.discover({
        baseDir: testDir,
        computeHash: false,
        validate: false,
      });

      expect(result.configs[0].hash).toBe('');
    });

    it('should use manifest-based discovery when manifest exists', async () => {
      // Create agents directory
      const agentsDir = path.join(testDir, 'agents');
      await fs.mkdir(agentsDir, { recursive: true });

      const agentContent = `---
name: test-agent
---

Content.`;
      await fs.writeFile(path.join(agentsDir, 'test-agent.md'), agentContent, 'utf-8');
      await fs.writeFile(path.join(agentsDir, 'ignored-agent.md'), agentContent, 'utf-8');

      // Create manifest
      const manifest = {
        version: '1.0.0',
        globalTags: ['team'],
        configs: [
          {
            type: 'agent',
            path: 'agents/test-agent.md',
            tags: ['frontend'],
          },
        ],
      };

      await fs.writeFile(
        path.join(testDir, '.opencode-team.yaml'),
        `version: "1.0.0"
globalTags:
  - team
configs:
  - type: agent
    path: agents/test-agent.md
    tags:
      - frontend
`,
        'utf-8'
      );

      const result = await discoveryEngine.discover({
        baseDir: testDir,
        useManifest: true,
        validate: false,
      });

      // Only the config specified in manifest should be discovered
      expect(result.configs).toHaveLength(1);
      expect(result.configs[0].name).toBe('test-agent');
      expect(result.configs[0].tags).toContain('team'); // Global tag applied
      expect(result.configs[0].tags).toContain('frontend'); // Config-specific tag
    });

    it('should apply global tags from manifest', async () => {
      // Create agents directory
      const agentsDir = path.join(testDir, 'agents');
      await fs.mkdir(agentsDir, { recursive: true });

      const agentContent = `---
name: test-agent
tags: [custom]
---

Content.`;
      await fs.writeFile(path.join(agentsDir, 'test-agent.md'), agentContent, 'utf-8');

      // Create manifest with global tags
      await fs.writeFile(
        path.join(testDir, '.opencode-team.yaml'),
        `version: "1.0.0"
globalTags:
  - global1
  - global2
`,
        'utf-8'
      );

      const result = await discoveryEngine.discover({
        baseDir: testDir,
        useManifest: true,
        validate: false,
      });

      expect(result.configs[0].tags).toContain('custom');
      expect(result.configs[0].tags).toContain('global1');
      expect(result.configs[0].tags).toContain('global2');
    });

    it('should handle empty directory gracefully', async () => {
      const result = await discoveryEngine.discover({
        baseDir: testDir,
        validate: false,
      });

      expect(result.configs).toHaveLength(0);
      expect(result.manifest).toBeUndefined();
      expect(result.errors).toHaveLength(0);
    });

    it('should skip files without frontmatter for agents', async () => {
      // Create agents directory
      const agentsDir = path.join(testDir, 'agents');
      await fs.mkdir(agentsDir, { recursive: true });

      // Create agent file without frontmatter
      const agentContent = `This is just plain text without frontmatter.`;

      await fs.writeFile(path.join(agentsDir, 'no-frontmatter.md'), agentContent, 'utf-8');

      const result = await discoveryEngine.discover({
        baseDir: testDir,
        validate: false,
      });

      // File should still be discovered but with empty metadata
      expect(result.configs).toHaveLength(1);
      expect(result.configs[0].tags).toEqual([]);
      expect(result.configs[0].description).toBeUndefined();
    });
  });

  describe('deriveName()', () => {
    it('should derive agent name from filename', async () => {
      const agentsDir = path.join(testDir, 'agents');
      await fs.mkdir(agentsDir, { recursive: true });

      const agentContent = `---
description: Test
---

Content.`;

      await fs.writeFile(path.join(agentsDir, 'my-agent.md'), agentContent, 'utf-8');

      const result = await discoveryEngine.discover({
        baseDir: testDir,
        validate: false,
      });

      expect(result.configs[0].name).toBe('my-agent');
    });

    it('should derive skill name from parent directory', async () => {
      const skillDir = path.join(testDir, 'skills', 'my-skill');
      await fs.mkdir(skillDir, { recursive: true });

      const skillContent = `---
description: Test
---

Content.`;

      await fs.writeFile(path.join(skillDir, 'SKILL.md'), skillContent, 'utf-8');

      const result = await discoveryEngine.discover({
        baseDir: testDir,
        validate: false,
      });

      expect(result.configs[0].name).toBe('my-skill');
    });

    it('should derive MCP name from filename', async () => {
      const mcpDir = path.join(testDir, 'mcp');
      await fs.mkdir(mcpDir, { recursive: true });

      const mcpConfig = {
        command: 'node',
        args: ['server.js'],
      };

      await fs.writeFile(
        path.join(mcpDir, 'my-mcp-server.json'),
        JSON.stringify(mcpConfig),
        'utf-8'
      );

      const result = await discoveryEngine.discover({
        baseDir: testDir,
        validate: false,
      });

      expect(result.configs[0].name).toBe('my-mcp-server');
    });
  });
});
