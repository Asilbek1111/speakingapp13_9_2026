import { GoogleGenAI, Type } from '@google/genai'
import { NextResponse } from 'next/server'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function POST(req: Request) {
  try {
    const { userText, context } = await req.json()

    // Validate minimum spoken input
    const wordCount = userText ? userText.trim().split(/\s+/).length : 0
    if (wordCount < 3) {
      return NextResponse.json(
        { error: 'Please speak a longer answer (at least 3 words).' },
        { status: 400 }
      )
    }

    const prompt = `
You are an expert English speaking examiner evaluating a candidate for the Uzbek Multi-Level (CEFR B1-C1) English examination.
Evaluate the candidate's response out of a MAXIMUM TOTAL MARK OF 75.

Question/Prompt: "${context || 'Tell me about yourself and your daily routine.'}"
Candidate's Spoken Answer: "${userText}"

Scoring Breakdown (Total 75 marks):
- Fluency & Coherence (Max 20 marks)
- Grammatical Range & Accuracy (Max 20 marks)
- Lexical Resource / Vocabulary (Max 20 marks)
- Pronunciation & Articulation (Max 15 marks)
`

    let response
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              totalScore: { type: Type.NUMBER },
              cefrLevel: { type: Type.STRING },
              scores: {
                type: Type.OBJECT,
                properties: {
                  coherence: { type: Type.STRING },
                  grammar: { type: Type.STRING },
                  vocabulary: { type: Type.STRING },
                  pronunciation: { type: Type.STRING },
                },
                required: ['coherence', 'grammar', 'vocabulary', 'pronunciation'],
              },
              mistakes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    original: { type: Type.STRING },
                    correction: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                  },
                  required: ['original', 'correction', 'explanation'],
                },
              },
              polishedAnswer: { type: Type.STRING },
              advice: { type: Type.STRING },
              nextQuestion: { type: Type.STRING },
              spokenText: { type: Type.STRING },
            },
            required: [
              'totalScore',
              'cefrLevel',
              'scores',
              'mistakes',
              'polishedAnswer',
              'advice',
              'nextQuestion',
              'spokenText',
            ],
          },
        },
      })
    } catch (apiErr: any) {
      if (apiErr?.status === 429 || apiErr?.message?.includes('429')) {
        console.warn('Rate limit hit. Retrying in 3 seconds...')
        await delay(3000)
        response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        })
      } else {
        throw apiErr
      }
    }

    const textOutput = response.text || '{}'
    const parsedData = JSON.parse(textOutput)

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