'use client'

import { useState, useEffect, useRef } from 'react'
import { UserButton } from '@clerk/nextjs'

interface Mistake {
  original: string
  correction: string
  explanation: string
}

interface DetailedEvaluation {
  totalScore: number
  cefrLevel: string
  scores: {
    coherence: string
    grammar: string
    vocabulary: string
    pronunciation: string
  }
  mistakes: Mistake[]
  polishedAnswer: string
  advice: string
  nextQuestion: string
  spokenText: string
}

export default function DashboardPage() {
  const [sessionStarted, setSessionStarted] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [currentQuestion, setCurrentQuestion] = useState(
    'Do you work or are you a student?'
  )
  const [loading, setLoading] = useState(false)
  const [evaluation, setEvaluation] = useState<DetailedEvaluation | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = false
        recognition.lang = 'en-US'

        recognition.onresult = (event: any) => {
          let accumulatedText = ''
          for (let i = 0; i < event.results.length; i++) {
            const chunk = event.results[i][0].transcript.trim()
            if (chunk) accumulatedText += chunk + ' '
          }

          const words = accumulatedText.trim().split(/\s+/)
          const cleanWords: string[] = []
          for (let i = 0; i < words.length; i++) {
            if (i === 0 || words[i].toLowerCase() !== words[i - 1].toLowerCase()) {
              cleanWords.push(words[i])
            }
          }
          setTranscript(cleanWords.join(' '))
        }

        recognition.onerror = () => setIsListening(false)
        recognition.onend = () => setIsListening(false)

        recognitionRef.current = recognition
      }
    }
  }, [])

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.95
      utterance.lang = 'en-US'
      window.speechSynthesis.speak(utterance)
    }
  }

  const handleStartSession = () => {
    setSessionStarted(true)
    speakText(currentQuestion)
  }

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition is not supported in this browser. Please use Google Chrome or Safari.')
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      setTranscript('')
      setErrorMessage(null)
      try {
        recognitionRef.current.start()
        setIsListening(true)
      } catch (err) {
        console.error(err)
      }
    }
  }

  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0

  const handleSubmitAnswer = async () => {
    if (wordCount < 3) {
      setErrorMessage('Please speak at least 3 words before submitting.')
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    }

    setLoading(true)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userText: transcript, context: currentQuestion }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMessage(data.error || 'Evaluation failed.')
        return
      }

      setEvaluation(data)
      if (data.nextQuestion) setCurrentQuestion(data.nextQuestion)
      if (data.spokenText) speakText(data.spokenText)
    } catch (err) {
      setErrorMessage('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="p-4 border-b border-slate-800 flex justify-between items-center max-w-5xl mx-auto w-full">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
          Multi-Level Speaking Evaluator
        </h1>
        <UserButton />
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
        {!sessionStarted ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6 my-auto">
            <h2 className="text-2xl font-bold">Multi-Level Speaking Practice</h2>
            <p className="text-slate-400 max-w-md mx-auto">
              Get detailed 75-point score breakdowns, error analyses, and high-band answer rewrites.
            </p>
            <button
              onClick={handleStartSession}
              className="py-3 px-8 bg-blue-600 hover:bg-blue-500 font-semibold rounded-xl text-white shadow-lg transition transform active:scale-95"
            >
              Start Session
            </button>
          </div>
        ) : (
          <>
            {/* Question Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                  Examiner Question
                </span>
                <button
                  onClick={() => speakText(currentQuestion)}
                  className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-slate-300 transition"
                >
                  🔊 Listen
                </button>
              </div>
              <p className="text-lg md:text-xl font-medium text-slate-200">"{currentQuestion}"</p>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="bg-red-950/80 border border-red-800 text-red-200 text-sm p-4 rounded-xl flex justify-between items-center">
                <span>{errorMessage}</span>
                <button onClick={() => setErrorMessage(null)} className="text-xs text-red-400 font-bold">✕</button>
              </div>
            )}

            {/* Mic Controls & Transcript */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col items-center gap-4 text-center">
              <button
                onClick={toggleListening}
                className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl transition transform active:scale-95 shadow-lg ${
                  isListening ? 'bg-red-500 animate-pulse text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {isListening ? '🛑' : '🎙️'}
              </button>
              <p className="text-sm text-slate-400">
                {isListening ? 'Listening... Tap red button when finished.' : 'Tap mic to record your response.'}
              </p>

              {transcript && (
                <div className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 text-left text-slate-300 text-sm">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Your Spoken Answer:</span>
                    <span className={wordCount < 3 ? 'text-amber-400 font-semibold' : 'text-teal-400'}>
                      {wordCount} words {wordCount < 3 && '(Min 3 words)'}
                    </span>
                  </div>
                  {transcript}
                </div>
              )}

              {transcript && (
                <button
                  onClick={handleSubmitAnswer}
                  disabled={loading || wordCount < 3}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl transition disabled:opacity-40"
                >
                  {loading ? 'Analyzing Speaking Performance...' : 'Submit Response'}
                </button>
              )}
            </div>

            {/* Detailed Evaluation Section */}
            {evaluation && (
              <div className="space-y-6">
                {/* Total Score Header */}
                <div className="bg-slate-900 border border-teal-500/30 rounded-2xl p-6 flex justify-between items-center shadow-2xl">
                  <div>
                    <h3 className="text-sm text-slate-400 font-medium">Overall Score</h3>
                    <div className="text-3xl font-extrabold text-teal-400 mt-1">
                      {evaluation.totalScore} <span className="text-lg text-slate-500 font-normal">/ 75</span>
                    </div>
                  </div>
                  <div className="bg-teal-950 border border-teal-800 px-4 py-2 rounded-xl text-center">
                    <span className="text-xs text-teal-400 block font-semibold">CEFR LEVEL</span>
                    <span className="text-xl font-bold text-teal-200">{evaluation.cefrLevel}</span>
                  </div>
                </div>

                {/* 4 Criteria Sub-Score Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                    <span className="text-xs text-slate-400 block mb-1">Coherence</span>
                    <span className="text-lg font-bold text-blue-400">{evaluation.scores.coherence}</span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                    <span className="text-xs text-slate-400 block mb-1">Grammar</span>
                    <span className="text-lg font-bold text-indigo-400">{evaluation.scores.grammar}</span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                    <span className="text-xs text-slate-400 block mb-1">Vocabulary</span>
                    <span className="text-lg font-bold text-purple-400">{evaluation.scores.vocabulary}</span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                    <span className="text-xs text-slate-400 block mb-1">Pronunciation</span>
                    <span className="text-lg font-bold text-emerald-400">{evaluation.scores.pronunciation}</span>
                  </div>
                </div>

                {/* Detected Mistakes */}
                {evaluation.mistakes && evaluation.mistakes.length > 0 && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
                    <h4 className="text-sm font-semibold text-red-400 uppercase tracking-wider">
                      ⚠️ Mistakes & Corrections
                    </h4>
                    <div className="space-y-3">
                      {evaluation.mistakes.map((m, idx) => (
                        <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-red-950 text-sm space-y-1">
                          <p className="text-red-300"><span className="line-through">{m.original}</span> → <strong className="text-emerald-400">{m.correction}</strong></p>
                          <p className="text-xs text-slate-400">{m.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Polished Answer Model */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">
                      ✨ Polished Answer (C1 Model)
                    </h4>
                    <button
                      onClick={() => speakText(evaluation.polishedAnswer)}
                      className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-lg text-slate-300"
                    >
                      🔊 Listen to Model Answer
                    </button>
                  </div>
                  <p className="text-slate-300 text-sm italic leading-relaxed">
                    "{evaluation.polishedAnswer}"
                  </p>
                </div>

                {/* Actionable Advice */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2">
                  <h4 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
                    💡 Tips to Increase Your Score
                  </h4>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {evaluation.advice}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}