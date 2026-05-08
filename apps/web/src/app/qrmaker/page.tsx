'use client'

import { useState, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Download, Mail, RotateCcw, Upload, X, Sparkles, Palette, ScanLine } from 'lucide-react'

const PRESET_COLORS = [
  { fg: '#1e1b4b', bg: '#ffffff', label: 'Classic' },
  { fg: '#0f172a', bg: '#f8fafc', label: 'Slate' },
  { fg: '#4f46e5', bg: '#eef2ff', label: 'Indigo' },
  { fg: '#0369a1', bg: '#f0f9ff', label: 'Sky' },
  { fg: '#065f46', bg: '#ecfdf5', label: 'Emerald' },
  { fg: '#7c3aed', bg: '#faf5ff', label: 'Violet' },
  { fg: '#be123c', bg: '#fff1f2', label: 'Rose' },
  { fg: '#92400e', bg: '#fffbeb', label: 'Amber' },
]

export default function QRGeneratorPage() {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null)
  const [fgColor, setFgColor] = useState('#1e1b4b')
  const [bgColor, setBgColor] = useState('#ffffff')
  const [showFrame, setShowFrame] = useState(true)
  const [frameLabel, setFrameLabel] = useState('Scan to Email')
  const [activePreset, setActivePreset] = useState(0)

  const qrRef = useRef<HTMLDivElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const mailtoLink = to
    ? `mailto:${encodeURIComponent(to)}` +
      (subject ? `?subject=${encodeURIComponent(subject)}` : '') +
      (subject && body ? `&body=${encodeURIComponent(body)}` : !subject && body ? `?body=${encodeURIComponent(body)}` : '')
    : 'mailto:recipient@example.com'

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setLogoDataUrl(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const removeLogo = () => {
    setLogoDataUrl(null)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  const applyPreset = (index: number) => {
    setActivePreset(index)
    setFgColor(PRESET_COLORS[index].fg)
    setBgColor(PRESET_COLORS[index].bg)
  }

  const handleReset = () => {
    setTo('')
    setSubject('')
    setBody('')
    setLogoDataUrl(null)
    setFgColor('#1e1b4b')
    setBgColor('#ffffff')
    setShowFrame(true)
    setFrameLabel('Scan to Email')
    setActivePreset(0)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return

    const qrSize = 260
    const framePadding = showFrame ? 48 : 20
    const labelHeight = showFrame ? 40 : 0
    const canvasW = qrSize + framePadding * 2
    const canvasH = qrSize + framePadding * 2 + labelHeight
    const radius = 20

    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(svg)
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
    const svgUrl = URL.createObjectURL(svgBlob)

    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = canvasW
      canvas.height = canvasH
      const ctx = canvas.getContext('2d')!

      // White base
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvasW, canvasH)

      if (showFrame) {
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.07)'
        ctx.beginPath()
        ;(ctx as any).roundRect(4, 4, canvasW - 4, canvasH - 4, radius)
        ctx.fill()

        // Card
        ctx.fillStyle = bgColor
        ctx.beginPath()
        ;(ctx as any).roundRect(0, 0, canvasW - 4, canvasH - 4, radius)
        ctx.fill()

        // Border
        ctx.strokeStyle = fgColor + '22'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ;(ctx as any).roundRect(0, 0, canvasW - 4, canvasH - 4, radius)
        ctx.stroke()

        // Corner brackets
        const bSize = 16
        const bGap = 10
        ctx.strokeStyle = fgColor
        ctx.lineWidth = 2.5
        ctx.lineCap = 'round'
        const corners: [number, number, number][] = [
          [bGap, bGap, 0],
          [canvasW - 4 - bGap - bSize, bGap, 1],
          [bGap, canvasH - 4 - bGap - bSize - labelHeight, 2],
          [canvasW - 4 - bGap - bSize, canvasH - 4 - bGap - bSize - labelHeight, 3],
        ]
        corners.forEach(([cx, cy, i]) => {
          ctx.beginPath()
          if (i === 0) { ctx.moveTo(cx, cy + bSize); ctx.lineTo(cx, cy); ctx.lineTo(cx + bSize, cy) }
          if (i === 1) { ctx.moveTo(cx, cy); ctx.lineTo(cx + bSize, cy); ctx.lineTo(cx + bSize, cy + bSize) }
          if (i === 2) { ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + bSize); ctx.lineTo(cx + bSize, cy + bSize) }
          if (i === 3) { ctx.moveTo(cx + bSize, cy); ctx.lineTo(cx + bSize, cy + bSize); ctx.lineTo(cx, cy + bSize) }
          ctx.stroke()
        })

        // Label
        if (frameLabel) {
          ctx.fillStyle = fgColor
          ctx.font = 'bold 12px system-ui, sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(frameLabel.toUpperCase(), (canvasW - 4) / 2, canvasH - 4 - labelHeight / 2)
        }
      }

      ctx.drawImage(img, framePadding, framePadding, qrSize, qrSize)
      URL.revokeObjectURL(svgUrl)

      const finish = () => {
        const a = document.createElement('a')
        a.href = canvas.toDataURL('image/jpeg', 0.96)
        a.download = 'qr-code.jpg'
        a.click()
      }

      if (logoDataUrl) {
        const logoImg = new Image()
        logoImg.onload = () => {
          const logoSize = qrSize * 0.2
          const logoX = framePadding + (qrSize - logoSize) / 2
          const logoY = framePadding + (qrSize - logoSize) / 2
          ctx.fillStyle = '#ffffff'
          ctx.beginPath()
          ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 5, 0, Math.PI * 2)
          ctx.fill()
          ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize)
          finish()
        }
        logoImg.src = logoDataUrl
      } else {
        finish()
      }
    }
    img.src = svgUrl
  }

  const isValid = to.length > 0

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">
      {/* Top nav */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0f0f1a]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Mail className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm tracking-tight">QR Maker</span>
          <span className="text-[10px] font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">FREE</span>
        </div>
        <a
          href="http://mydailyworkspace.site"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-white/30 hover:text-white/60 transition"
        >
          mydailyworkspace.site
        </a>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1 mb-4">
            <Sparkles className="w-3 h-3" />
            Generate in seconds · No login needed
          </div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-br from-white to-white/50 bg-clip-text text-transparent">
            Email QR Code Generator
          </h1>
          <p className="mt-3 text-white/40 text-sm max-w-sm mx-auto">
            Scan once - opens the email app with recipient, subject, and body pre-filled.
          </p>
        </div>

        {/* Main split layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* LEFT - Config */}
          <div className="space-y-4">

            {/* Email fields */}
            <div className="bg-white/5 border border-white/[0.08] rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Mail className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-semibold text-white/80">Email Details</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/40 mb-1.5 uppercase tracking-wide">
                  Recipient <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="someone@example.com"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/40 mb-1.5 uppercase tracking-wide">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Customer Reply Form"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/40 mb-1.5 uppercase tracking-wide">Body</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="e.g. Please attach a photo before sending."
                  rows={3}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 transition resize-none"
                />
              </div>
            </div>

            {/* Style */}
            <div className="bg-white/5 border border-white/[0.08] rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Palette className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-semibold text-white/80">Style</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wide">Color Preset</label>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_COLORS.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => applyPreset(i)}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition ${
                        activePreset === i
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-lg shadow"
                        style={{ background: `linear-gradient(135deg, ${p.fg} 50%, ${p.bg} 50%)` }}
                      />
                      <span className="text-[10px] text-white/40">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-white/40 mb-1.5 uppercase tracking-wide">QR Color</label>
                  <div className="flex items-center gap-2 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2">
                    <input
                      type="color"
                      value={fgColor}
                      onChange={(e) => { setFgColor(e.target.value); setActivePreset(-1) }}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-none outline-none"
                    />
                    <span className="text-xs text-white/30 font-mono">{fgColor}</span>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-white/40 mb-1.5 uppercase tracking-wide">BG Color</label>
                  <div className="flex items-center gap-2 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => { setBgColor(e.target.value); setActivePreset(-1) }}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-none outline-none"
                    />
                    <span className="text-xs text-white/30 font-mono">{bgColor}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm text-white/60">Show Frame</p>
                  <p className="text-xs text-white/25">Corner brackets + scan label</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFrame(!showFrame)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${showFrame ? 'bg-indigo-600' : 'bg-white/10'}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${showFrame ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
              </div>

              {showFrame && (
                <div>
                  <label className="block text-xs font-medium text-white/40 mb-1.5 uppercase tracking-wide">Frame Label</label>
                  <input
                    type="text"
                    value={frameLabel}
                    onChange={(e) => setFrameLabel(e.target.value)}
                    maxLength={30}
                    placeholder="e.g. Scan to Email"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 transition"
                  />
                </div>
              )}
            </div>

            {/* Logo upload */}
            <div className="bg-white/5 border border-white/[0.08] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <Upload className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-semibold text-white/80">Center Logo</span>
                <span className="text-xs text-white/25 ml-1">optional</span>
              </div>

              {logoDataUrl ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/10">
                  <img src={logoDataUrl} alt="Logo" className="w-10 h-10 object-contain rounded-lg bg-white p-1" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/60">Logo uploaded</p>
                    <p className="text-xs text-white/25">Appears in QR center</p>
                  </div>
                  <button type="button" onClick={removeLogo} className="text-white/25 hover:text-red-400 transition p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 w-full border-2 border-dashed border-white/10 rounded-xl py-6 cursor-pointer hover:border-indigo-500/40 hover:bg-indigo-500/5 transition group">
                  <Upload className="w-5 h-5 text-white/20 group-hover:text-indigo-400 transition" />
                  <span className="text-sm text-white/30 group-hover:text-white/50 transition">Click to upload logo</span>
                  <span className="text-xs text-white/20">PNG · JPG · SVG · WebP</span>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </label>
              )}
            </div>
          </div>

          {/* RIGHT - Live Preview */}
          <div className="lg:sticky lg:top-24 space-y-4">
            <div className="bg-white/5 border border-white/[0.08] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <ScanLine className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-semibold text-white/80">Live Preview</span>
                {isValid && (
                  <span className="ml-auto text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-full">Ready</span>
                )}
              </div>

              <div className="flex justify-center">
                <div
                  className="relative rounded-2xl p-5 shadow-2xl transition-all duration-300"
                  style={{ background: bgColor }}
                >
                  {showFrame && (
                    <>
                      {[
                        'top-3 left-3 border-t-2 border-l-2 rounded-tl-lg',
                        'top-3 right-3 border-t-2 border-r-2 rounded-tr-lg',
                        'bottom-[2.2rem] left-3 border-b-2 border-l-2 rounded-bl-lg',
                        'bottom-[2.2rem] right-3 border-b-2 border-r-2 rounded-br-lg',
                      ].map((cls, i) => (
                        <span key={i} className={`absolute w-5 h-5 ${cls}`} style={{ borderColor: fgColor }} />
                      ))}
                    </>
                  )}

                  <div ref={qrRef}>
                    <QRCodeSVG
                      value={mailtoLink}
                      size={220}
                      bgColor={bgColor}
                      fgColor={fgColor}
                      level={logoDataUrl ? 'H' : 'M'}
                      includeMargin={false}
                      imageSettings={
                        logoDataUrl
                          ? { src: logoDataUrl, height: 44, width: 44, excavate: true }
                          : undefined
                      }
                    />
                  </div>

                  {showFrame && frameLabel && (
                    <p
                      className="text-center text-[11px] font-bold tracking-[0.15em] mt-2 uppercase"
                      style={{ color: fgColor }}
                    >
                      {frameLabel}
                    </p>
                  )}
                </div>
              </div>

              {isValid && (
                <div className="mt-5 rounded-xl bg-white/[0.04] border border-white/[0.08] p-3.5 space-y-1.5">
                  <p className="text-xs text-white/60">
                    <span className="text-white/25 mr-1.5">To</span>{to}
                  </p>
                  {subject && (
                    <p className="text-xs text-white/60">
                      <span className="text-white/25 mr-1.5">Subject</span>{subject}
                    </p>
                  )}
                  {body && (
                    <p className="text-xs text-white/40 truncate">
                      <span className="text-white/25 mr-1.5">Body</span>{body}
                    </p>
                  )}
                </div>
              )}

              {!isValid && (
                <p className="text-center text-xs text-white/20 mt-4">
                  Enter a recipient email to activate the QR
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition text-sm font-medium"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
              <button
                onClick={handleDownload}
                disabled={!isValid}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold text-sm transition shadow-lg shadow-indigo-500/20"
              >
                <Download className="w-4 h-4" />
                Download JPG
              </button>
            </div>

            <p className="text-center text-xs text-white/20">
              Free forever · No login · No watermark
            </p>
          </div>
        </div>
      </div>

      <footer className="pb-8 text-center text-xs text-white/30">
        Powered by{' '}
        <a
          href="http://mydailyworkspace.site"
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-300 hover:text-indigo-200 transition"
        >
          mydailyworkspace.site
        </a>
      </footer>
    </div>
  )
}

