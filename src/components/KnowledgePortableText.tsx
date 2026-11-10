
import type { ReactNode } from "react";

/**
 * BARK ORNAMENT — FILE 149 STEP E5A
 *
 * Safe Portable Text renderer for
 * approved Sanity Knowledge Articles.
 *
 * This component:
 * - Uses normal React text escaping
 * - Does not render arbitrary HTML
 * - Does not fetch CMS content
 * - Does not alter article publication
 * - Does not modify the existing GSM page
 */

type TextSpan = {
  _type: "span";
  _key: string;
  text: string;
  marks: string[];
};

type LinkDefinition = {
  _type: "link";
  _key: string;
  href: string;
};

type TextBlock = {
  _type: "block";
  _key: string;
  style?: string;
  listItem?: string;
  level?: number;
  children: TextSpan[];
  markDefs: LinkDefinition[];
};

type KnowledgePortableTextProps = {
  value: readonly unknown[];
};

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function safeLink(
  value: unknown
): string | null {
  if (
    typeof value !== "string" ||
    value.length > 2048
  ) {
    return null;
  }

  try {
    const url = new URL(value);

    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

function parseBlock(
  value: unknown
): TextBlock | null {
  if (
    !isRecord(value) ||
    value._type !== "block" ||
    typeof value._key !== "string" ||
    !Array.isArray(value.children) ||
    !Array.isArray(value.markDefs)
  ) {
    return null;
  }

  const children: TextSpan[] = [];

  for (const item of value.children) {
    if (
      !isRecord(item) ||
      item._type !== "span" ||
      typeof item._key !== "string" ||
      typeof item.text !== "string" ||
      !Array.isArray(item.marks) ||
      item.marks.some(
        (mark: unknown) =>
          typeof mark !== "string"
      )
    ) {
      return null;
    }

    children.push({
      _type: "span",
      _key: item._key,
      text: item.text,
      marks: item.marks,
    });
  }

  const markDefs: LinkDefinition[] = [];

  for (const item of value.markDefs) {
    if (
      !isRecord(item) ||
      item._type !== "link" ||
      typeof item._key !== "string" ||
      typeof item.href !== "string"
    ) {
      return null;
    }

    markDefs.push({
      _type: "link",
      _key: item._key,
      href: item.href,
    });
  }

  const allowedStyles = [
    "normal",
    "h2",
    "h3",
    "blockquote",
  ];

  const style =
    typeof value.style === "string" &&
    allowedStyles.includes(value.style)
      ? value.style
      : "normal";

  const listItem =
    value.listItem === "bullet" ||
    value.listItem === "number"
      ? value.listItem
      : undefined;

  return {
    _type: "block",
    _key: value._key,
    style,
    listItem,
    level:
      typeof value.level === "number" &&
      Number.isInteger(value.level)
        ? value.level
        : undefined,
    children,
    markDefs,
  };
}

function renderSpan(
  span: TextSpan,
  definitions: readonly LinkDefinition[]
): ReactNode {
  let content: ReactNode = span.text;

  for (const mark of span.marks) {
    if (mark === "strong") {
      content = (
        <strong
          key={mark}
          className="font-semibold text-[#30251F]"
        >
          {content}
        </strong>
      );
      continue;
    }

    if (mark === "em") {
      content = (
        <em key={mark}>{content}</em>
      );
      continue;
    }

    if (mark === "code") {
      content = (
        <code
          key={mark}
          className="rounded bg-[#F3EBDF] px-1 py-0.5 text-sm"
        >
          {content}
        </code>
      );
      continue;
    }

    const definition =
      definitions.find(
        (entry) => entry._key === mark
      );

    if (!definition) {
      continue;
    }

    const href = safeLink(definition.href);

    if (!href) {
      continue;
    }

    content = (
      <a
        key={mark}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#A94C19] underline underline-offset-4 hover:text-[#80370F] focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B95016]"
      >
        {content}
      </a>
    );
  }

  return content;
}

function renderInline(
  block: TextBlock
): ReactNode {
  return block.children.map((span) => (
    <span key={span._key}>
      {renderSpan(span, block.markDefs)}
    </span>
  ));
}

function renderBlock(
  block: TextBlock
): ReactNode {
  const content = renderInline(block);

  switch (block.style) {
    case "h2":
      return (
        <h2 className="mt-12 font-serif text-3xl leading-tight text-[#30251F] sm:text-4xl">
          {content}
        </h2>
      );

    case "h3":
      return (
        <h3 className="mt-8 font-serif text-2xl leading-snug text-[#30251F]">
          {content}
        </h3>
      );

    case "blockquote":
      return (
        <blockquote className="my-8 border-l-[3px] border-[#C59A45] bg-[#F3EBDF] px-6 py-5 font-serif text-xl leading-relaxed text-[#49372C]">
          {content}
        </blockquote>
      );

    default:
      return (
        <p className="mt-5 text-base leading-8 text-[#66584F]">
          {content}
        </p>
      );
  }
}

export default function KnowledgePortableText({
  value,
}: KnowledgePortableTextProps) {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const blocks = value
    .map(parseBlock)
    .filter(
      (block): block is TextBlock =>
        block !== null
    );

  const output: ReactNode[] = [];

  for (let index = 0; index < blocks.length; ) {
    const block = blocks[index];

    if (!block.listItem) {
      output.push(
        <div key={block._key}>
          {renderBlock(block)}
        </div>
      );
      index++;
      continue;
    }

    const kind = block.listItem;
    const group: TextBlock[] = [];

    while (
      index < blocks.length &&
      blocks[index].listItem === kind
    ) {
      group.push(blocks[index]);
      index++;
    }

    const items = group.map((item) => (
      <li
        key={item._key}
        className="pl-1 leading-8"
      >
        {renderInline(item)}
      </li>
    ));

    if (kind === "number") {
      output.push(
        <ol
          key={group[0]._key}
          className="my-6 list-decimal space-y-2 pl-7 text-[#66584F]"
        >
          {items}
        </ol>
      );
    } else {
      output.push(
        <ul
          key={group[0]._key}
          className="my-6 list-disc space-y-2 pl-7 text-[#66584F]"
        >
          {items}
        </ul>
      );
    }
  }

  return (
    <div className="min-w-0 break-words">
      {output}
    </div>
  );
}
