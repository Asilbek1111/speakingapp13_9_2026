import { GoogleGenAI } from '@google/genai'
import { NextResponse } from 'next/server'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function POST(req: Request) {
  try {
    const { userText, context } = await req.json()

    // Validate minimum input
    const wordCount = userText ? userText.trim().split(/\s+/).length : 0
    if (wordCount < 3) {
      return NextResponse.json(
        { error: 'Please speak a longer answer (at least 3 words).' },
        { status: 400 }
      )
    }

    const prompt = `
You are an expert English speaking examiner evaluating a candidate for the Uzbek Multi-Level (CEFR B1-C1) English examination.
Evaluate the response out of a MAXIMUM TOTAL MARK OF 75.

Question/Prompt: "${context || 'Tell me about yourself and your daily routine.'}"
Candidate's Spoken Answer: "${userText}"

Scoring Breakdown (Total 75 marks):
- Fluency & Coherence (Max 20 marks)
- Grammatical Range & Accuracy (Max 20 marks)
- Lexical Resource / Vocabulary (Max 20 marks)
- Pronunciation & Articulation (Max 15 marks)

You MUST respond strictly with a single valid JSON object. Do not include extra intro or outro text.

JSON format requirement:
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
    {
      "original": "candidate mistake phrase",
      "correction": "corrected version",
      "explanation": "brief grammatical explanation"
    }
  ],
  "polishedAnswer": "A natural C1-level polished version of the candidate's response.",
  "advice": "Actionable advice on how to raise their score for their next attempt.",
  "nextQuestion": "The next logical question for the Multi-Level speaking test.",
  "spokenText": "Examiner summary feedback followed by the next question spoken aloud."
}
`

    let response
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      })
    } catch (apiErr: any) {
      if (apiErr?.status === 429 || apiErr?.message?.includes('429')) {
        console.warn('Rate limit hit. Retrying in 3 seconds...')
        await delay(3000)
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        })
      } else {
        throw apiErr
      }
    }

    const textOutput = response.text || ''

    // Safely extract JSON content even if wrapped in markdown fences
    const jsonMatch = textOutput.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('Raw Gemini output was not valid JSON:', textOutput)
      throw new Error('Could not parse structured evaluation output.')
    }

    const parsedData = JSON.parse(jsonMatch[0])
    return NextResponse.json(parsedData)
  } catch (error: any) {
    console.error('AI Evaluation Backend Error:', error)

    if (error?.status === 429 || error?.message?.includes('429')) {
      return NextResponse.json(
        { error: 'System busy due to high traffic. Please wait 10 seconds and try again.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: error?.message || 'Failed to evaluate response. Please try again.' },
      { status: 500 }
    )
  }
}