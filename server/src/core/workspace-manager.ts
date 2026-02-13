import fs from 'fs';
import path from 'path';

export interface WorkspaceFile {
  name: string;
  path: string;
  size: number;
  sizeHuman: string;
  isDirectory: boolean;
  modifiedAt: string;
  createdAt: string;
  extension: string;
  ageDays: number;
}

export interface WorkspaceConfig {
  autoCleanEnabled: boolean;
  autoCleanDays: number;
  excludePatterns: string[];
}

const DEFAULT_CONFIG: WorkspaceConfig = {
  autoCleanEnabled: false,
  autoCleanDays: 30,
  excludePatterns: ['*.md', 'SOUL.md', 'IDENTITY.md', 'HEARTBEAT.md', 'BOOTSTRAP.md', 'TOOLS.md', 'AGENTS.md'],
};

function humanSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

export class WorkspaceManager {
  private workDir: string;
  private configPath: string;
  private notesPath: string;
  private config: WorkspaceConfig;
  private notes: Record<string, string> = {};
  private cleanTimer: ReturnType<typeof setInterval> | null = null;

  constructor(workDir: string, configDir: string) {
    this.workDir = workDir;
    this.configPath = path.join(configDir, 'workspace-config.json');
    this.notesPath = path.join(configDir, 'workspace-notes.json');
    this.config = this.loadConfig();
    this.notes = this.loadNotes();
    this.startAutoClean();
  }

