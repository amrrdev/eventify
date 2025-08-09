export interface LiveEvent {
  id: string;
  eventName: string;
  userId: string;
  country: string;
  device: 'mobile' | 'web' | 'tablet';
  timestamp: Date;
  timeAgo: string;
}
