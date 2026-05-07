export interface PrintNodePrinter {
  id: number
  name: string
  description: string
  state: string
  computer: { name: string }
}

export async function fetchPrintNodePrinters(apiKey: string): Promise<PrintNodePrinter[]> {
  const res = await fetch('https://api.printnode.com/printers', {
    headers: {
      Authorization: 'Basic ' + btoa(apiKey + ':'),
    },
  })
  if (!res.ok) throw new Error('Invalid API key or PrintNode error')
  return res.json()
}

export async function printReceipt(apiKey: string, printerId: number, htmlContent: string, title: string): Promise<void> {
  const encoded = btoa(unescape(encodeURIComponent(htmlContent)))

  const res = await fetch('https://api.printnode.com/printjobs', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(apiKey + ':'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      printerId,
      title,
      contentType: 'html_base64',
      content: encoded,
      source: 'Dishflow POS',
      options: { copies: 1, paper: '80mm' },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message ?? 'Print failed')
  }
}
