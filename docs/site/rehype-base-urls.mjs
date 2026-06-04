/**
 * Prepend the site's `base` path to root-absolute URLs in page content.
 *
 * Astro/Starlight apply `base` to navigation chrome (sidebar, header) but NOT
 * to links and images authored inside markdown/MDX. On a subpath deployment
 * (GitHub Pages at `/privion-consent`) that means every `[x](/guides/...)` and
 * every `<LinkCard href="/reference/...">` 404s. This plugin rewrites those at
 * build time so authors can keep writing clean root-absolute links and there is
 * a single source of truth for the base (passed in from astro.config).
 *
 * Handles both standard hast elements (`<a href>`, `<img src>`) and the MDX JSX
 * nodes that components like `<LinkCard href>` compile to.
 */

const URL_ATTRS = { a: 'href', img: 'src', area: 'href' };

/** @param {string} base normalized base without a trailing slash, e.g. "/privion-consent" */
export default function rehypeBaseUrls({ base } = {}) {
  const prefix = (base || '').replace(/\/$/, '');

  const rewrite = (value) => {
    if (typeof value !== 'string') return value;
    // Only touch root-absolute, same-origin paths: "/foo".
    // Skip protocol-relative ("//"), already-prefixed, and non-absolute values.
    if (!value.startsWith('/') || value.startsWith('//')) return value;
    if (value === prefix || value.startsWith(prefix + '/')) return value;
    return prefix + value;
  };

  const visit = (node) => {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'element') {
      const attr = URL_ATTRS[node.tagName];
      if (attr && node.properties && typeof node.properties[attr] === 'string') {
        node.properties[attr] = rewrite(node.properties[attr]);
      }
    } else if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
      for (const a of node.attributes || []) {
        if (
          a.type === 'mdxJsxAttribute' &&
          (a.name === 'href' || a.name === 'src') &&
          typeof a.value === 'string'
        ) {
          a.value = rewrite(a.value);
        }
      }
    }

    for (const child of node.children || []) visit(child);
  };

  return (tree) => visit(tree);
}
