// Prints a single element in an isolated iframe. Printing the live page breaks for
// documents inside dialogs (transforms + overflow clip fixed-position print areas),
// and nested dialogs would print on top of each other.
export function printElement(element: HTMLElement, title = document.title) {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument
  const win = iframe.contentWindow
  if (!doc || !win) {
    iframe.remove()
    window.print()
    return
  }

  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((node) => node.outerHTML)
    .join('\n')
  const htmlClass = document.documentElement.className.replace(/\bdark\b/g, '')

  doc.open()
  doc.write(`<!doctype html><html lang="${document.documentElement.lang}" class="${htmlClass}"><head><meta charset="utf-8"><title>${title.replace(/</g, '&lt;')}</title><base href="${location.origin}/">${styles}<style>
    @page { size: A4; margin: 14mm; }
    html, body { background: #fff !important; }
    body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .print-root { border: 0 !important; box-shadow: none !important; padding: 0 !important; }
    .no-print { display: none !important; }
  </style></head><body class="${document.body.className}"><div class="print-root ${element.className}">${element.innerHTML}</div></body></html>`)
  doc.close()

  let printed = false
  const run = () => {
    if (printed) return
    printed = true
    win.focus()
    win.print()
    setTimeout(() => iframe.remove(), 1000)
  }
  const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[]
  Promise.all(
    links.map((link) =>
      link.sheet ? Promise.resolve() : new Promise<void>((resolve) => {
        link.addEventListener('load', () => resolve(), { once: true })
        link.addEventListener('error', () => resolve(), { once: true })
      }),
    ),
  ).then(() => {
    const fonts = (doc as Document & { fonts?: FontFaceSet }).fonts
    return fonts ? fonts.ready.then(() => undefined) : undefined
  }).then(() => setTimeout(run, 150))
  setTimeout(run, 2500)
}
