import React, { useState } from "react";
import { Box, Button } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";

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

export default function CodeBlock({
  code,
  language,
  showCopy = true,
}: CodeBlockProps) {
  if (language) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        {showCopy && <CopyButton text={code} />}
        <Box sx={{ flexGrow: 1, overflow: "auto", border: "1px solid #ddd", borderRadius: 2 }}>
          <SyntaxHighlighter language={language} showLineNumbers wrapLongLines>
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
          bgcolor: "#f5f5f5",
          p: 1.5,
          borderRadius: 1,
          border: "1px solid #e0e0e0",
        }}
      >
        {code}
      </Box>
    </Box>
  );
}
