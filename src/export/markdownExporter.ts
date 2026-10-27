import type { WordPressPost } from '@/types/wordpress';

function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent ?? '';
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as Element;
    const inner = Array.from(el.childNodes).map(walk).join('');
    switch (el.tagName.toLowerCase()) {
      case 'p':
        return `${inner}\n\n`;
      case 'br':
        return '\n';
      case 'strong':
      case 'b':
        return `**${inner}**`;
      case 'em':
      case 'i':
        return `*${inner}*`;
      case 'h1':
        return `# ${inner}\n\n`;
      case 'h2':
        return `## ${inner}\n\n`;
      case 'h3':
        return `### ${inner}\n\n`;
      case 'h4':
        return `#### ${inner}\n\n`;
      case 'a': {
        const href = el.getAttribute('href') ?? '';
        return `[${inner}](${href})`;
      }
      case 'img': {
        const src = el.getAttribute('src') ?? '';
        const alt = el.getAttribute('alt') ?? '';
        return `![${alt}](${src})`;
      }
      case 'li':
        return `- ${inner}\n`;
      case 'ul':
      case 'ol':
        return `${inner}\n`;
      default:
        return inner;
    }
  }

  return walk(doc.body)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function yamlEscape(value: string): string {
  return value.includes(':') || value.includes('"') ? JSON.stringify(value) : value;
}

/** Produces a Markdown file with YAML frontmatter, migration-friendly, preserving key metadata. */
export function postToMarkdown(post: WordPressPost, categoryNames: string[] = [], tagNames: string[] = []): string {
  const frontmatter = [
    '---',
    `id: ${post.id}`,
    `slug: ${yamlEscape(post.slug)}`,
    `title: ${yamlEscape(post.title.rendered.replace(/<[^>]+>/g, ''))}`,
    `date: ${post.date}`,
    `modified: ${post.modified}`,
    `status: ${post.status}`,
    `link: ${post.link}`,
    ...(categoryNames.length ? ['categories:', ...categoryNames.map((c) => `  - ${yamlEscape(c)}`)] : []),
    ...(tagNames.length ? ['tags:', ...tagNames.map((t) => `  - ${yamlEscape(t)}`)] : []),
    '---',
    '',
  ].join('\n');

  const title = post.title.rendered.replace(/<[^>]+>/g, '');
  const body = post.content?.rendered ? htmlToMarkdown(post.content.rendered) : '';

  return `${frontmatter}# ${title}\n\n${body}\n`;
}
