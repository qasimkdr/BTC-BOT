const endpoint = () => process.env.V3_LLM_BASE_URL || "https://api.openai.com/v1";
const model = (tier="quick") => tier==="deep" ? (process.env.V3_LLM_DEEP_MODEL||process.env.V3_LLM_MODEL||"gpt-5") : (process.env.V3_LLM_QUICK_MODEL||process.env.V3_LLM_MODEL||"gpt-5-mini");

const extractJson = (text) => {
  try { return JSON.parse(text); } catch {}
  const match = String(text || "").match(/\{[\s\S]*\}/);
  if (!match) throw new Error("LLM did not return JSON");
  return JSON.parse(match[0]);
};

export async function invokeV3LLM(system, payload, tier="quick") {
  if (!process.env.V3_LLM_API_KEY) throw new Error("V3_LLM_API_KEY is not configured");
  const response = await fetch(`${endpoint()}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.V3_LLM_API_KEY}` },
    body: JSON.stringify({
      model: model(tier),
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, { role: "user", content: JSON.stringify(payload) }],
    }),
  });
  if (!response.ok) throw new Error(`V3 LLM HTTP ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return extractJson(data?.choices?.[0]?.message?.content);
}
