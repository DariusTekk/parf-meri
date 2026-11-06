import MarkdownIt from 'markdown-it';

const ALLOWED_PROTOCOLS = /^(https?:|mailto:|tel:)/i;

const md = new MarkdownIt({ html: false, linkify: true, breaks: true, typographer: false });
md.disable(['image', 'table', 'code', 'fence', 'html_block', 'html_inline']);

md.validateLink = (url: string) => ALLOWED_PROTOCOLS.test(url.trim());

const defaultLinkOpen =
  md.renderer.rules.link_open ??
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  if (token) {
    token.attrSet('rel', 'nofollow noopener noreferrer');
  }
  return defaultLinkOpen(tokens, idx, options, env, self);
};

// Başlık seviyeleri sayfadaki yere göre ayarlanır (env.base): h2 bölümü içindeki açıklamada
// #, ## ve ### → h3, daha derinleri → h4. Böylece sayfadaki başlık sırası atlanmaz.
const headingLevel = (tag: string | undefined, base: number) =>
  Number(tag?.slice(1) ?? 3) <= 3 ? base : base + 1;
const baseOf = (env: unknown) => (env as { base?: number } | undefined)?.base ?? 3;
md.renderer.rules.heading_open = (tokens, idx, _o, env) =>
  `<h${headingLevel(tokens[idx]?.tag, baseOf(env))}>`;
md.renderer.rules.heading_close = (tokens, idx, _o, env) =>
  `</h${headingLevel(tokens[idx]?.tag, baseOf(env))}>\n`;

/**
 * Sınırlı Markdown'ı güvenli HTML'e çevirir. Ham HTML hiç işlenmez (kaçırılır),
 * bağlantılar yalnızca http, https, mailto ve tel olabilir, görsel ve kod blokları kapalıdır.
 */
export function renderMarkdown(source: string, headingBase: 2 | 3 = 3): string {
  return md.render(source, { base: headingBase });
}

/** Meta açıklama ve önizleme için düz metin özeti. */
export function markdownToPlain(source: string, maxLength = 160): string {
  const text = source
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_#>`~-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 80 ? lastSpace : cut.length)}…`;
}
