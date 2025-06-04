declare const mercari: {
  getItemDetails: (id: string, country_code?: string) => Promise<any>;
  getItemTranslation: (id: string) => Promise<any>;
  search: (params: any) => Promise<any>;
  refreshTokens: () => Promise<void>;
};
export = mercari;
