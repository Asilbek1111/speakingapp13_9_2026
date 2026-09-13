'use client'

import { useState } from 'react'

interface Mistake {
  original: string
  correction: string
  explanation: string
}

interface EvaluationResult {
  totalScore: number
  cefrLevel: string
  mistakes: Mistake[]
  polishedAnswer: string
  nextQuestion: string
  spokenText: string
}

export default function SpeakingExamPage() {
  const [promptContext, setPromptContext] = useState(
    'Describe your hometown and what you like most about it.'
  )
  const [userText, setUserText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [result, setResult] = useState<EvaluationResult | null>(null)

  const handleEvaluate = async () => {
    if (!userText.trim() || isSubmitting) return

    setIsSubmitting(true)
    setErrorMsg('')
    setResult(null)

    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userText,
          context: promptContext,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Evaluation failed')
      }

      setResult(data)
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Multi-Level Speaking Practice
          </h1>
          <p className="text-sm text-slate-600">
            Submit your spoken transcript to receive instant CEFR scoring and feedback.
          </p>
        </div>

        {/* Input Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Exam Question / Prompt
            </label>
            <input
              type="text"
              value={promptContext}
              onChange={(e) => setPromptContext(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Your Answer Transcript
            </label>
            <textarea
              rows={4}
              value={userText}
              onChange={(e) => setUserText(e.target.value)}
              placeholder="Type or transcribe candidate's response here..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {errorMsg}
            </div>
          )}

          <button
            onClick={handleEvaluate}
            disabled={isSubmitting || userText.trim().split(/\s+/).length < 3}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Evaluating Response...' : 'Evaluate Answer'}
          </button>
        </div>

        {/* Results Card */}
        {result && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
            {/* Top Scores Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs text-slate-500 uppercase font-semibold block">
                  Total Score
                </span>
                <span className="text-3xl font-extrabold text-blue-600">
                  {result.totalScore}{' '}
                  <span className="text-lg font-normal text-slate-400">/ 75</span>
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 uppercase font-semibold block">
                  CEFR Level
                </span>
                <span className="inline-block mt-1 px-3 py-1 bg-blue-100 text-blue-800 font-bold rounded-full text-sm">
                  {result.cefrLevel}
                </span>
              </div>
            </div>

            {/* Examiner Summary */}
            {result.spokenText && (
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-1">
                  Examiner Feedback
                </h3>
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                  {result.spokenText}
                </p>
              </div>
            )}

            {/* Mistakes Breakdown */}
            {result.mistakes && result.mistakes.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-3">
                  Corrections & Explanations
                </h3>
                <div className="space-y-3">
                  {result.mistakes.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 border border-amber-200 bg-amber-50/50 rounded-lg text-sm space-y-1"
                    >
                      <p className="text-red-600 font-medium">
                        ❌ <span className="line-through">{item.original}</span>
                      </p>
                      <p className="text-emerald-700 font-semibold">
                        ✅ {item.correction}
                      </p>
                      <p className="text-xs text-slate-600">{item.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Polished Answer */}
            {result.polishedAnswer && (
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-1">
                  Model Response (C1 Level)
                </h3>
                <p className="text-sm text-slate-700 bg-emerald-50 border border-emerald-100 p-3 rounded-lg italic">
                  "{result.polishedAnswer}"
                </p>
              </div>
            )}

            {/* Next Question Recommendation */}
            {result.nextQuestion && (
              <div className="pt-4 border-t border-slate-100">
                <span className="text-xs text-slate-500 font-semibold block uppercase mb-1">
                  Suggested Next Question
                </span>
                <p className="text-sm font-medium text-blue-900">
                  {result.nextQuestion}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}