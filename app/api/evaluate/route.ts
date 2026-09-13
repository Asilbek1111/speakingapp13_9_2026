import { GoogleGenAI } from '@google/genai'
import { NextResponse } from 'next/server'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export async function POST(req: Request) {
  try {
    const { userText, context } = await req.json()

    // Server-side validation
    const wordCount = userText ? userText.trim().split(/\s+/).length : 0
    if (wordCount < 3) {
      return NextResponse.json(
        { error: 'Please speak a longer answer (at least 3 words).' },
        { status: 400 }
      )
    }

    const prompt = `
You are an expert English speaking examiner for national Multi-Level (CEFR B1-C1) examinations.
Evaluate the candidate's spoken response thoroughly out of a MAXIMUM TOTAL MARK OF 75.

Question/Prompt: "${context || 'Tell me about yourself and your daily routine.'}"
Candidate's Spoken Response: "${userText}"

Evaluate strictly based on these four criteria:
1. Fluency & Coherence (Max 20 marks)
2. Grammatical Range & Accuracy (Max 20 marks)
3. Lexical Resource / Vocabulary (Max 20 marks)
4. Pronunciation & Articulation (Max 15 marks)

Provide a JSON response matching this EXACT structure (NO markdown backticks, raw JSON only):
{
  "totalScore": 58,
  "cefrLevel": "B2",
  "scores": {
    "coherence": "15/20",
    "grammar": "14/20",
    "vocabulary": "16/20",
    "pronunciation": "13/15"
  },
  "mistakes": [
    { "original": "I am go to study", "correction": "I go to study / I am going to study", "explanation": "Avoid combining 'am' with a base verb in simple present tense." }
  ],
  "polishedAnswer": "A highly polished, natural C1-level version of what the candidate attempted to say, using sophisticated vocabulary and varied sentence structures.",
  "advice": "2-3 actionable, high-impact tips on how to improve their score for the next attempt.",
  "nextQuestion": "The next logical question for the speaking exam.",
  "spokenText": "A warm 1-sentence examiner summary of their performance followed by the next question."
}
`

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
    })

    const rawText = response.text?.replace(/```json|```/g, '').trim() || '{}'
    const parsedData = JSON.parse(rawText)

    return NextResponse.json(parsedData)
  } catch (error: any) {
    console.error('AI Evaluation Error:', error)

    if (error?.status === 429 || error?.message?.includes('429')) {
      return NextResponse.json(
        { error: 'System is busy due to high traffic. Please wait 10 seconds and try again.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to evaluate response. Please try again.' },
      { status: 500 }
    )
  }
}