import { GoogleGenAI, Type } from '@google/genai'
import { NextResponse } from 'next/server'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export async function POST(req: Request) {
  try {
    const { userText, context } = await req.json()

    const wordCount = userText ? userText.trim().split(/\s+/).length : 0
    if (wordCount < 3) {
      return NextResponse.json(
        { error: 'Please speak a longer answer (at least 3 words).' },
        { status: 400 }
      )
    }

    const prompt = `
You are an expert English speaking examiner for Multi-Level (CEFR B1-C1) examinations.
Evaluate the candidate's response out of a MAXIMUM TOTAL MARK OF 75 based on CEFR criteria.

Question/Prompt: "${context || 'Tell me about yourself and your daily routine.'}"
Candidate's Spoken Response: "${userText}"
`

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            totalScore: { 
              type: Type.INTEGER, 
              description: 'Total mark out of 75' 
            },
            cefrLevel: { 
              type: Type.STRING, 
              description: 'Overall CEFR level, e.g. B1, B2, C1' 
            },
            mistakes: {
              type: Type.ARRAY,
              description: 'Key grammatical or vocabulary mistakes detected',
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
            polishedAnswer: { 
              type: Type.STRING, 
              description: 'A polished CEFR C1 version of the candidates response' 
            },
            nextQuestion: { 
              type: Type.STRING, 
              description: 'The next logical follow-up question for the candidate' 
            },
            spokenText: { 
              type: Type.STRING, 
              description: 'Short 1-2 sentence examiner summary feedback' 
            },
          },
          required: [
            'totalScore',
            'cefrLevel',
            'mistakes',
            'polishedAnswer',
            'nextQuestion',
            'spokenText',
          ],
        },
      },
    })

    const parsedData = JSON.parse(response.text || '{}')
    return NextResponse.json(parsedData)
  } catch (error: any) {
    console.error('AI Evaluation Error:', error)
    
    if (error?.status === 429 || error?.message?.includes('429')) {
      return NextResponse.json(
        { error: 'Rate limit hit. Please wait a few seconds before trying again.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to evaluate response. Please try again.' },
      { status: 500 }
    )
  }
}