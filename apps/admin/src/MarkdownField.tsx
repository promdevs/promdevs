import { useId, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Link,
  Code,
} from "lucide-react";
import { markdownEdit, type MarkdownAction } from "./project-field-helpers";

const tools = [
  ["bold", "Bold", Bold],
  ["italic", "Italic", Italic],
  ["heading", "Heading", Heading2],
  ["bullets", "Bullet list", List],
  ["numbered", "Numbered list", ListOrdered],
  ["quote", "Quote", Quote],
  ["link", "Link", Link],
  ["code", "Inline code", Code],
] as const;

export function MarkdownField({
  name,
  value,
  onChange,
  placeholder,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const id = useId();
  const input = useRef<HTMLTextAreaElement>(null);
  const [notice, setNotice] = useState("");
  function format(action: MarkdownAction) {
    const field = input.current;
    if (!field || field.matches(":disabled")) return;
    const edit = markdownEdit(
      value,
      field.selectionStart,
      field.selectionEnd,
      action,
    );
    if (edit.value.length > 12000) {
      setNotice("This field has reached its 12,000-character limit.");
      return;
    }
    setNotice("");
    onChange(edit.value);
    requestAnimationFrame(() => {
      if (!field.isConnected) return;
      field.focus({ preventScroll: true });
      field.setSelectionRange(edit.start, edit.end);
    });
  }
  return (
    <div className="markdown-field">
      <label htmlFor={id}>{name}</label>
      <div className="markdown-input-shell">
        <div
          className="markdown-toolbar"
          role="group"
          aria-label={`${name} formatting`}
        >
          {tools.map(([action, title, Icon]) => (
            <button
              key={action}
              type="button"
              title={title}
              aria-label={`${title} in ${name}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => format(action)}
            >
              <Icon size={16} aria-hidden />
            </button>
          ))}
          <span>Markdown</span>
        </div>
        <textarea
          id={id}
          ref={input}
          rows={6}
          maxLength={12000}
          value={value}
          placeholder={placeholder}
          aria-describedby={`${id}-hint`}
          onChange={(e) => {
            setNotice("");
            onChange(e.target.value);
          }}
          onKeyDown={(e) => {
            if (
              (e.ctrlKey || e.metaKey) &&
              !e.altKey &&
              (e.key.toLowerCase() === "b" || e.key.toLowerCase() === "i")
            ) {
              e.preventDefault();
              format(e.key.toLowerCase() === "b" ? "bold" : "italic");
            }
          }}
        />
      </div>
      <small id={`${id}-hint`} className="markdown-field-hint">
        Select text to format it, or use the toolbar to insert an example.
      </small>
      {notice && (
        <p role="status" className="feedback error">
          {notice}
        </p>
      )}
    </div>
  );
}

export function MarkdownHelp() {
  const examples = [
    ["Heading", "## A clear heading"],
    ["Bold / italic", "**Important** and *emphasis*"],
    ["Bullet list", "- First point\n- Second point"],
    ["Numbered list", "1. First step\n2. Next step"],
    ["Link", "[Visit the product](https://example.com)"],
    ["Quote", "> A useful quote"],
    ["Inline code", "`functionName()`"],
    ["Code block", "```js\nconst ready = true;\n```"],
  ];
  return (
    <details className="markdown-guide">
      <summary>
        Basic Markdown guide <span>See examples</span>
      </summary>
      <div className="markdown-guide-grid">
        {examples.map(([title, syntax]) => (
          <div key={title}>
            <strong>{title}</strong>
            <pre>
              <code>{syntax}</code>
            </pre>
          </div>
        ))}
      </div>
      <p>
        Use a blank line between paragraphs. Bold and italic shortcuts:
        Ctrl/Cmd+B and Ctrl/Cmd+I. Enable previews below to see the result. HTML
        and embedded images are not supported.
      </p>
    </details>
  );
}
