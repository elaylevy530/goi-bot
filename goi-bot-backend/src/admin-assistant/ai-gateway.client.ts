import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/**
 * Minimal OpenAI-compatible client for the Lovable AI Gateway — plain fetch,
 * non-streaming. Ported (simplified) from goi-bot-frontend/src/lib/ai-gateway.server.ts,
 * which uses the Vercel AI SDK (`ai` package, not installed in this backend).
 */
@Injectable()
export class LovableAiGatewayClient {
  private readonly logger = new Logger(LovableAiGatewayClient.name);
  private readonly baseUrl = "https://ai.gateway.lovable.dev/v1";

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return !!this.config.get<string>("ai.lovableApiKey");
  }

  async chat(messages: ChatMessage[], model = "google/gemini-3-flash-preview"): Promise<string> {
    const apiKey = this.config.get<string>("ai.lovableApiKey");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "nest-fetch",
      },
      body: JSON.stringify({ model, messages, stream: false }),
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`AI gateway ${res.status}: ${text.slice(0, 400)}`);
    }

    const json = JSON.parse(text) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI gateway returned no content");
    return content;
  }
}
