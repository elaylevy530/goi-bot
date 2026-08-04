/**
 * Minimal stub for the deprecated bot-templates system.
 * The bot-studio admin UI was removed, but the WhatsApp webhook handler
 * still calls renderTemplate() for a few short DM strings. Since private
 * DMs are also disabled at the provider level, this stub just returns the
 * fallback body/buttons untouched.
 */

type Buttons = Array<{ buttonId: string; buttonText: string }>;

export async function renderTemplate(
  _key: string,
  _vars: Record<string, string | number | null | undefined> = {},
  fallback: { body: string; buttons?: Buttons } = { body: "" },
): Promise<{ body: string; buttons: Buttons }> {
  return { body: fallback.body, buttons: fallback.buttons ?? [] };
}

