import { GoogleGenAI } from '@google/genai'
import { NextResponse } from 'next/server'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export async function POST(req: Request) {
  try {
    const { userText, context } = await req.json()

    // Server-side validation: ensure speech is at least 3 words
    const wordCount = userText ? userText.trim().split(/\s+/).length : 0
    if (wordCount < 3) {
      return NextResponse.json(
        { error: 'Please speak a longer answer (at least 3 words).' },
        { status: 400 }
      )
    }

    const prompt = `
You are an expert English speaking evaluator.
Current evaluation context/question: "${context || 'Tell me about yourself and your routine.'}"
User's spoken answer: "${userText}"

Provide a structured response in JSON format with:
1. "feedback": Quick constructive feedback on grammar, vocabulary, and clarity (2-3 sentences max).
2. "bandScore": Estimated band or rating (e.g. "6.5 / 9.0" or "Intermediate").
3. "nextQuestion": The next engaging speaking question to ask the user.
4. "spokenText": A concise, friendly response to speak aloud to the user (combining quick encouragement + next question).

Return ONLY raw JSON with no markdown backticks.
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

    // Handle Rate Limit (429 Too Many Requests)
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