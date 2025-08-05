export interface ApiKeyLean {
  key: string;
  ownerId: string;
  usageCount: number;
  usageLimit: number;
  active: boolean;
}
