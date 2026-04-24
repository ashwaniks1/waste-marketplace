export type SellerConversationRow = {
  id: string;
  updatedAt: string;
  listing: {
    id: string;
    title: string;
    wasteType: string;
    status: string;
    userId: string;
    images: string[];
    seller: { id: string; name: string };
  };
  buyer: { id: string; name: string; avatarUrl?: string | null };
  messages: { id: string; body: string; createdAt: string }[];
};
