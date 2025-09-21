import React, { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const MAX_MB = 50;

export default function UploadForm() {
  const [file, setFile] = useState(null);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // {type:'error'|'info'|'success', text}
  const [result, setResult] = useState(null);

  function onFileChange(e) {
    const f = e.target.files[0];
    if (!f) return setFile(null);
    const sizeMB = f.size / 1024 / 1024;
    if (sizeMB > MAX_MB) {
      setStatus({ type: 'error', text: `File too large (${sizeMB.toFixed(2)} MB). Max ${MAX_MB} MB.` });
      e.target.value = null;
      setFile(null);
      return;
    }
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      setStatus({ type: 'error', text: 'Only PDF files are allowed.' });
      e.target.value = null;
      setFile(null);
      return;
    }
    setStatus({ type: 'info', text: `Selected ${f.name} (${sizeMB.toFixed(2)} MB)` });
    setFile(f);
  }

  async function analyze(e) {
    e.preventDefault();
    if (!file) return setStatus({ type: 'error', text: 'Please select a PDF first.' });

    setLoading(true);
    setStatus({ type: 'info', text: 'Analyzing document… this can take a while for scanned PDFs.' });
    setResult(null);

    try {
      const fd = new FormData();
      fd.append('file', file);
      if (question.trim()) fd.append('question', question.trim());

      const res = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        body: fd
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus({ type: 'error', text: data.error || 'Server error' });
        setResult(null);
      } else {
        setStatus({ type: 'success', text: 'Analysis complete.' });
        setResult(data);
      }
    } catch (err) {
      setStatus({ type: 'error', text: `Connection error: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function checkHealth() {
    setStatus({ type: 'info', text: 'Checking server health…' });
    try {
      const res = await fetch(`${API_BASE}/health`);
      const data = await res.json();
      setStatus({ type: 'info', text: `Server: ${data.status}; Tesseract: ${data.tesseract}; API Key: ${data.api_key}` });
    } catch (err) {
      setStatus({ type: 'error', text: `Health check failed: ${err.message}` });
    }
  }

  return (
    <>
      <form onSubmit={analyze} className="space-y-4">
        <div className="form-control">
          <label className="label"><span className="label-text">Upload PDF</span></label>
          <input type="file" accept=".pdf" onChange={onFileChange} className="file-input file-input-bordered w-full" />
        </div>

        <div className="form-control">
          <label className="label"><span className="label-text">Ask a question (optional)</span></label>
          <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="e.g. What are the main points?" className="input input-bordered w-full" />
        </div>

        <div className="flex gap-3">
          <button type="submit" className={`btn btn-primary ${loading ? 'loading' : ''}`} disabled={loading}>
            {loading ? 'Processing...' : 'Analyze Document'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={checkHealth}>Health Check</button>
        </div>
      </form>

      <div className="mt-4">
        {status && (
          <div className={`alert ${status.type === 'error' ? 'alert-error' : status.type === 'success' ? 'alert-success' : 'alert-info'}`}>
            <div>{status.text}</div>
          </div>
        )}
      </div>

      {result && (
        <div className="mt-4 space-y-4">
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="card-title">✅ Analysis Result</h2>
              <p>
                <strong>File:</strong> {result.info.filename} &nbsp;|&nbsp;
                <strong>Pages:</strong> {result.info.pages} &nbsp;|&nbsp;
                <strong>Words:</strong> {result.info.words}
                <span className={`ml-3 badge ${result.info.method === 'OCR' ? 'badge-info' : 'badge-success'}`}>{result.info.method}</span>
              </p>
              <div>
                <h3 className="font-semibold mt-2">AI Explanation</h3>
                <div className="prose max-w-none whitespace-pre-wrap p-3 bg-base-200 rounded">{result.explanation}</div>
              </div>

              {result.extracted_text && (
                <details className="mt-3">
                  <summary className="link">📄 View Extracted Text ({result.extracted_text.length} chars)</summary>
                  <pre className="bg-base-200 p-3 rounded mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-sm">{result.extracted_text}</pre>
                </details>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
