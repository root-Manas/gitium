import { notFound } from "next/navigation";
import { Shell } from "@/components/Shell";
import { authEnabled } from "@/lib/auth";
import { dbConfigured } from "@/lib/d1";
import { EncryptedChat } from "@/components/EncryptedChat";
import { encryptionEnabled } from "@/lib/encryption";
export const metadata = {
  title: "Encrypted chat",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default function Page() {
  if (!encryptionEnabled()) notFound();
  return (
    <Shell authReady={authEnabled()} dataReady={dbConfigured()}>
      <EncryptedChat />
    </Shell>
  );
}
