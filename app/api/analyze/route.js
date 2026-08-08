import { NextResponse } from "next/server";
import { buildPrompt } from "@/lib/prompts";
import { logAnalysis } from "@/lib/db";
import pharmacies from "@/lib/pharmacies.json";

export const runtime = "nodejs";

const MODEL = "gemini-2.0-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export async function POST(req) {
  try {
    const body = await req.json();
    const { type, lang = "ru", text, imageBase64, mimeType } = body || {};

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "server_misconfigured", message: "GEMINI_API_KEY is not set" },
        { status: 500 }
      );
    }

    if (type !== "text" && type !== "image") {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    if (type === "text" && !text?.trim()) {
      return NextResponse.json({ error: "empty_text" }, { status: 400 });
    }
    if (type === "image" && !imageBase64) {
      return NextResponse.json({ error: "empty_image" }, { status: 400 });
    }

    const promptText = buildPrompt(lang);
    const parts = [{ text: promptText }];

    if (type === "text") {
      parts.push({ text: `User's symptom description: "${text.trim()}"` });
    } else {
      parts.push({
        inline_data: {
          mime_type: mimeType || "image/jpeg",
          data: imageBase64,
        },
      });
    }

    const geminiRes = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", geminiRes.status, errText);
      return NextResponse.json(
        { error: "gemini_error", status: geminiRes.status },
        { status: 502 }
      );
    }

    const data = await geminiRes.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return NextResponse.json({ error: "empty_response" }, { status: 502 });
    }

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return NextResponse.json({ error: "parse_error" }, { status: 502 });
    }

    // Fire-and-forget: never let logging delay or break the response the user is waiting on.
    logAnalysis({
      type,
      lang,
      name: parsed?.name,
      confidence: parsed?.confidence,
      emergency: parsed?.emergency,
    });

    return NextResponse.json({
      result: parsed,
      pharmacies,
    });
  } catch (err) {
    console.error("analyze route failed:", err);
    return NextResponse.json({ error: "unexpected" }, { status: 500 });
  }
}
