import React, { useState } from 'react';

// Assuming API_BASE is configured in your environment variables
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const MAX_MB = 50;

// A new, stylized component to display the analysis results
function AnalysisResult({ result }) {
  // Assuming the backend sends a styled HTML string in `result.explanation`
  return (
    <div className="mt-8 p-6 bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 text-white animate-fade-in-up">
      <h2 className="text-3xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
        Analysis Complete ✨
      </h2>

      <div className="mb-6 p-4 bg-gray-800 rounded-lg text-gray-300 flex flex-wrap items-center gap-4">
        <span><strong>File:</strong> {result.info.filename}</span>
        <span className="hidden md:inline">|</span>
        <span><strong>Pages:</strong> {result.info.pages}</span>
        <span className="hidden md:inline">|</span>
        <span><strong>Words:</strong> {result.info.words}</span>
        <span className={`ml-auto px-3 py-1 text-sm font-semibold rounded-full ${result.info.method === 'OCR' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'}`}>
          {result.info.method}
        </span>
      </div>

      <div>
        <h3 className="text-2xl font-semibold mb-3 text-gray-100">Summary:</h3>
        {/* This will render the styled HTML sent from your backend */}
        <div
          className="prose prose-invert max-w-none p-4 bg-gray-800 rounded-lg border border-gray-700"
          dangerouslySetInnerHTML={{ __html: result.explanation }}
        />
      </div>

      {result.extracted_text && (
        <details className="mt-6">
          <summary className="cursor-pointer text-lg font-medium text-purple-400 hover:text-purple-300 transition-colors">
            📄 View Extracted Text ({result.extracted_text.length} chars)
          </summary>
          <pre className="bg-gray-800 p-4 rounded-lg mt-2 max-h-72 overflow-auto whitespace-pre-wrap text-sm text-gray-400 border border-gray-700">
            {result.extracted_text}
          </pre>
        </details>
      )}
    </div>
  );
}


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
    setStatus({ type: 'info', text: 'Analyzing document… this can take a while.' });
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
        // Example: Backend sends HTML like "<h2>Key Points</h2><p>This is a summary.</p>"
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

      {result && <AnalysisResult result={result} />}
    </>
  );
}