  private loadConfig(): WorkspaceConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        return { ...DEFAULT_CONFIG, ...raw };
      }
    } catch {}
    return { ...DEFAULT_CONFIG };
  }

  private saveConfig(): void {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (err) {
      console.error('[Workspace] Failed to save config:', err);
    }
  }

  getConfig(): WorkspaceConfig {
    return { ...this.config };
  }

  updateConfig(partial: Partial<WorkspaceConfig>): WorkspaceConfig {
    this.config = { ...this.config, ...partial };
    this.saveConfig();
    this.startAutoClean();
    return this.getConfig();
  }

  listFiles(subPath: string = ''): { files: WorkspaceFile[]; currentPath: string; parentPath: string | null } {
    const targetDir = subPath ? path.join(this.workDir, subPath) : this.workDir;
    const realTarget = fs.realpathSync(targetDir);

    // Security: prevent path traversal
    if (!realTarget.startsWith(this.workDir)) {
      throw new Error('Access denied: path outside workspace');
    }

    if (!fs.existsSync(realTarget)) {
      throw new Error('Directory not found');
    }

    const entries = fs.readdirSync(realTarget, { withFileTypes: true });
    const now = Date.now();
    const files: WorkspaceFile[] = [];

    for (const entry of entries) {
      try {
        const fullPath = path.join(realTarget, entry.name);
        const stat = fs.statSync(fullPath);
        const relativePath = path.relative(this.workDir, fullPath);
        const ageDays = Math.floor((now - stat.mtimeMs) / (1000 * 60 * 60 * 24));

        files.push({
          name: entry.name,
          path: relativePath,
          size: stat.size,
          sizeHuman: humanSize(stat.size),
          isDirectory: entry.isDirectory(),
          modifiedAt: stat.mtime.toISOString(),
          createdAt: stat.birthtime.toISOString(),
          extension: entry.isDirectory() ? '' : path.extname(entry.name).toLowerCase(),
          ageDays,
        });
      } catch {}
    }

    // Sort: directories first, then by modified time descending
    files.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime();
    });

    const currentPath = subPath || '';
    const parentPath = subPath ? path.dirname(subPath) || null : null;
    // If parentPath is '.', set to empty string (root)
    const parent = parentPath === '.' ? '' : parentPath;

    return { files, currentPath, parentPath: parent };
  }

  getFileContent(filePath: string): { fullPath: string; stat: fs.Stats } {
    const fullPath = path.join(this.workDir, filePath);
    const realPath = fs.realpathSync(fullPath);

    if (!realPath.startsWith(this.workDir)) {
      throw new Error('Access denied: path outside workspace');
    }

    if (!fs.existsSync(realPath) || !fs.statSync(realPath).isFile()) {
      throw new Error('File not found');
    }

    return { fullPath: realPath, stat: fs.statSync(realPath) };
  }

  deleteFile(filePath: string): void {
    const fullPath = path.join(this.workDir, filePath);
    const realPath = fs.realpathSync(fullPath);

    if (!realPath.startsWith(this.workDir)) {
      throw new Error('Access denied: path outside workspace');
    }

    if (!fs.existsSync(realPath)) {
      throw new Error('File not found');
    }

    const stat = fs.statSync(realPath);
    if (stat.isDirectory()) {
      fs.rmSync(realPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(realPath);
    }
    console.log(`[Workspace] Deleted: ${filePath}`);
  }

  deleteMultiple(filePaths: string[]): { deleted: string[]; errors: string[] } {
    const deleted: string[] = [];
    const errors: string[] = [];
    for (const fp of filePaths) {
      try {
        this.deleteFile(fp);
        deleted.push(fp);
      } catch (err) {
        errors.push(`${fp}: ${String(err)}`);
      }
    }
    return { deleted, errors };
  }

  saveUploadedFile(fileName: string, buffer: Buffer, subPath: string = ''): WorkspaceFile {
    const targetDir = subPath ? path.join(this.workDir, subPath) : this.workDir;

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const fullPath = path.join(targetDir, fileName);

    // Security check
    const realDir = fs.realpathSync(targetDir);
    if (!realDir.startsWith(this.workDir)) {
      throw new Error('Access denied: path outside workspace');
    }

    fs.writeFileSync(fullPath, buffer);
    const stat = fs.statSync(fullPath);
    const relativePath = path.relative(this.workDir, fullPath);

    console.log(`[Workspace] Uploaded: ${relativePath} (${humanSize(stat.size)})`);

    return {
      name: fileName,
      path: relativePath,
      size: stat.size,
      sizeHuman: humanSize(stat.size),
      isDirectory: false,
      modifiedAt: stat.mtime.toISOString(),
      createdAt: stat.birthtime.toISOString(),
      extension: path.extname(fileName).toLowerCase(),
      ageDays: 0,
    };
  }

  createDirectory(dirName: string, subPath: string = ''): void {
    const targetDir = subPath ? path.join(this.workDir, subPath, dirName) : path.join(this.workDir, dirName);
    const parentReal = fs.realpathSync(subPath ? path.join(this.workDir, subPath) : this.workDir);

    if (!parentReal.startsWith(this.workDir)) {
      throw new Error('Access denied: path outside workspace');
    }

    if (fs.existsSync(targetDir)) {
      throw new Error('Directory already exists');
    }

    fs.mkdirSync(targetDir, { recursive: true });
    console.log(`[Workspace] Created directory: ${path.relative(this.workDir, targetDir)}`);
  }

  getStats(): { totalFiles: number; totalSize: number; totalSizeHuman: string; oldFiles: number } {
    let totalFiles = 0;
    let totalSize = 0;
    let oldFiles = 0;
    const now = Date.now();
    const maxAge = this.config.autoCleanDays * 24 * 60 * 60 * 1000;

    const walk = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(fullPath);
          } else {
            try {
              const stat = fs.statSync(fullPath);
              totalFiles++;
              totalSize += stat.size;
              if (now - stat.mtimeMs > maxAge) oldFiles++;
            } catch {}
          }
        }
      } catch {}
    };

    walk(this.workDir);
    return { totalFiles, totalSize, totalSizeHuman: humanSize(totalSize), oldFiles };
  }

  // Auto-clean expired files
  cleanExpiredFiles(): { deleted: string[]; errors: string[] } {
    if (!this.config.autoCleanEnabled || this.config.autoCleanDays <= 0) {
      return { deleted: [], errors: [] };
    }

    const deleted: string[] = [];
    const errors: string[] = [];
    const now = Date.now();
    const maxAge = this.config.autoCleanDays * 24 * 60 * 60 * 1000;

    const walk = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(fullPath);
          } else {
            try {
              const stat = fs.statSync(fullPath);
              if (now - stat.mtimeMs > maxAge) {
                // Check exclude patterns
                if (this.isExcluded(entry.name)) continue;
                const rel = path.relative(this.workDir, fullPath);
                fs.unlinkSync(fullPath);
                deleted.push(rel);
              }
            } catch (err) {
              errors.push(`${entry.name}: ${String(err)}`);
            }
          }
        }
      } catch {}
    };

    walk(this.workDir);
    if (deleted.length > 0) {
      console.log(`[Workspace] Auto-clean: deleted ${deleted.length} expired files`);
    }
    return { deleted, errors };
  }

  private isExcluded(fileName: string): boolean {
    return this.config.excludePatterns.some(pattern => {
      if (pattern.startsWith('*.')) {
        return fileName.endsWith(pattern.slice(1));
      }
      return fileName === pattern;
    });
  }

  private loadNotes(): Record<string, string> {
    try {
      if (fs.existsSync(this.notesPath)) {
        return JSON.parse(fs.readFileSync(this.notesPath, 'utf-8'));
      }
    } catch {}
    return {};
  }

  private saveNotes(): void {
    try {
      const dir = path.dirname(this.notesPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.notesPath, JSON.stringify(this.notes, null, 2));
    } catch (err) {
      console.error('[Workspace] Failed to save notes:', err);
    }
  }

  getNotes(): Record<string, string> {
    return { ...this.notes };
  }

  setNote(filePath: string, note: string): void {
    if (note) {
      this.notes[filePath] = note;
    } else {
      delete this.notes[filePath];
    }
    this.saveNotes();
  }

  private startAutoClean(): void {
    if (this.cleanTimer) {
      clearInterval(this.cleanTimer);
      this.cleanTimer = null;
    }

    if (this.config.autoCleanEnabled) {
      // Run every hour
      this.cleanTimer = setInterval(() => {
        this.cleanExpiredFiles();
      }, 60 * 60 * 1000);

      // Also run once on startup
      setTimeout(() => this.cleanExpiredFiles(), 5000);
      console.log(`[Workspace] Auto-clean enabled: files older than ${this.config.autoCleanDays} days`);
    }
  }
}
