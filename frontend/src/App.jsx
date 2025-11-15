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
    
    // Validation: At least text or URL must be provided
    const trimmedText = emailText.trim()
    const trimmedUrl = url.trim()
    
    if (!trimmedText && !trimmedUrl) {
      setError('Please enter at least email text or URL')
      return
    }
    
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await axios.post(`${API_URL}/predict`, {
        text: trimmedText || null,
        url: trimmedUrl || null
      })
      setResult(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'An error occurred')
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
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-teal-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header mit Logo - Prominent */}
        <div className="text-center mb-12">
          <div className="flex justify-center items-center mb-8">
            <div className="relative">
              {/* Logo mit Halo-Effekt */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-teal-400/20 blur-3xl rounded-full"></div>
              <img 
                src="/Mailharpoon_image.png" 
                alt="Mailharpoon Phishing Detector Logo" 
                className="relative h-32 sm:h-40 md:h-48 w-auto object-contain drop-shadow-2xl"
              />
            </div>
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-gray-900 mb-4 tracking-tight">
            <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600 bg-clip-text text-transparent">
              Mailharpoon
            </span>
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed font-light">
            Protect yourself from phishing attacks
          </p>
          <p className="text-base text-gray-500 max-w-2xl mx-auto mt-3">
            Analyze emails and URLs for suspicious patterns with AI-powered technology
          </p>
        </div>

        {/* Formular - Modern & Clean */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/50 p-8 sm:p-10 mb-8">
          <form onSubmit={handleSubmit} className="space-y-7">
            {/* E-Mail-Text */}
            <div className="space-y-3">
              <label htmlFor="emailText" className="block text-base font-bold text-gray-800">
                <span className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-cyan-100 to-teal-100 rounded-xl">
                    <svg className="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span>Email Text</span>
                  <span className="text-sm font-normal text-gray-500">(optional)</span>
                </span>
              </label>
              <textarea
                id="emailText"
                value={emailText}
                onChange={(e) => setEmailText(e.target.value)}
                rows={7}
                className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-cyan-200 focus:border-cyan-400 transition-all duration-300 resize-none text-gray-800 placeholder-gray-400 hover:border-gray-300"
                placeholder="Enter the email text you want to analyze here..."
              />
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-medium">OR</span>
              </div>
            </div>

            {/* URL */}
            <div className="space-y-3">
              <label htmlFor="url" className="block text-base font-bold text-gray-800">
                <span className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <span>URL</span>
                  <span className="text-sm font-normal text-gray-500">(optional)</span>
                </span>
              </label>
              <input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-cyan-200 focus:border-cyan-400 transition-all duration-300 text-gray-800 placeholder-gray-400 hover:border-gray-300"
                placeholder="https://example.com"
              />
            </div>
            
            {/* Hinweis - Modern */}
            <div className="bg-gradient-to-r from-cyan-50 via-blue-50 to-teal-50 border-2 border-cyan-100 rounded-2xl p-5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="p-2 bg-white rounded-xl shadow-sm">
                    <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  <strong className="font-bold text-gray-900">Tip:</strong> Enter at least email text or URL. You can also test just a URL to check if it's safe.
                </p>
              </div>
            </div>

            {/* Buttons - Prominent CTA */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 group bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:from-cyan-700 hover:via-blue-700 hover:to-teal-700 focus:outline-none focus:ring-4 focus:ring-cyan-300 disabled:from-gray-400 disabled:via-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 disabled:transform-none active:translate-y-0"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Analyzing...</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Analyze now</span>
                  </span>
                )}
              </button>
              {(result || error) && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-8 py-5 border-2 border-gray-300 rounded-2xl font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-200 transition-all duration-300 hover:shadow-lg"
                >
                  Reset
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Error - Modern Alert */}
        {error && (
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-3xl p-6 mb-6 shadow-xl animate-in slide-in-from-top duration-300">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 p-2 bg-red-100 rounded-xl">
                <svg className="h-7 w-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1 pt-1">
                <h3 className="text-xl font-bold text-red-900 mb-2">Error occurred</h3>
                <p className="text-red-800 leading-relaxed">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Ergebnis - Prominent & Clear */}
        {result && (
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/50 p-8 sm:p-10 animate-in slide-in-from-bottom duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900">
                Analysis Result
              </h2>
              {result.label === 'phish' ? (
                <div className="flex items-center gap-3 bg-gradient-to-r from-red-100 to-orange-100 px-6 py-3 rounded-2xl border-2 border-red-200 shadow-lg">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-red-900 font-bold text-lg">⚠️ Warning</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-gradient-to-r from-green-100 to-emerald-100 px-6 py-3 rounded-2xl border-2 border-green-200 shadow-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-green-900 font-bold text-lg">✓ Safe</span>
                </div>
              )}
            </div>
            
            {/* Label - Large Badge */}
            <div className="mb-8">
              <div className={`inline-flex items-center px-8 py-4 rounded-2xl text-xl font-black shadow-lg ${
                result.label === 'phish' 
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white border-4 border-red-600' 
                  : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-4 border-green-600'
              }`}>
                {result.label === 'phish' ? (
                  <>
                    <span className="w-4 h-4 bg-white rounded-full mr-4 animate-pulse shadow-lg"></span>
                    <span>🚨 PHISHING DETECTED</span>
                  </>
                ) : (
                  <>
                    <span className="w-4 h-4 bg-white rounded-full mr-4 shadow-lg"></span>
                    <span>✓ LEGITIMATE</span>
                  </>
                )}
              </div>
            </div>

            {/* Score - Visual & Prominent */}
            <div className="mb-8 p-8 bg-gradient-to-br from-gray-50 via-white to-gray-50 rounded-3xl border-2 border-gray-200 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-bold text-gray-800">Confidence Score</span>
                <span className="text-4xl font-black text-gray-900">{((result.score * 100).toFixed(1))}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden shadow-inner mb-3">
                <div
                  className={`h-8 rounded-full transition-all duration-700 ease-out ${
                    result.label === 'phish' 
                      ? 'bg-gradient-to-r from-red-500 via-orange-500 to-red-600' 
                      : 'bg-gradient-to-r from-green-500 via-emerald-500 to-green-600'
                  }`}
                  style={{ width: `${result.score * 100}%` }}
                ></div>
              </div>
              <p className="text-sm font-semibold text-gray-600 text-center">
                {result.score >= 0.9 ? '⭐ Very high confidence' : 
                 result.score >= 0.7 ? '✅ High confidence' : 
                 result.score >= 0.5 ? '⚡ Moderate confidence' : 
                 '⚠️ Low confidence'}
              </p>
            </div>

            {/* Explanation - Modern Card */}
            <div className="bg-gradient-to-br from-cyan-50 via-blue-50 to-teal-50 border-2 border-cyan-200 rounded-3xl p-8 shadow-lg">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 p-3 bg-white rounded-2xl shadow-md">
                  <svg className="w-7 h-7 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Detailed Explanation</h3>
                  <p className="text-gray-800 leading-relaxed text-lg">{result.explanation}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
