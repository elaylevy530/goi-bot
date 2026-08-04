/**
 * WhatsApp facade — kept for backward compatibility with existing imports.
 * Dispatches to the active provider (Green API today, Meta Cloud API when
 * WHATSAPP_PROVIDER=cloud and the cloud credentials are configured).
 *
 * New code should import directly from "./whatsapp/provider.server".
 */
export { sendText, sendButtons, toChatId } from "./whatsapp/provider.server";
