'use client'

import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import authFetch from '../api/authentication/authFetch'

type UploadType = 'standard' | 'legacy'

const ACCEPTED_TYPES = ['csv', 'txt', 'json', 'ndjson', 'log']

export default function UploadPage() {
  const [uploadType, setUploadType] = useState<UploadType>('standard')
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase()
    return ACCEPTED_TYPES.includes(ext ?? '')
  }

  const handleFile = (f: File) => {
    setResult(null)
    if (!validateFile(f)) {
      setResult({ success: false, message: `Unsupported file type. Accepted: ${ACCEPTED_TYPES.join(', ')}` })
      return
    }
    setFile(f)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    const endpoint = uploadType === 'legacy' ? '/logs/upload/legacy' : '/logs/upload'

    try {
      await authFetch.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult({ success: true, message: `"${file.name}" uploaded successfully.` })
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? 'Upload failed. Please try again.'
      setResult({ success: false, message: detail })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Upload Logs</h1>
      <p className="text-slate-500 text-sm mb-8">
        Upload a log file to ingest it into the system. Accepted formats:{' '}
        <span className="font-mono">{ACCEPTED_TYPES.join(', ')}</span>
      </p>

      {/* Upload type toggle */}
      <div className="mb-6">
        <label className="text-sm font-medium text-slate-700 block mb-2">Log Type</label>
        <div className="inline-flex rounded-lg border bg-white shadow-sm overflow-hidden">
          <button
            onClick={() => setUploadType('standard')}
            className={`px-5 py-2 text-sm font-medium transition-colors ${
              uploadType === 'standard'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Standard
          </button>
          <button
            onClick={() => setUploadType('legacy')}
            className={`px-5 py-2 text-sm font-medium transition-colors border-l ${
              uploadType === 'legacy'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Legacy
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          {uploadType === 'legacy'
            ? 'Legacy logs will be processed through the AI normalisation pipeline.'
            : 'Standard logs are ingested and enriched directly.'}
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-colors p-12 text-center
          ${dragging
            ? 'border-slate-400 bg-slate-50'
            : file
            ? 'border-green-400 bg-green-50'
            : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50'
          }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.map(t => `.${t}`).join(',')}
          className="hidden"
          onChange={handleChange}
        />

        {file ? (
          <div className="flex flex-col items-center gap-2">
            <div className="text-3xl">📄</div>
            <p className="font-medium text-slate-800">{file.name}</p>
            <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
            <p className="text-xs text-slate-400 mt-1">Click or drag to replace</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <div className="text-4xl mb-1">☁️</div>
            <p className="font-medium">Drag & drop your file here</p>
            <p className="text-sm">or click to browse</p>
          </div>
        )}
      </div>

      {/* Result message */}
      {result && (
        <div
          className={`mt-4 px-4 py-3 rounded-lg text-sm font-medium border ${
            result.success
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {result.success ? '✓ ' : '✗ '}{result.message}
        </div>
      )}

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="mt-6 w-full py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium
          hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
      >
        {uploading ? 'Uploading…' : `Upload ${uploadType === 'legacy' ? 'Legacy ' : ''}Log`}
      </button>
    </div>
  )
}
