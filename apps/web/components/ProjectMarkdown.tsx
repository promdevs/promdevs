import Markdown from "react-markdown";

export function ProjectMarkdown({ children }: { children: string }) {
  return (
    <div className="project-prose">
      <Markdown
        skipHtml
        disallowedElements={["img"]}
        components={{
          h1: ({ children }) => <h3>{children}</h3>,
          h2: ({ children }) => <h3>{children}</h3>,
          h3: ({ children }) => <h4>{children}</h4>,
          h4: ({ children }) => <h5>{children}</h5>,
          h5: ({ children }) => <h6>{children}</h6>,
          a: ({ href, children }) =>
            href ? (
              <a
                href={href}
                {...(/^https?:\/\//.test(href)
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {children}
              </a>
            ) : (
              <span>{children}</span>
            ),
        }}
      >
        {children}
      </Markdown>
    </div>
  );
}
