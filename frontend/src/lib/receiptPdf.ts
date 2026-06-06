export type ReceiptItem = {
  code: string
  description: string
  quantity: string
  unitValue: string
  totalValue: string
}

export type ReceiptPdfOptions = {
  filename: string
  title: string
  subtitle: string
  documentId: string
  emission: string
  operator?: string
  consumer: string
  paymentMethod: string
  items: ReceiptItem[]
  subtotal: string
  discount?: string
  total: string
  contextLines?: string[]
}

const pageWidth = 595
const pageHeight = 842
const margin = 42

function cleanText(value: string) {
  return value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/•/g, '-')
}

function escapePdfText(value: string) {
  return cleanText(value)
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0)
      if (char === '\\') return '\\\\'
      if (char === '(') return '\\('
      if (char === ')') return '\\)'
      if (code > 255) return '?'
      return char
    })
    .join('')
}

function binaryToBytes(value: string) {
  const bytes = new Uint8Array(value.length)
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0xff
  }
  return bytes
}

function textWidth(text: string, fontSize: number) {
  return cleanText(text).length * fontSize * 0.5
}

function wrapText(text: string, maxChars: number) {
  const words = cleanText(text).split(/\s+/)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars && current) {
      lines.push(current)
      if (word.length > maxChars) {
        for (let index = 0; index < word.length; index += maxChars) {
          lines.push(word.slice(index, index + maxChars))
        }
        current = ''
      } else {
        current = word
      }
    } else if (word.length > maxChars) {
      if (current) lines.push(current)
      for (let index = 0; index < word.length; index += maxChars) {
        lines.push(word.slice(index, index + maxChars))
      }
      current = ''
    } else {
      current = next
    }
  }

  if (current) lines.push(current)
  return lines.length ? lines : ['-']
}

function charsForWidth(width: number, fontSize: number) {
  return Math.max(6, Math.floor(width / (fontSize * 0.5)))
}

