import React, { useState } from "react";
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

function PlainCodeContent({ code, showLineNumbers = false }: { code: string; showLineNumbers?: boolean }) {
  if (showLineNumbers) {
    const lines = code.split(/\r?\n/);
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
        {lines.map((line, idx) => (
          <Box key={idx} component="span" sx={{ display: "flex", minWidth: "max-content" }}>
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
            <Box component="code" sx={{ whiteSpace: "pre-wrap", wordBreak: "normal", overflowWrap: "anywhere" }}>
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
            </Box>
            {"\n"}
          </Box>
        ))}
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
        <PlainCodeContent code={code} showLineNumbers={isYamlLanguage(language)} />
      </Box>
    </Box>
  );
}
