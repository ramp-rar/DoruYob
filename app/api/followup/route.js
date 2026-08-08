import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MODEL = "gemini-3.6-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const LANG_NAMES = { tg: "Tajik (Cyrillic script)", ru: "Russian", en: "English" };

export async function POST(req) {
  try {
    const { lang = "ru", context, question } = await req.json();

    if (!question?.trim() || !context?.name) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
    }

    const langName = LANG_NAMES[lang] || LANG_NAMES.ru;
    const prompt = `You are continuing a pharmacy-assistant conversation. Earlier you identified "${context.name}" and explained: ${context.whatItIs || ""} ${context.whatToDo || ""}

The user now asks a short follow-up question: "${question.trim()}"

Answer in 1-3 short sentences, in ${langName}. Stay safety-first: never give exact dosages, never tell them to combine specific medications, and if the question genuinely needs a doctor's judgment (e.g. pregnancy, existing conditions, drug interactions), say so plainly instead of guessing. Respond with plain text only — no JSON, no markdown formatting.`;

    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3 },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini follow-up error:", res.status, errText);
      return NextResponse.json({ error: "gemini_error" }, { status: 502 });
    }

    const data = await res.json();
    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!answer) return NextResponse.json({ error: "empty_response" }, { status: 502 });

    return NextResponse.json({ answer });
  } catch (err) {
    console.error("followup route failed:", err);
    return NextResponse.json({ error: "unexpected" }, { status: 500 });
  }
}
