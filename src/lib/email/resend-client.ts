import "server-only";
import { Resend } from "resend";
import { getServerEnv } from "@/lib/config/env.server";

export function getResendClient() {
  const { RESEND_API_KEY } = getServerEnv();
  return RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
}
