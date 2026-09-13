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
You are an expert English speaking examiner for Multi-Level national examinations.
Evaluate the candidate's spoken response out of a MAXIMUM TOTAL MARK OF 75.

Question/Prompt: "${context || 'Do you work or are you a student?'}"
Candidate's Spoken Answer: "${userText}"

Marking Criteria (Total 75 points):
- Fluency & Coherence (Max 20 marks)
- Grammatical Range & Accuracy (Max 20 marks)
- Lexical Resource / Vocabulary (Max 20 marks)
- Pronunciation & Intonation (Max 15 marks)

Provide a JSON output with the following exact keys (no markdown backticks):
{
  "bandScore": "Total Score / 75 (e.g. '58 / 75')",
  "feedback": "Detailed 2-3 sentence breakdown explaining the marks awarded, key strengths, and specific grammatical or vocabulary corrections.",
  "nextQuestion": "The next logical question to ask the candidate.",
  "spokenText": "Encouraging verbal response (1-2 sentences) announcing their score out of 75 and asking the next question."
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