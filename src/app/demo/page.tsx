import { redirect } from "next/navigation";

export default function Demo() {
  // The legacy iframe stores data only in the browser and cannot safely use the
  // tenant-scoped R2/Gemini pipeline. The secure demo therefore uses normal auth.
  redirect("/login?next=/dashboard");
}
