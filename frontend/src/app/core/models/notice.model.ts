export interface Notice {
  _id: string;
  tenantId: string;
  title: string;
  message: string;
  createdAt: string;
}

export interface NoticeResponse {
  success: boolean;
  notices: Notice[];
}
