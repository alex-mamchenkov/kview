import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Button } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

type CodeBlockProps = {
  code: string;
  /** If set, uses syntax highlighting for this language. Otherwise renders plain monospace. */
  language?: string;
  /** Show copy button. Default true. */
  showCopy?: boolean;
  /**
   * When true and language is YAML, auto-collapses noisy K8s blocks (e.g. managedFields)
   * on load and exposes per-block fold toggles. Has no effect for non-YAML languages.
   */
  smartCollapse?: boolean;
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="small"
      startIcon={<ContentCopyIcon />}
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      sx={{ mb: 1 }}
    >
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function isYamlLanguage(language?: string) {
  const normalized = language?.toLowerCase();
  return normalized === "yaml" || normalized === "yml";
}

function yamlLineParts(line: string) {
  if (/^\s*#/.test(line)) {
    return [{ text: line, kind: "comment" as const }];
  }
  const match = line.match(/^(\s*)(-\s*)?([^#\s][^:\n]*?)(:\s*)(.*)$/);
  if (!match) {
    return [{ text: line, kind: "plain" as const }];
  }
  const [, indent = "", list = "", key = "", colon = "", value = ""] = match;
  return [
    { text: indent, kind: "plain" as const },
    { text: list, kind: "punctuation" as const },
    { text: key, kind: "key" as const },
    { text: colon, kind: "punctuation" as const },
    { text: value, kind: "plain" as const },
  ].filter((part) => part.text !== "");
}

function getLineIndent(line: string): number | null {
  if (line.trim() === "") return null;
  return line.match(/^(\s*)/)?.[1].length ?? 0;
}

/** Returns a map from block-header line index → last child line index (inclusive). */
function computeBlockRanges(lines: string[]): Map<number, number> {
  const indents = lines.map(getLineIndent);
  const result = new Map<number, number>();

  for (let i = 0; i < lines.length; i++) {
    const indent = indents[i];
    if (indent === null) continue;

    // Find the first non-empty line after i
    let j = i + 1;
    while (j < lines.length && indents[j] === null) j++;
    if (j >= lines.length) continue;

    const nextIndent = indents[j] as number;

    // Standard case: next non-empty sibling is strictly deeper.
    if (nextIndent > indent) {
      let end = j;
      for (let k = j + 1; k < lines.length; k++) {
        const ki = indents[k];
        if (ki === null) continue;
        if (ki <= indent) break;
        end = k;
      }
      result.set(i, end);
      continue;
    }

    // Compact-sequence case: kubectl/k8s emits list values at the same indent level
    // as the key, e.g.:
    //   managedFields:        ← indent 2
    //   - apiVersion: v1      ← also indent 2, not deeper
    //     fieldsType: ...     ← indent 4
    // Detect: current line is a bare key (ends with ':') and next line is a list item
    // at the same indent.
    const isBareKey = /:\s*$/.test(lines[i]);
    const nextIsListItem = /^\s*-\s/.test(lines[j]);
    if (!isBareKey || !nextIsListItem || nextIndent !== indent) continue;

    // End of block: scan until we hit a non-empty line that is shallower than `indent`,
    // or is at the same indent but is NOT a list item (i.e. a sibling mapping key).
    let end = j;
    for (let k = j + 1; k < lines.length; k++) {
      const ki = indents[k];
      if (ki === null) continue;
      if (ki < indent) break;
      if (ki === indent && !/^\s*-\s/.test(lines[k])) break;
      end = k;
    }
    result.set(i, end);
  }

  return result;
}

// Tier 1: always collapse — pure noise regardless of size
const K8S_ALWAYS_COLLAPSE = new Set(["managedFields", "status"]);

// Tier 2: collapse named keys when their block reaches a minimum child-line count.
// These keys are recognisable K8s boilerplate that becomes verbose quickly.
const K8S_NAMED_COLLAPSE_MIN_LINES: Record<string, number> = {
  metadata: 5,       // object metadata (uid, resourceVersion, labels, annotations…)
  annotations: 3,    // helm/operator annotations — almost always long noise
  labels: 5,         // label sets can grow large
  env: 5,            // container env-var lists
  volumeMounts: 5,   // volume mount lists
};

// Tier 3: collapse ANY block with this many child lines, unless the key is in the
// exempt set. Exempt keys are the primary content of a manifest — collapsing them
// by default would hide the reason the user opened the YAML panel.
const K8S_SIZE_COLLAPSE_THRESHOLD = 25;
const K8S_SIZE_COLLAPSE_EXEMPT = new Set([
  "spec", "template", "containers", "initContainers",
  "data", "stringData", "rules", "roleRef", "subjects", "volumes",
]);

function getSmartDefaultCollapsed(lines: string[], blockRanges: Map<number, number>): Set<number> {
  const collapsed = new Set<number>();
  for (const [start, end] of blockRanges) {
    const trimmed = lines[start].trim();
    // Extract the bare key name — matches "key:" and "- key:" but not "key: value"
    const keyMatch = trimmed.match(/^(?:-\s*)?(\w+)\s*:\s*$/);
    const key = keyMatch?.[1] ?? null;
    const childCount = end - start;

    // Tier 1
    if (key && K8S_ALWAYS_COLLAPSE.has(key)) {
      collapsed.add(start);
      continue;
    }
    // Tier 2
    const namedMin = key !== null ? K8S_NAMED_COLLAPSE_MIN_LINES[key] : undefined;
    if (namedMin !== undefined && childCount >= namedMin) {
      collapsed.add(start);
      continue;
    }
    // Tier 3
    if (childCount >= K8S_SIZE_COLLAPSE_THRESHOLD && (!key || !K8S_SIZE_COLLAPSE_EXEMPT.has(key))) {
      collapsed.add(start);
    }
  }
  return collapsed;
}

function PlainCodeContent({
  code,
  showLineNumbers = false,
  smartCollapse = false,
}: {
  code: string;
  showLineNumbers?: boolean;
  smartCollapse?: boolean;
}) {
  const lines = useMemo(() => code.split(/\r?\n/), [code]);

  const blockRanges = useMemo(
    () => (showLineNumbers ? computeBlockRanges(lines) : new Map<number, number>()),
    [lines, showLineNumbers],
  );

  const [collapsed, setCollapsed] = useState<Set<number>>(() =>
    showLineNumbers && smartCollapse ? getSmartDefaultCollapsed(lines, blockRanges) : new Set(),
  );

  // Reset collapse state when code or the smart-collapse setting changes
  useEffect(() => {
    if (!showLineNumbers) return;
    const freshLines = code.split(/\r?\n/);
    const freshRanges = computeBlockRanges(freshLines);
    setCollapsed(smartCollapse ? getSmartDefaultCollapsed(freshLines, freshRanges) : new Set());
  }, [code, smartCollapse, showLineNumbers]);

  const hiddenLines = useMemo(() => {
    const hidden = new Set<number>();
    for (const startLine of collapsed) {
      const end = blockRanges.get(startLine);
      if (end !== undefined) {
        for (let i = startLine + 1; i <= end; i++) hidden.add(i);
      }
    }
    return hidden;
  }, [collapsed, blockRanges]);

  const toggleCollapse = useCallback((lineIndex: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(lineIndex)) next.delete(lineIndex);
      else next.add(lineIndex);
      return next;
    });
  }, []);

  if (showLineNumbers) {
    const width = String(Math.max(lines.length, 1)).length;
    return (
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 0,
          fontFamily: "monospace",
          fontSize: "0.8rem",
          lineHeight: 1.5,
          backgroundColor: "transparent",
          color: "var(--code-text)",
        }}
      >
        {lines.map((line, idx) => {
          if (hiddenLines.has(idx)) return null;

          const blockEnd = blockRanges.get(idx);
          const isBlockHeader = blockEnd !== undefined;
          const isCollapsed = isBlockHeader && collapsed.has(idx);
          const childCount = isBlockHeader ? blockEnd - idx : 0;

          return (
            <Box key={idx} component="span" sx={{ display: "flex", minWidth: "max-content" }}>
              {/* Fold indicator column — only visible for block headers */}
              <Box
                component="span"
                onClick={isBlockHeader ? () => toggleCollapse(idx) : undefined}
                title={isBlockHeader ? (isCollapsed ? "Expand" : "Collapse") : undefined}
                sx={{
                  flex: "0 0 auto",
                  width: "1.4ch",
                  textAlign: "center",
                  cursor: isBlockHeader ? "pointer" : "default",
                  color: isCollapsed ? "var(--chip-info-fg)" : "var(--code-line-number)",
                  userSelect: "none",
                  visibility: isBlockHeader ? "visible" : "hidden",
                  opacity: 0.7,
                  "&:hover": isBlockHeader ? { opacity: 1 } : {},
                  fontSize: "0.7em",
                  lineHeight: "inherit",
                }}
              >
                {isCollapsed ? "▸" : "▾"}
              </Box>

              {/* Line number */}
              <Box
                component="span"
                sx={{
                  flex: "0 0 auto",
                  width: `${width + 1}ch`,
                  pr: 1,
                  color: "var(--code-line-number)",
                  opacity: 0.9,
                  textAlign: "right",
                  userSelect: "none",
                }}
              >
                {idx + 1}
              </Box>

              {/* Code content */}
              <Box
                component="code"
                sx={{ whiteSpace: "pre-wrap", wordBreak: "normal", overflowWrap: "anywhere" }}
              >
                {line
                  ? yamlLineParts(line).map((part, partIdx) => (
                      <Box
                        key={partIdx}
                        component="span"
                        sx={{
                          color:
                            part.kind === "key"
                              ? "var(--chip-info-fg)"
                              : part.kind === "comment"
                                ? "var(--code-line-number)"
                                : part.kind === "punctuation"
                                  ? "var(--code-line-number)"
                                  : "var(--code-text)",
                        }}
                      >
                        {part.text}
                      </Box>
                    ))
                  : " "}
                {isCollapsed && (
                  <Box
                    component="span"
                    sx={{
                      color: "var(--code-line-number)",
                      opacity: 0.55,
                      ml: 1,
                      fontSize: "0.85em",
                      fontStyle: "italic",
                    }}
                  >
                    ⋯ {childCount} lines
                  </Box>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        fontFamily: "monospace",
        fontSize: "0.8rem",
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
      }}
    >
      {code}
    </Box>
  );
}

export default function CodeBlock({
  code,
  language,
  showCopy = true,
  smartCollapse = false,
}: CodeBlockProps) {
  const theme = useTheme();

  if (language && !isYamlLanguage(language)) {
    const prismTheme = theme.palette.mode === "dark" ? oneDark : oneLight;
    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        {showCopy && <CopyButton text={code} />}
        <Box
          sx={{
            flexGrow: 1,
            overflow: "auto",
            borderRadius: 2,
            border: "1px solid var(--code-border)",
            backgroundColor: "var(--code-bg)",
            "& pre, & code, & .token": {
              textShadow: "none !important",
            },
          }}
        >
          <SyntaxHighlighter
            language={language}
            style={prismTheme}
            showLineNumbers
            wrapLongLines
            customStyle={{
              margin: 0,
              background: "transparent",
              color: "var(--code-text)",
              textShadow: "none",
            }}
            codeTagProps={{
              style: { color: "var(--code-text)", textShadow: "none" },
            }}
            lineNumberStyle={{
              color: "var(--code-line-number)",
              opacity: 0.9,
            }}
          >
            {code}
          </SyntaxHighlighter>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {showCopy && <CopyButton text={code} />}
      <Box
        sx={{
          flexGrow: 1,
          overflow: "auto",
          fontFamily: "monospace",
          fontSize: "0.8rem",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          backgroundColor: "var(--code-bg)",
          color: "var(--code-text)",
          p: 1.5,
          borderRadius: 1,
          border: "1px solid var(--code-border)",
        }}
      >
        <PlainCodeContent
          code={code}
          showLineNumbers={isYamlLanguage(language)}
          smartCollapse={smartCollapse}
        />
      </Box>
    </Box>
  );
}
