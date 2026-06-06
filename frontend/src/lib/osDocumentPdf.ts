import { formatCurrency, formatDateTimeBR, formatNumberBR } from '@/lib/formatters'
import { numeroOrdemServico, splitOsItems, totalDisplayOsItems } from '@/lib/osDisplay'
import type { DisplayOsItem } from '@/lib/osDisplay'
import type { OrdemServico } from '@/types/ordem-servico'

type PdfOptions = {
  ordem: OrdemServico
}

const pageWidth = 595
const pageHeight = 842
const margin = 38
const bottomMargin = 54

function cleanText(value: string) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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
      if (code > 255) return ''
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

function charsForWidth(width: number, fontSize: number) {
  return Math.max(6, Math.floor(width / (fontSize * 0.5)))
}

function wrapText(text: string | number | null | undefined, maxChars: number) {
  const words = cleanText(String(text || '-')).split(/\s+/)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars && current) {
      lines.push(current)
      current = word
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

function paymentLabel(status?: string) {
  if (status === 'PAGO') return 'Pago'
  if (status === 'CANCELADA') return 'Cancelado'
  return 'Pendente'
}

function buildAddress(ordem: OrdemServico) {
  const cliente = ordem.cliente
  return [cliente?.rua, cliente?.numero, cliente?.complemento, cliente?.bairro, cliente?.cidade, cliente?.estado]
    .filter(Boolean)
    .join(', ')
}

function buildOsDocumentPdf({ ordem }: PdfOptions) {
  const pages: string[][] = [[]]
  let commands = pages[0]
  let y = pageHeight - margin

  function newPage() {
    commands = []
    pages.push(commands)
    y = pageHeight - margin
  }

  function ensureSpace(height = 24) {
    if (y - height >= bottomMargin) return
    newPage()
  }

  function drawText(text: string, x: number, currentY: number, size = 8.5, bold = false) {
    commands.push('BT')
    commands.push(`/${bold ? 'F2' : 'F1'} ${size} Tf`)
    commands.push(`${x} ${currentY} Td`)
    commands.push(`(${escapePdfText(text)}) Tj`)
    commands.push('ET')
  }

  function drawRight(text: string, x: number, currentY: number, size = 8.5, bold = false) {
    drawText(text, x - textWidth(text, size), currentY, size, bold)
  }

  function line(currentY: number) {
    commands.push(`${margin} ${currentY} m ${pageWidth - margin} ${currentY} l S`)
  }

  function sectionTitle(title: string) {
    ensureSpace(32)
    y -= 8
    drawText(title.toUpperCase(), margin, y, 9.5, true)
    y -= 8
    line(y)
    y -= 14
  }

  function keyValue(label: string, value?: string | number | null, x = margin, widthChars = 42) {
    ensureSpace(16)
    const text = `${label}: ${value || '-'}`
    for (const [index, wrapped] of wrapText(text, widthChars).entries()) {
      drawText(wrapped, x, y, index === 0 ? 8.5 : 8)
      y -= 11
    }
  }

  function paragraph(label: string, value?: string | null) {
    ensureSpace(32)
    drawText(label, margin, y, 8.5, true)
    y -= 12
    for (const lineText of wrapText(value || '-', 96)) {
      ensureSpace(12)
      drawText(lineText, margin, y, 8)
      y -= 11
    }
    y -= 4
  }

  function itemTable(title: string, empty: string, rows: DisplayOsItem[]) {
    sectionTitle(title)
    if (rows.length === 0) {
      keyValue(empty, '')
      return
    }

    const isProductTable = title.toLowerCase().includes('produto') || title.toLowerCase().includes('peça')
    const columns = {
      code: { x: margin, width: 58, label: isProductTable ? 'Código/SKU' : 'Código' },
      name: { x: margin + 66, width: 126, label: isProductTable ? 'Produto' : 'Nome' },
      description: { x: margin + 200, width: 164, label: 'Descrição' },
      quantity: { x: margin + 390, label: 'Qtd' },
      unit: { x: margin + 462, label: 'Unitário' },
      total: { x: pageWidth - margin, label: 'Total' },
    }

    function header() {
      ensureSpace(34)
      drawText(columns.code.label, columns.code.x, y, 7.5, true)
      drawText(columns.name.label, columns.name.x, y, 7.5, true)
      drawText(columns.description.label, columns.description.x, y, 7.5, true)
      drawRight(columns.quantity.label, columns.quantity.x, y, 7.5, true)
      drawRight(columns.unit.label, columns.unit.x, y, 7.5, true)
      drawRight(columns.total.label, columns.total.x, y, 7.5, true)
      y -= 8
      line(y)
      y -= 12
    }

    header()

    for (const item of rows) {
      const codeLines = wrapText(item.codigo || '-', charsForWidth(columns.code.width, 7.3)).slice(0, 3)
      const nameLines = wrapText(item.nome || '-', charsForWidth(columns.name.width, 7.5))
      const descriptionLines = wrapText(item.descricao || '-', charsForWidth(columns.description.width, 7.3))
      const rowLines = Math.max(codeLines.length, nameLines.length, descriptionLines.length, 1)
      const rowHeight = rowLines * 10 + 9

      if (y - rowHeight < bottomMargin) {
        newPage()
        drawText(title.toUpperCase(), margin, y, 9.5, true)
        y -= 14
        header()
      }

      codeLines.forEach((lineText, index) => drawText(lineText, columns.code.x, y - index * 10, 7.3))
      nameLines.forEach((lineText, index) => drawText(lineText, columns.name.x, y - index * 10, index === 0 ? 7.7 : 7.3, index === 0))
      descriptionLines.forEach((lineText, index) => drawText(lineText, columns.description.x, y - index * 10, 7.3))
      drawRight(formatNumberBR(item.quantidade), columns.quantity.x, y, 7.5)
      drawRight(formatCurrency(item.valorUnitario), columns.unit.x, y, 7.5)
      drawRight(formatCurrency(item.valorTotal), columns.total.x, y, 7.5)
      y -= rowHeight
      line(y + 5)
      y -= 5
    }
  }

  const numero = String(numeroOrdemServico(ordem))
  const itens = splitOsItems(ordem.itens ?? [])
  const totalServicos = totalDisplayOsItems(itens.servicos)
  const totalProdutos = totalDisplayOsItems(itens.produtos)
  const desconto = Number(ordem.descontoAplicado || 0)
  const total = Number(ordem.valorFinal || 0) || totalServicos + totalProdutos - desconto
  const veiculo = ordem.veiculo

  commands.push('0.08 w')
  drawText('AvanceOS', margin, y, 18, true)
  drawRight('Documento operacional - não fiscal', pageWidth - margin, y + 2, 8.5, true)
  y -= 19
  drawText('Oficina Avance', margin, y, 11, true)
  y -= 15
  drawText('Comprovante da Ordem de Serviço', margin, y, 14, true)
  y -= 13
  drawText('Documento operacional de registro de atendimento, diagnóstico, serviços, peças/produtos e valores.', margin, y, 8.5)
  y -= 10
  line(y)
  y -= 16

  keyValue('Número da OS', numero, margin, 36)
  y += 11
  keyValue('Emissão', formatDateTimeBR(new Date()), 250, 38)
  keyValue('Status da OS', ordem.status, margin, 36)
  y += 11
  keyValue('Situação de pagamento', paymentLabel(ordem.status), 250, 38)

  sectionTitle('Dados da Oficina')
  keyValue('Oficina', 'Oficina Avance')
  keyValue('CNPJ demonstrativo', '00.000.000/0001-00')
  keyValue('Endereço demonstrativo', 'Rua da Oficina, 100 - São Paulo/SP')
  keyValue('Contato demonstrativo', '(11) 0000-0000 | contato@oficinaavance.com.br')

  sectionTitle('Dados do Cliente')
  keyValue('Nome', ordem.cliente?.nome)
  keyValue('CPF/CNPJ', ordem.cliente?.cpf_cnpj || ordem.cliente?.cpfCnpj || ordem.cliente?.cpf || ordem.cliente?.documento)
  keyValue('Telefone', ordem.cliente?.telefone)
  keyValue('E-mail', ordem.cliente?.email)
  keyValue('Endereço', buildAddress(ordem))

  sectionTitle('Dados do Veículo')
  keyValue('Marca', veiculo?.marca)
  keyValue('Modelo', veiculo?.modelo || ordem.modeloVeiculo)
  keyValue('Placa', veiculo?.placa || ordem.placaVeiculo)
  keyValue('Cor', veiculo?.cor)
  keyValue('Ano', veiculo?.ano)
  keyValue('Quilometragem', veiculo?.quilometragem === null || veiculo?.quilometragem === undefined ? '-' : formatNumberBR(veiculo.quilometragem))

  sectionTitle('Relato e Diagnóstico')
  paragraph('Relato do cliente', ordem.descricao)
  paragraph('Diagnóstico técnico', ordem.diagnostico)
  paragraph('Observações internas', ordem.relatoMecanico)

  itemTable('Serviços', 'Nenhum serviço registrado.', itens.servicos)
  itemTable('Peças/produtos', 'Nenhuma peça ou produto registrado.', itens.produtos)

  sectionTitle('Resumo Financeiro')
  drawRight(`Total de serviços: ${formatCurrency(totalServicos)}`, pageWidth - margin, y, 9)
  y -= 13
  drawRight(`Total de peças/produtos: ${formatCurrency(totalProdutos)}`, pageWidth - margin, y, 9)
  y -= 13
  drawRight(`Desconto: ${formatCurrency(desconto)}`, pageWidth - margin, y, 9)
  y -= 13
  drawRight(`Total geral: ${formatCurrency(total)}`, pageWidth - margin, y, 12, true)
  y -= 15
  drawRight(`Situação de pagamento: ${paymentLabel(ordem.status)}`, pageWidth - margin, y, 9)

  sectionTitle('Avisos')
  paragraph(
    'Uso do documento',
    'Este documento registra as informações operacionais da Ordem de Serviço. Para validade formal, recomenda-se assinatura ou aceite do cliente. Este documento não substitui documento fiscal.',
  )
  paragraph('Finalidade', 'Documento gerado para fins acadêmicos e demonstrativos no projeto AvanceOS.')

  ensureSpace(72)
  y -= 16
  commands.push(`${margin} ${y} m ${margin + 200} ${y} l S`)
  commands.push(`${pageWidth - margin - 200} ${y} m ${pageWidth - margin} ${y} l S`)
  y -= 12
  drawText('Assinatura do cliente', margin + 42, y, 8)
  drawText('Assinatura da oficina', pageWidth - margin - 158, y, 8)
  y -= 16
  drawText('Data: ____/____/________', margin, y, 8)

  pages.forEach((pageCommands, index) => {
    pageCommands.push(`BT /F1 7.5 Tf ${pageWidth - margin - 70} 24 Td (Pagina ${index + 1} de ${pages.length}) Tj ET`)
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
      `${pageObject} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${font1Object} 0 R /F2 ${font2Object} 0 R >> >> /Contents ${contentObject} 0 R >>\nendobj`,
    )
    contentObjects.push(`${contentObject} 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj`)
  })

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    `2 0 obj\n<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pages.length} >>\nendobj`,
    ...pageObjects,
    ...contentObjects,
    `${font1Object} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj`,
    `${font2Object} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj`,
  ]

  let offset = 9
  const xref = ['xref', `0 ${objects.length + 1}`, '0000000000 65535 f ']
  const body = objects.map((object) => {
    xref.push(`${String(offset).padStart(10, '0')} 00000 n `)
    offset += object.length + 1
    return object
  }).join('\n')

  return `%PDF-1.4\n${body}\n${[
    ...xref,
    'trailer',
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    'startxref',
    String(offset),
    '%%EOF',
  ].join('\n')}`
}

export function downloadOsDocumentPdf(options: PdfOptions) {
  const numero = String(numeroOrdemServico(options.ordem)).replace(/\D/g, '') || String(numeroOrdemServico(options.ordem))
  const filename = `avanceos-os-${numero.padStart(6, '0')}-comprovante.pdf`
  const blob = new Blob([binaryToBytes(buildOsDocumentPdf(options))], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
