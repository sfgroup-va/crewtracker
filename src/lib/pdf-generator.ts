import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface PdfEntry {
  id: string
  start_time: string
  end_time: string
  duration: number
  description?: string | null
  is_billable?: boolean
  task?: { title: string } | null
  project?: { name: string; color?: string } | null
  client?: { name: string; color?: string } | null
}

interface PdfOptions {
  user: {
    name: string
    email: string
    role: string
    division: string
  }
  entries: PdfEntry[]
  fromDate: Date
  toDate: Date
}

// Indonesian day and month names
const DAYS_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

function formatDateId(date: Date): string {
  const day = date.getDate()
  const month = MONTHS_ID[date.getMonth()]
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function getDayName(iso: string): string {
  return DAYS_ID[new Date(iso).getDay()]
}

export async function generatePdf(opts: PdfOptions): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - margin * 2

  // Computed stats
  const totalHours = opts.entries.reduce((sum, e) => sum + (e.duration || 0), 0)
  const totalEntries = opts.entries.length
  const uniqueDays = new Set(opts.entries.map(e => new Date(e.start_time).toISOString().split('T')[0])).size
  const billableHours = opts.entries.filter(e => e.is_billable).reduce((sum, e) => sum + (e.duration || 0), 0)
  const periodText = `${formatDateId(opts.fromDate)} — ${formatDateId(opts.toDate)}`

  // ================================================================
  // ===== 1. HEADER BAR =====
  // ================================================================
  doc.setFillColor(37, 99, 235)
  doc.rect(0, 0, pageWidth, 38, 'F')

  // Logo icon
  doc.setFillColor(255, 255, 255)
  doc.circle(30, 19, 9, 'F')
  doc.setFillColor(37, 99, 235)
  doc.circle(30, 19, 6.5, 'F')
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(1.2)
  doc.line(30, 19, 30, 15.5)
  doc.line(30, 19, 33, 19)

  // Title
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Laporan Jam Kerja', 46, 15)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('CrewTracker — Sistem Pelacakan Waktu', 46, 21)

  const roleLabel = opts.user.role === 'CREW' ? 'Crew' : opts.user.role === 'CAPTAIN' ? 'Captain' : 'Admin'
  doc.setFontSize(8)
  doc.setTextColor(200, 220, 255)
  doc.text(`Peran: ${roleLabel}`, 46, 27)

  // ================================================================
  // ===== 2. USER INFO CARD =====
  // ================================================================
  const infoY = 48
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(margin, infoY, contentWidth, 22, 3, 3, 'F')

  // User name & info (left)
  doc.setTextColor(100, 116, 139)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('NAMA', margin + 6, infoY + 7)

  doc.setTextColor(15, 23, 42)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(opts.user.name, margin + 6, infoY + 14)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  doc.text(`${opts.user.email}  •  ${opts.user.division}`, margin + 6, infoY + 20)

  // ================================================================
  // ===== 3. PERIODE — SEPARATE CARD =====
  // ================================================================
  const periodeY = infoY + 28  // 76

  doc.setFillColor(241, 245, 249) // slate-100
  doc.roundedRect(margin, periodeY, contentWidth, 18, 3, 3, 'F')

  // Calendar icon accent bar
  doc.setFillColor(100, 116, 139) // slate-500
  doc.roundedRect(margin, periodeY, 3, 18, 1, 1, 'F')

  doc.setTextColor(100, 116, 139)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('PERIODE LAPORAN', margin + 10, periodeY + 6)

  doc.setTextColor(15, 23, 42)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(periodText, margin + 10, periodeY + 14)

  // ================================================================
  // ===== 4. TOTAL JAM — SEPARATE CARD =====
  // ================================================================
  const jamY = periodeY + 24  // 100

  doc.setFillColor(239, 246, 255) // blue-50
  doc.roundedRect(margin, jamY, contentWidth, 18, 3, 3, 'F')

  doc.setFillColor(37, 99, 235) // blue-600
  doc.roundedRect(margin, jamY, 3, 18, 1, 1, 'F')

  doc.setTextColor(100, 116, 139)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('TOTAL JAM KERJA', margin + 10, jamY + 6)

  doc.setTextColor(37, 99, 235)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(`${Math.round(totalHours * 100) / 100} jam`, margin + 10, jamY + 15)

  // Sub info on right side of the card
  doc.setTextColor(100, 116, 139)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Rata-rata: ${Math.round((totalHours / Math.max(1, uniqueDays)) * 100) / 100} jam/hari`, pageWidth - margin - 5, jamY + 8, { align: 'right' })
  doc.text(`Billable: ${Math.round(billableHours * 100) / 100} jam`, pageWidth - margin - 5, jamY + 15, { align: 'right' })

  // ================================================================
  // ===== 5. ENTRI — SEPARATE CARD =====
  // ================================================================
  const entriY = jamY + 24  // 124

  doc.setFillColor(236, 253, 245) // emerald-50
  doc.roundedRect(margin, entriY, contentWidth, 18, 3, 3, 'F')

  doc.setFillColor(16, 185, 129) // emerald-500
  doc.roundedRect(margin, entriY, 3, 18, 1, 1, 'F')

  doc.setTextColor(100, 116, 139)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('JUMLAH ENTRI', margin + 10, entriY + 6)

  doc.setTextColor(16, 185, 129)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(`${totalEntries} entri`, margin + 10, entriY + 15)

  // Sub info on right side
  doc.setTextColor(100, 116, 139)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`${uniqueDays} hari aktif dari periode ini`, pageWidth - margin - 5, entriY + 8, { align: 'right' })
  const daysInRange = Math.max(1, Math.ceil((opts.toDate.getTime() - opts.fromDate.getTime()) / 86400000))
  doc.text(`Periode: ${daysInRange} hari`, pageWidth - margin - 5, entriY + 15, { align: 'right' })

  // ================================================================
  // ===== 6. SUMMARY STATS ROW =====
  // ================================================================
  const statsY = entriY + 26  // 150

  const statsData = [
    { label: 'Total Jam', value: `${Math.round(totalHours * 100) / 100} jam`, color: [37, 99, 235] },
    { label: 'Rata-rata/Hari', value: `${Math.round((totalHours / Math.max(1, uniqueDays)) * 100) / 100} jam`, color: [16, 185, 129] },
    { label: 'Billable', value: `${Math.round(billableHours * 100) / 100} jam`, color: [139, 92, 246] },
    { label: 'Hari Aktif', value: `${uniqueDays} hari`, color: [245, 158, 11] },
  ]

  const cardWidth = (contentWidth - 18) / 4
  statsData.forEach((stat, i) => {
    const x = margin + i * (cardWidth + 6)
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(x, statsY, cardWidth, 20, 2, 2, 'F')
    doc.setFillColor(stat.color[0], stat.color[1], stat.color[2])
    doc.rect(x, statsY, cardWidth, 2, 'F')
    doc.setTextColor(100, 116, 139)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(stat.label.toUpperCase(), x + 4, statsY + 8)
    doc.setTextColor(15, 23, 42)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(stat.value, x + 4, statsY + 16)
  })

  // ================================================================
  // ===== 7. ENTRIES TABLE =====
  // ================================================================
  const tableY = statsY + 28

  if (opts.entries.length === 0) {
    doc.setTextColor(148, 163, 184)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text('Tidak ada catatan jam kerja pada periode ini.', pageWidth / 2, tableY + 30, {
      align: 'center',
    })
  } else {
    doc.setTextColor(15, 23, 42)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Detail Catatan Waktu', margin, tableY)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(148, 163, 184)
    doc.text(`${opts.entries.length} entri ditemukan`, margin, tableY + 5)

    const tableBody = opts.entries.map((entry, idx) => [
      String(idx + 1),
      formatTime(entry.start_time),
      formatTime(entry.end_time),
      `${Math.round((entry.duration || 0) * 60)} mnt`,
      entry.task?.title || '-',
      entry.project?.name || entry.client?.name || '-',
      entry.description || '-',
      entry.is_billable ? 'Ya' : 'Tidak',
    ])

    autoTable(doc, {
      startY: tableY + 8,
      head: [['#', 'Mulai', 'Selesai', 'Durasi', 'Tugas', 'Proyek/Klien', 'Deskripsi', 'Billable']],
      body: tableBody,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        lineColor: [226, 232, 240],
        lineWidth: 0.25,
        font: 'helvetica',
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: [255, 255, 255],
        fontSize: 7,
        fontStyle: 'bold',
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 16 },
        2: { cellWidth: 16 },
        3: { cellWidth: 16, halign: 'center' },
        4: { cellWidth: 35 },
        5: { cellWidth: 32 },
        6: { cellWidth: 50 },
        7: { cellWidth: 16, halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 7) {
          if (data.cell.raw === 'Ya') {
            data.cell.styles.textColor = [16, 185, 129]
          } else {
            data.cell.styles.textColor = [203, 213, 225]
          }
        }
      },
    })
  }

  // ================================================================
  // ===== 8. DAILY SUMMARY TABLE =====
  // ================================================================
  const dayMap = new Map<string, { date: string; dayName: string; entries: PdfEntry[] }>()
  opts.entries.forEach(entry => {
    const dateStr = new Date(entry.start_time).toISOString().split('T')[0]
    if (!dayMap.has(dateStr)) {
      dayMap.set(dateStr, {
        date: dateStr,
        dayName: getDayName(entry.start_time),
        entries: [],
      })
    }
    dayMap.get(dateStr)!.entries.push(entry)
  })

  if (dayMap.size > 0) {
    const dailySummary = Array.from(dayMap.values()).map(day => {
      const totalDayHours = day.entries.reduce((sum, e) => sum + (e.duration || 0), 0)
      const dayEntries = day.entries.length
      const billableDayHours = day.entries.filter(e => e.is_billable).reduce((sum, e) => sum + (e.duration || 0), 0)
      const d = new Date(day.date)
      return [
        `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`,
        day.dayName,
        `${dayEntries} entri`,
        `${Math.round(totalDayHours * 60)} menit`,
        `${Math.round(billableDayHours * 60)} menit`,
      ]
    })

    const currentY = (doc as any).lastAutoTable?.finalY || tableY + 100
    if (currentY > pageHeight - 60) {
      doc.addPage()
    }

    const dailyTableY = (doc as any).lastAutoTable?.finalY
      ? Math.min((doc as any).lastAutoTable.finalY + 12, pageHeight - 55)
      : pageHeight - 55

    autoTable(doc, {
      startY: dailyTableY,
      head: [['Tanggal', 'Hari', 'Jumlah Entri', 'Total Jam', 'Billable']],
      body: dailySummary,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        lineColor: [226, 232, 240],
        lineWidth: 0.25,
        font: 'helvetica',
      },
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 25 },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 25, halign: 'center' },
      },
    })

    const finalY = (doc as any).lastAutoTable?.finalY || dailyTableY + 40
    if (finalY + 10 < pageHeight - 15) {
      doc.setTextColor(15, 23, 42)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('Total Keseluruhan:', margin, finalY + 8)
      doc.text(`${Math.round(totalHours * 100) / 100} jam  |  ${totalEntries} entri  |  ${uniqueDays} hari aktif`, margin + 35, finalY + 8)
    }
  }

  // ================================================================
  // ===== 9. FOOTER =====
  // ================================================================
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    const footerY = pageHeight - 12
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.25)
    doc.line(margin, footerY - 2, pageWidth - margin, footerY - 2)

    doc.setTextColor(148, 163, 184)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    const generatedAt = new Date().toLocaleString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
    doc.text(`Digenerate pada: ${generatedAt}`, margin, footerY)
    doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth - margin, footerY, { align: 'right' })

    doc.setFontSize(6)
    doc.setTextColor(203, 213, 225)
    doc.text('CrewTracker', pageWidth / 2, footerY, { align: 'center' })
  }

  const pdfBase64 = doc.output('arraybuffer')
  return Buffer.from(pdfBase64)
}
