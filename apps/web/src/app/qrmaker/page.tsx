'use client'

import { useState, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Download, Mail, RotateCcw, Upload, X } from 'lucide-react'

export default function QRGeneratorPage() {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [generated, setGenerated] = useState(false)
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null)
  const qrRef = useRef<HTMLDivElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

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

  const mailtoLink =
    `mailto:${encodeURIComponent(to)}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault()
    setGenerated(true)
  }

  const handleReset = () => {
    setTo('')
    setSubject('')
    setBody('')
    setGenerated(false)
    setLogoDataUrl(null)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return

    const svgSize = 220
    const padding = 24
    const canvasSize = svgSize + padding * 2

    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(svg)
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
    const svgUrl = URL.createObjectURL(svgBlob)

    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = canvasSize
      canvas.height = canvasSize
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvasSize, canvasSize)
      ctx.drawImage(img, padding, padding, svgSize, svgSize)
      URL.revokeObjectURL(svgUrl)

      if (logoDataUrl) {
        const logoImg = new Image()
        logoImg.onload = () => {
          const logoSize = svgSize * 0.2
          const logoX = padding + (svgSize - logoSize) / 2
          const logoY = padding + (svgSize - logoSize) / 2
          // White backing circle
          ctx.fillStyle = '#ffffff'
          ctx.beginPath()
          ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 4, 0, Math.PI * 2)
          ctx.fill()
          ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize)

          const a = document.createElement('a')
          a.href = canvas.toDataURL('image/jpeg', 0.95)
          a.download = 'email-qr-code.jpg'
          a.click()
        }
        logoImg.src = logoDataUrl
      } else {
        const a = document.createElement('a')
        a.href = canvas.toDataURL('image/jpeg', 0.95)
        a.download = 'email-qr-code.jpg'
        a.click()
      }
    }
    img.src = svgUrl
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white mb-4 shadow-lg">
          <Mail className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Email QR Generator</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-md">
          Create a QR code that opens the email app with pre-filled details - free, no login required.
        </p>
      </div>

      <div className="w-full max-w-xl bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
        {!generated ? (
          <form onSubmit={handleGenerate} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Recipient Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="someone@example.com"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Customer Reply Form"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Body
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="e.g. Please attach a photo of the reply form before sending."
                rows={4}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
              />
            </div>

            {/* Logo upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Logo <span className="text-slate-400 font-normal">(optional - appears in center)</span>
              </label>
              {logoDataUrl ? (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700">
                  <img src={logoDataUrl} alt="Logo preview" className="w-10 h-10 object-contain rounded" />
                  <span className="flex-1 text-sm text-slate-600 dark:text-slate-300 truncate">Logo uploaded</span>
                  <button type="button" onClick={removeLogo} className="text-slate-400 hover:text-red-500 transition">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-lg py-4 cursor-pointer hover:border-indigo-400 transition text-sm text-slate-500 dark:text-slate-400">
                  <Upload className="w-4 h-4" />
                  Click to upload PNG, JPG, or SVG
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

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition text-sm shadow-sm"
            >
              Generate QR Code
            </button>
          </form>
        ) : (
          <div className="flex flex-col items-center space-y-6">
            {/* QR Preview */}
            <div ref={qrRef} className="p-4 bg-white rounded-xl shadow-inner border border-slate-100">
              <QRCodeSVG
                value={mailtoLink}
                size={220}
                bgColor="#ffffff"
                fgColor="#1e1b4b"
                level={logoDataUrl ? 'H' : 'M'}
                includeMargin={false}
                imageSettings={
                  logoDataUrl
                    ? {
                        src: logoDataUrl,
                        height: 44,
                        width: 44,
                        excavate: true,
                      }
                    : undefined
                }
              />
            </div>

            {/* Summary */}
            <div className="w-full rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 p-4 text-sm space-y-1.5">
              <p className="text-slate-500 dark:text-slate-400">
                <span className="font-medium text-slate-700 dark:text-slate-200">To: </span>
                {to}
              </p>
              {subject && (
                <p className="text-slate-500 dark:text-slate-400">
                  <span className="font-medium text-slate-700 dark:text-slate-200">Subject: </span>
                  {subject}
                </p>
              )}
              {body && (
                <p className="text-slate-500 dark:text-slate-400">
                  <span className="font-medium text-slate-700 dark:text-slate-200">Body: </span>
                  {body}
                </p>
              )}
            </div>

            <p className="text-xs text-slate-400 text-center">
              Scan with your phone camera - it will open the email app with the above details pre-filled.
            </p>

            {/* Actions */}
            <div className="flex gap-3 w-full">
              <button
                onClick={handleReset}
                className="flex-1 flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium py-2.5 rounded-lg transition text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition text-sm shadow-sm"
              >
                <Download className="w-4 h-4" />
                Download JPG
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-slate-400">
        Powered by{' '}
        <a
          href="http://mydailyworkspace.site/qrmaker"
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-500 hover:underline"
        >
          mydailyworkspace.site
        </a>
      </p>
    </div>
  )
}
