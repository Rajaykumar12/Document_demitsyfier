import React from 'react'
import UploadForm from './components/UploadForm'

export default function App() {
  return (
    <div className="min-h-screen bg-base-200 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold">Document Demystifier</h1>
          <p className="text-sm text-base-content/60">Auto Mode — text extraction then OCR as fallback</p>
        </div>

        <div className="card bg-base-100 shadow-lg p-6">
          <UploadForm />
        </div>
      </div>
    </div>
  )
}
