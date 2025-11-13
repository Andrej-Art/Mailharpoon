import { useState } from 'react'
import axios from 'axios'

const API_URL = 'http://localhost:8000'

function App() {
  const [emailText, setEmailText] = useState('')
  const [url, setUrl] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await axios.post(`${API_URL}/predict`, {
        text: emailText,
        url: url || null
      })
      setResult(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setEmailText('')
    setUrl('')
    setResult(null)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Phishing Detector
          </h1>
          <p className="text-gray-600">
            Analysiere E-Mails und URLs auf Phishing-Verdacht
          </p>
        </div>

        {/* Formular */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* E-Mail-Text */}
            <div>
              <label htmlFor="emailText" className="block text-sm font-medium text-gray-700 mb-2">
                E-Mail-Text *
              </label>
              <textarea
                id="emailText"
                value={emailText}
                onChange={(e) => setEmailText(e.target.value)}
                rows={6}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Füge hier den E-Mail-Text ein..."
              />
            </div>

            {/* URL */}
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                URL (optional)
              </label>
              <input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="https://example.com"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-md font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Analysiere...' : 'Analysieren'}
              </button>
              {(result || error) && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-6 py-3 border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Zurücksetzen
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Fehler</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ergebnis */}
        {result && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Ergebnis</h2>
            
            {/* Label */}
            <div className="mb-4">
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium">
                {result.label === 'phish' ? (
                  <>
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                    <span className="text-red-800">Phishing</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    <span className="text-green-800">Legitim</span>
                  </>
                )}
              </span>
            </div>

            {/* Score */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Confidence Score</span>
                <span className="text-sm font-bold text-gray-900">{(result.score * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className={`h-4 rounded-full ${
                    result.label === 'phish' ? 'bg-red-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${result.score * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Explanation */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Erklärung</h3>
              <p className="text-gray-600">{result.explanation}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
