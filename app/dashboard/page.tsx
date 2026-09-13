'use client'

import { useState, useEffect, useRef } from 'react'
import { UserButton } from '@clerk/nextjs'

interface FeedbackData {
  feedback: string
  bandScore: string
  nextQuestion: string
  spokenText: string
}

export default function DashboardPage() {
  const [sessionStarted, setSessionStarted] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [currentQuestion, setCurrentQuestion] = useState(
    'Tell me about yourself and what you do every day.'
  )
  const [loading, setLoading] = useState(false)
  const [evaluation, setEvaluation] = useState<FeedbackData | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'en-US'

        recognition.onresult = (event: any) => {
          let currentTranscript = ''
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript
          }
          setTranscript(currentTranscript)
        }

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
          setIsListening(false)
        }

        recognition.onend = () => {
          setIsListening(false)
        }

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
      alert('Speech Recognition is not supported in this browser. Please use Chrome or Edge.')
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
        console.error('Could not start recognition:', err)
      }
    }
  }

  // Calculate total words in current transcript
  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0

  const handleSubmitAnswer = async () => {
    if (wordCount < 3) {
      setErrorMessage('Please speak a bit more (at least 3 words) before submitting.')
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
        body: JSON.stringify({
          userText: transcript,
          context: currentQuestion,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMessage(data.error || 'Something went wrong.')
        return
      }

      setEvaluation(data)
      if (data.nextQuestion) setCurrentQuestion(data.nextQuestion)

      if (data.spokenText) {
        speakText(data.spokenText)
      }
    } catch (err) {
      console.error(err)
      setErrorMessage('Failed to connect to the server. Please check your internet connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="p-4 border-b border-slate-800 flex justify-between items-center max-w-5xl mx-auto w-full">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
          AI Speaking Evaluator
        </h1>
        <UserButton />
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6 justify-center">
        {!sessionStarted ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6">
            <h2 className="text-2xl font-bold">Ready to Practice Speaking?</h2>
            <p className="text-slate-400 max-w-md mx-auto">
              Click start below to enable voice interaction. The AI will read your first question aloud.
            </p>
            <button
              onClick={handleStartSession}
              className="py-3 px-8 bg-blue-600 hover:bg-blue-500 font-semibold rounded-xl text-white shadow-lg transition transform active:scale-95"
            >
              Start Practice Session
            </button>
          </div>
        ) : (
          <>
            {/* AI Question Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                  AI Examiner
                </span>
                <button
                  onClick={() => speakText(currentQuestion)}
                  className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-slate-300 transition"
                >
                  🔊 Read Question Aloud
                </button>
              </div>
              <p className="text-lg md:text-xl font-medium text-slate-200">
                "{currentQuestion}"
              </p>
            </div>

            {/* Error Notification Banner */}
            {errorMessage && (
              <div className="bg-red-950/80 border border-red-800 text-red-200 text-sm p-4 rounded-xl flex justify-between items-center">
                <span>{errorMessage}</span>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="text-xs text-red-400 hover:text-red-200 ml-4 font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Controls Box */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 flex flex-col items-center gap-4 text-center">
              <button
                onClick={toggleListening}
                className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl transition transform active:scale-95 shadow-lg ${
                  isListening
                    ? 'bg-red-500 animate-pulse text-white'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {isListening ? '🛑' : '🎙️'}
              </button>
              <p className="text-sm text-slate-400">
                {isListening
                  ? 'Recording... Tap red stop button when finished.'
                  : 'Tap the mic to start answering.'}
              </p>

              {transcript && (
                <div className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 text-left text-slate-300 text-sm">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Your Answer:</span>
                    <span className={wordCount < 3 ? 'text-amber-400 font-semibold' : 'text-teal-400'}>
                      {wordCount} {wordCount === 1 ? 'word' : 'words'} {wordCount < 3 && '(Min 3 words)'}
                    </span>
                  </div>
                  {transcript}
                </div>
              )}

              {transcript && (
                <button
                  onClick={handleSubmitAnswer}
                  disabled={loading || wordCount < 3}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? 'Evaluating...' : 'Submit & Get Feedback'}
                </button>
              )}
            </div>

            {/* Evaluation Result Card */}
            {evaluation && (
              <div className="bg-slate-900 border border-teal-500/30 rounded-2xl p-6 space-y-4 shadow-2xl">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <h3 className="font-semibold text-teal-400">Evaluation Result</h3>
                  <span className="bg-teal-950 text-teal-300 border border-teal-800 text-xs px-3 py-1 rounded-full font-bold">
                    Score: {evaluation.bandScore}
                  </span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {evaluation.feedback}
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}