function buildReceiptPdf(options: ReceiptPdfOptions) {
  const pages: string[][] = [[]]
  let commands = pages[0]
  let y = pageHeight - margin
  const bottomMargin = 96

  const drawText = (text: string, x: number, currentY: number, size = 9, bold = false) => {
    commands.push('BT')
    commands.push(`/${bold ? 'F2' : 'F1'} ${size} Tf`)
    commands.push(`${x} ${currentY} Td`)
    commands.push(`(${escapePdfText(text)}) Tj`)
    commands.push('ET')
  }

  const drawRight = (text: string, x: number, currentY: number, size = 9, bold = false) => {
    drawText(text, x - textWidth(text, size), currentY, size, bold)
  }

  const line = (currentY: number) => {
    commands.push(`${margin} ${currentY} m ${pageWidth - margin} ${currentY} l S`)
  }

  const newPage = () => {
    commands = ['0.08 w']
    pages.push(commands)
    y = pageHeight - margin
    drawText(`${options.title.toUpperCase()} - CONTINUAÇÃO`, margin, y, 11, true)
    y -= 12
    line(y)
    y -= 18
  }

  const ensureSpace = (height = 24) => {
    if (y - height >= bottomMargin) return
    newPage()
  }

  const columns = {
    code: { x: margin, width: 88 },
    description: { x: margin + 104, width: 218 },
    quantity: { x: margin + 360 },
    unit: { x: margin + 438 },
    total: { x: pageWidth - margin },
  }

  const drawItemsHeader = (title = 'ITENS') => {
    ensureSpace(42)
    drawText(title, margin, y, 10, true)
    y -= 15
    drawText('Código/SKU', columns.code.x, y, 7.5, true)
    drawText('Descrição', columns.description.x, y, 7.5, true)
    drawRight('Qtd.', columns.quantity.x, y, 7.5, true)
    drawRight('Unitário', columns.unit.x, y, 7.5, true)
    drawRight('Total', columns.total.x, y, 7.5, true)
    y -= 8
    line(y)
    y -= 12
  }

  commands.push('0.08 w')
  drawText('AVANCEOS - OFICINA AVANCE', margin, y, 15, true)
  y -= 19
  drawText(options.title.toUpperCase(), margin, y, 13, true)
  y -= 15
  drawText(options.subtitle, margin, y, 10)
  drawRight('Documento sem validade fiscal', pageWidth - margin, y, 9, true)
  y -= 12
  line(y)
  y -= 18

  drawText(`Documento: ${options.documentId}`, margin, y, 9)
  drawRight(`Emissão: ${options.emission}`, pageWidth - margin, y, 9)
  y -= 14
  drawText(`Operador: ${options.operator || 'Administrador do Sistema'}`, margin, y, 9)
  drawRight(`Método de pagamento: ${options.paymentMethod}`, pageWidth - margin, y, 9)
  y -= 14
  drawText(`Consumidor: ${options.consumer}`, margin, y, 9)

  for (const lineText of options.contextLines ?? []) {
    y -= 13
    drawText(lineText, margin, y, 9)
  }

  y -= 16
  line(y)
  y -= 18
  drawItemsHeader()

  if (options.items.length === 0) {
    drawText('Nenhum item informado.', margin, y, 8)
    y -= 16
  }

  for (const item of options.items) {
    const codeLines = wrapText(item.code || '-', charsForWidth(columns.code.width, 7.2))
    const descriptionLines = wrapText(item.description || '-', charsForWidth(columns.description.width, 7.3))
    const rowLines = Math.max(codeLines.length, descriptionLines.length, 1)
    const rowHeight = rowLines * 10 + 10

    if (y - rowHeight < bottomMargin) {
      newPage()
      drawItemsHeader('ITENS - CONTINUAÇÃO')
    }

    codeLines.forEach((lineText, index) => drawText(lineText, columns.code.x, y - index * 10, 7.2))
    descriptionLines.forEach((lineText, index) => drawText(lineText, columns.description.x, y - index * 10, 7.3))
    drawRight(item.quantity, columns.quantity.x, y, 7.4)
    drawRight(item.unitValue, columns.unit.x, y, 7.4)
    drawRight(item.totalValue, columns.total.x, y, 7.4)
    y -= rowHeight
    line(y + 4)
    y -= 7
  }

  ensureSpace(88)
  y -= 2
  line(y)
  y -= 18
  drawRight(`Subtotal: ${options.subtotal}`, columns.total.x, y, 10)
  y -= 14
  if (options.discount) {
    drawRight(`Desconto: ${options.discount}`, columns.total.x, y, 10)
    y -= 14
  }
  drawRight(`Total geral: ${options.total}`, columns.total.x, y, 12, true)
  y -= 15
  drawRight(`Método de pagamento: ${options.paymentMethod}`, columns.total.x, y, 10)

  pages.forEach((pageCommands, index) => {
    pageCommands.push(`${margin} 98 m ${pageWidth - margin} 98 l S`)
    pageCommands.push(`BT /F1 8 Tf ${margin} 82 Td (Documento gerado para fins acadêmicos e demonstrativos. Não possui validade fiscal.) Tj ET`)
    pageCommands.push(`BT /F1 8 Tf ${margin} 70 Td (Este comprovante não substitui documento fiscal oficial.) Tj ET`)
    pageCommands.push(`BT /F1 7.5 Tf ${pageWidth - margin - 70} 46 Td (Página ${index + 1} de ${pages.length}) Tj ET`)
  })

  const pageObjects: string[] = []
  const contentObjects: string[] = []
  const pageRefs: string[] = []
  const firstPageObject = 3
  const firstContentObject = firstPageObject + pages.length
  const font1Object = firstContentObject + pages.length
  const font2Object = font1Object + 1

  pages.forEach((pageCommands, index) => {
    const pageObject = firstPageObject + index
    const contentObject = firstContentObject + index
    const content = pageCommands.join('\n')
    pageRefs.push(`${pageObject} 0 R`)
    pageObjects.push(
      `${pageObject} 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${font1Object} 0 R /F2 ${font2Object} 0 R >> >> /Contents ${contentObject} 0 R >>
endobj`,
    )
    contentObjects.push(`${contentObject} 0 obj
<< /Length ${content.length} >>
stream
${content}
endstream
endobj`)
  })

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    `2 0 obj
<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pages.length} >>
endobj`,
    ...pageObjects,
    ...contentObjects,
    `${font1Object} 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>
endobj`,
    `${font2Object} 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>
endobj`,
  ]

  let offset = 9
  const xref = ['xref', `0 ${objects.length + 1}`, '0000000000 65535 f ']
  const body = objects.map((object) => {
    xref.push(`${String(offset).padStart(10, '0')} 00000 n `)
    offset += object.length + 1
    return object
  }).join('\n')

  return `%PDF-1.4
${body}
${[
    ...xref,
    'trailer',
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    'startxref',
    String(offset),
    '%%EOF',
  ].join('\n')}`
}
export function downloadReceiptPdf(options: ReceiptPdfOptions) {
  const blob = new Blob([binaryToBytes(buildReceiptPdf(options))], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = options.filename
  link.click()
  URL.revokeObjectURL(url)
}
