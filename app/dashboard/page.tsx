"use client";

import { useEffect, useRef, useState } from "react";
import { UserButton } from "@clerk/nextjs";

interface Mistake {
  original: string;
  correction: string;
  explanation: string;
}

interface DetailedEvaluation {
  totalScore: number;
  cefrLevel: string;
  spokenText: string;
  mistakes: Mistake[];
  polishedAnswer: string;
  nextQuestion: string;
}

export default function DashboardPage() {
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState(
    "Do you work or are you a student?"
  );
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] =
    useState<DetailedEvaluation | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Speech Recognition is not supported.");
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let text = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];

        if (result && result[0]) {
          const chunk = result[0].transcript.trim();

          if (chunk) {
            text += chunk + " ";
          }
        }
      }

      const cleaned = text.trim();

      if (cleaned) {
        setTranscript(cleaned);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event);

      setIsListening(false);

      if (event?.error === "not-allowed") {
        setErrorMessage(
          "Microphone permission was denied. Please allow microphone access."
        );
      } else if (event?.error === "no-speech") {
        setErrorMessage("No speech was detected. Please try again.");
      } else {
        setErrorMessage(
          "Speech recognition error: " +
            (event?.error || "unknown error")
        );
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {
        // Already stopped
      }
    };
  }, []);

  const speakText = (text: string) => {
    if (typeof window === "undefined") {
      return;
    }

    if (!("speechSynthesis" in window)) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = "en-US";
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    window.speechSynthesis.speak(utterance);
  };

  const handleStartSession = () => {
    setSessionStarted(true);
    setEvaluation(null);
    setTranscript("");
    setErrorMessage("");

    setTimeout(() => {
      speakText(currentQuestion);
    }, 300);
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setErrorMessage(
        "Speech Recognition is not supported. Please use Google Chrome."
      );
      return;
    }

    setErrorMessage("");

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error("Stop recognition error:", error);
      }

      setIsListening(false);
      return;
    }

    setTranscript("");

    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (error) {
      console.error("Start recognition error:", error);

      setErrorMessage(
        "Could not start the microphone. Please try again."
      );

      setIsListening(false);
    }
  };

  const wordCount = transcript.trim()
    ? transcript.trim().split(/\s+/).filter(Boolean).length
    : 0;

  const handleSubmitAnswer = async () => {
    if (wordCount < 3) {
      setErrorMessage(
        "Please speak at least 3 words before submitting."
      );
      return;
    }

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error(error);
      }

      setIsListening(false);
    }

    setLoading(true);
    setErrorMessage("");

    try {
      console.log("================================");
      console.log("Sending request to /api/evaluate");
      console.log("Question:", currentQuestion);
      console.log("Transcript:", transcript);
      console.log("================================");

      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userText: transcript,
          context: currentQuestion,
        }),
      });

      console.log("HTTP status:", response.status);

      const rawText = await response.text();

      console.log("Raw server response:", rawText);

      let data: any;

      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(
          "Server returned invalid JSON. HTTP status: " +
            response.status
        );
      }

      console.log("Parsed response:", data);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "API request failed with status " +
              response.status
        );
      }

      if (
        typeof data.totalScore !== "number" ||
        typeof data.cefrLevel !== "string"
      ) {
        console.error("Invalid evaluation data:", data);

        throw new Error(
          "The AI returned an invalid evaluation format."
        );
      }

      setEvaluation(data);

      if (data.nextQuestion) {
        setCurrentQuestion(data.nextQuestion);

        setTimeout(() => {
          speakText(data.nextQuestion);
        }, 500);
      }
    } catch (error: any) {
      console.error("================================");
      console.error("EVALUATION ERROR");
      console.error(error);
      console.error("================================");

      setErrorMessage(
        error?.message ||
          "Connection error. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const resetAnswer = () => {
    setTranscript("");
    setEvaluation(null);
    setErrorMessage("");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800">
        <div className="max-w-5xl mx-auto w-full px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
            Multi-Level Speaking Evaluator
          </h1>

          <UserButton />
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        {!sessionStarted ? (
          <div className="min-h-[70vh] flex items-center justify-center">
            <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">
                Multi-Level Speaking Practice
              </h2>

              <p className="text-slate-400 max-w-lg mx-auto mb-8">
                Practice speaking, get an AI evaluation,
                receive a score out of 75, identify your
                mistakes, and see a C1-level model answer.
              </p>

              <button
                onClick={handleStartSession}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition"
              >
                Start Session
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  Examiner Question
                </span>

                <button
                  onClick={() => speakText(currentQuestion)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm"
                >
                  🔊 Listen
                </button>
              </div>

              <p className="text-xl font-medium">
                {currentQuestion}
              </p>
            </div>

            {errorMessage && (
              <div className="bg-red-950 border border-red-800 rounded-xl p-4 text-red-200 flex items-center justify-between gap-4">
                <p className="text-sm">
                  {errorMessage}
                </p>

                <button
                  onClick={() => setErrorMessage("")}
                  className="text-red-400 font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
              <div className="flex flex-col items-center gap-5">
                <button
                  onClick={toggleListening}
                  disabled={loading}
                  className={
                    "w-24 h-24 rounded-full flex items-center justify-center text-3xl shadow-xl transition " +
                    (isListening
                      ? "bg-red-500 animate-pulse"
                      : "bg-blue-600 hover:bg-blue-500") +
                    (loading
                      ? " opacity-50 cursor-not-allowed"
                      : "")
                  }
                >
                  {isListening ? "🛑" : "🎙️"}
                </button>

                <p className="text-sm text-slate-400">
                  {isListening
                    ? "Listening... Tap the button when you finish."
                    : "Tap the microphone and start speaking."}
                </p>

                {transcript && (
                  <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs text-slate-500">
                        Your Spoken Answer
                      </span>

                      <span
                        className={
                          wordCount < 3
                            ? "text-amber-400 text-xs font-semibold"
                            : "text-teal-400 text-xs font-semibold"
                        }
                      >
                        {wordCount} words
                      </span>
                    </div>

                    <p className="text-slate-300 text-sm leading-relaxed">
                      {transcript}
                    </p>
                  </div>
                )}

                {transcript && (
                  <div className="w-full flex gap-3">
                    <button
                      onClick={resetAnswer}
                      disabled={loading}
                      className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-semibold"
                    >
                      Clear
                    </button>

                    <button
                      onClick={handleSubmitAnswer}
                      disabled={loading || wordCount < 3}
                      className="flex-[2] py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold"
                    >
                      {loading
                        ? "Analyzing..."
                        : "Submit Response"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {evaluation && (
              <div className="space-y-6">
                <div className="bg-slate-900 border border-teal-500/30 rounded-2xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">
                        Overall Score
                      </p>

                      <p className="text-4xl font-bold text-teal-400 mt-1">
                        {evaluation.totalScore}
                        <span className="text-lg text-slate-500">
                          {" "}
                          / 75
                        </span>
                      </p>
                    </div>

                    <div className="bg-teal-950 border border-teal-800 rounded-xl px-6 py-3 text-center">
                      <p className="text-xs text-teal-400">
                        CEFR LEVEL
                      </p>

                      <p className="text-2xl font-bold text-teal-200">
                        {evaluation.cefrLevel}
                      </p>
                    </div>
                  </div>
                </div>

                {evaluation.spokenText && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400 mb-3">
                      Examiner Feedback
                    </h3>

                    <p className="text-slate-300 leading-relaxed">
                      {evaluation.spokenText}
                    </p>
                  </div>
                )}

                {evaluation.mistakes &&
                  evaluation.mistakes.length > 0 && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-red-400 mb-4">
                        ⚠️ Mistakes & Corrections
                      </h3>

                      <div className="space-y-4">
                        {evaluation.mistakes.map(
                          (mistake, index) => (
                            <div
                              key={index}
                              className="bg-slate-950 border border-slate-800 rounded-xl p-4"
                            >
                              <p className="text-sm mb-2">
                                <span className="text-red-400 line-through">
                                  {mistake.original}
                                </span>

                                <span className="mx-2 text-slate-500">
                                  →
                                </span>

                                <span className="text-emerald-400 font-semibold">
                                  {mistake.correction}
                                </span>
                              </p>

                              <p className="text-xs text-slate-400">
                                {mistake.explanation}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {evaluation.polishedAnswer && (
                  <div className="bg-slate-900 border border-purple-500/20 rounded-2xl p-6">
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-purple-400">
                        ✨ C1 Model Answer
                      </h3>

                      <button
                        onClick={() =>
                          speakText(
                            evaluation.polishedAnswer
                          )
                        }
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs"
                      >
                        🔊 Listen
                      </button>
                    </div>

                    <p className="text-slate-300 leading-relaxed italic">
                      {evaluation.polishedAnswer}
                    </p>
                  </div>
                )}

                {evaluation.nextQuestion && (
                  <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400">
                        Next Question
                      </h3>

                      <button
                        onClick={() =>
                          speakText(
                            evaluation.nextQuestion
                          )
                        }
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs"
                      >
                        🔊 Listen
                      </button>
                    </div>

                    <p className="text-lg text-slate-200">
                      {evaluation.nextQuestion}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}