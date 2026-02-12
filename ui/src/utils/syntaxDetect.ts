const extensionMap: Record<string, string> = {
  ".yaml": "yaml",
  ".yml": "yaml",
  ".json": "json",
  ".toml": "toml",
  ".xml": "xml",
  ".properties": "ini",
  ".ini": "ini",
  ".conf": "ini",
  ".sh": "bash",
  ".bash": "bash",
  ".env": "bash",
  ".sql": "sql",
  ".js": "javascript",
  ".ts": "typescript",
  ".py": "python",
  ".rb": "ruby",
  ".go": "go",
  ".html": "html",
  ".htm": "html",
  ".css": "css",
  ".tf": "hcl",
};

export function detectLanguageFromKey(keyName: string): string | undefined {
  const lower = keyName.toLowerCase();
  for (const [ext, lang] of Object.entries(extensionMap)) {
    if (lower.endsWith(ext)) return lang;
  }
  return undefined;
}
