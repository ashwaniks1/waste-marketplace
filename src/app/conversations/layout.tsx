import { ConversationsLayoutClient } from "@/components/ConversationsLayoutClient";

export default function ConversationsLayout({ children }: { children: React.ReactNode }) {
  return <ConversationsLayoutClient>{children}</ConversationsLayoutClient>;
}
