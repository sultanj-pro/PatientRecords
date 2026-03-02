export interface CareTeamMember {
  id: string;
  name: string;
  role: string;
  specialty?: string;
  phone?: string;
  email?: string;
  organization?: string;
  startDate?: Date;
  endDate?: Date | null;
  isPrimary: boolean;
}

export interface CareTeamResponse {
  success: boolean;
  data?: CareTeamMember[];
  message?: string;
  error?: string;
}
