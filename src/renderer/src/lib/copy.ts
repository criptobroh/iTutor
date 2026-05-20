/**
 * Copia texto al portapapeles preservando formato (HTML + plain).
 * Al pegar en Gmail, Notion, Word, Slack, etc., el destino elige el flavor
 * apropiado y vos no perdés negritas/títulos/listas/links.
 *
 * Recibe (1) el markdown source para `text/plain` y (2) el HTML renderizado
 * para `text/html` — el caller suele tener ambos a mano (el markdown source
 * lo manda el agent, el HTML lo produce react-markdown en el DOM).
 */
export async function copyRichText(opts: {
  plain: string;
  html?: string;
}): Promise<boolean> {
  const { plain, html } = opts;
  try {
    if (html && typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      const item = new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([plain], { type: "text/plain" }),
      });
      await navigator.clipboard.write([item]);
      return true;
    }
    await navigator.clipboard.writeText(plain);
    return true;
  } catch (e) {
    console.warn("[iTutor] copy failed", e);
    return false;
  }
}

/**
 * Levanta el HTML de un nodo en runtime — útil cuando react-markdown ya pintó
 * el contenido y quiero copiar exactamente lo que el usuario ve.
 */
export function nodeHtml(el: Element | null): string {
  return el?.innerHTML ?? "";
}
