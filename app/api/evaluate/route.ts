
import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function fetchWithRetry(
  fn: () => Promise<any>,
  retries = 3,
  delayMs = 2000
) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimit =
        error?.status === 429 ||
        error?.error?.code === "rate_limit_exceeded" ||
        String(error?.message || "").includes("429");

      if (isRateLimit && attempt < retries - 1) {
        const waitTime = delayMs * (attempt + 1);

        console.log(
          "Groq rate limit reached. Retrying in " +
            waitTime +
            "ms..."
        );

        await new Promise((resolve) => {
          setTimeout(resolve, waitTime);
        });
      } else {
        throw error;
      }
    }
  }

  throw new Error("Groq request failed after retries.");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const userText = body?.userText;
    const context = body?.context;

    if (
      typeof userText !== "string" ||
      userText.trim().length === 0
    ) {
      return NextResponse.json(
        {
          error: "Please provide a response.",
        },
        { status: 400 }
      );
    }

    const wordCount = userText
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;

    if (wordCount < 3) {
      return NextResponse.json(
        {
          error:
            "Please provide a valid response with at least 3 words.",
        },
        { status: 400 }
      );
    }

    const question =
      typeof context === "string" && context.trim()
        ? context.trim()
        : "Tell me about yourself.";

    const systemPrompt =
      "You are an official Multi-Level English Speaking Examiner.\n\n" +
      "Evaluate the candidate's spoken English response based on the examiner question.\n\n" +
      "Return ONLY valid JSON using exactly this structure:\n\n" +
      "{\n" +
      '  "totalScore": 0,\n' +
      '  "cefrLevel": "A1",\n' +
      '  "spokenText": "",\n' +
      '  "mistakes": [\n' +
      "    {\n" +
      '      "original": "",\n' +
      '      "correction": "",\n' +
      '      "explanation": ""\n' +
      "    }\n" +
      "  ],\n" +
      '  "polishedAnswer": "",\n' +
      '  "nextQuestion": ""\n' +
      "}\n\n" +
      "Rules:\n" +
      "- totalScore must be between 0 and 75.\n" +
      "- cefrLevel must be A1, A2, B1, B2, or C1.\n" +
      "- spokenText should contain brief examiner feedback.\n" +
      "- Identify real grammar, vocabulary, word-choice, and sentence-structure mistakes.\n" +
      "- Do not invent mistakes.\n" +
      "- polishedAnswer should preserve the candidate's ideas but improve the English to approximately C1 / Band 8 level.\n" +
      "- nextQuestion should be a natural follow-up speaking question.\n" +
      "- Return JSON only.\n" +
      "- Do not use Markdown.\n";

    const userPrompt =
      "Examiner Question:\n" +
      question +
      "\n\nCandidate Response:\n" +
      userText;

    console.log("Sending request to Groq...");
    console.log("Question:", question);
    console.log("Candidate:", userText);

  const chatCompletion = await fetchWithRetry(() =>
  groq.chat.completions.create({
    model: "openai/gpt-oss-20b",

    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],

    temperature: 0.3,

    response_format: {
      type: "json_object",
    },
  })
);

    const responseContent =
      chatCompletion.choices?.[0]?.message?.content;

    if (!responseContent) {
      throw new Error("Groq returned an empty response.");
    }

    console.log("Groq response:", responseContent);

    let evaluationResult: any;

    try {
      evaluationResult = JSON.parse(responseContent);
    } catch (error) {
      console.error(
        "Groq returned invalid JSON:",
        responseContent
      );

      throw new Error("Groq returned invalid JSON.");
    }

    return NextResponse.json(evaluationResult, {
      status: 200,
    });
  } catch (error: any) {
    console.error("=================================");
    console.error("Groq Evaluation Error");
    console.error("=================================");
    console.error("Message:", error?.message);
    console.error("Status:", error?.status);
    console.error("Code:", error?.error?.code);
    console.error("Full error:", error);

    if (
      error?.status === 429 ||
      error?.error?.code === "rate_limit_exceeded"
    ) {
      return NextResponse.json(
        {
          error:
            "Groq API rate limit reached. Please wait and try again.",
        },
        { status: 429 }
      );
    }

    if (
      error?.status === 401 ||
      error?.status === 403
    ) {
      return NextResponse.json(
        {
          error:
            "Groq API authentication failed. Check your GROQ_API_KEY.",
        },
        { status: error.status }
      );
    }

    if (error?.status === 400) {
      return NextResponse.json(
        {
          error:
            error?.message ||
            "Groq rejected the request.",
        },
        { status: 400 }
      );
    }

    if (error?.status === 404) {
      return NextResponse.json(
        {
          error:
            error?.message ||
            "Groq model or endpoint was not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Failed to evaluate response.",
      },
      { status: 500 }
    );
  }
}

