export interface IExchangeRate {
  id: string;
  organizationId: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  updatedAt: Date;
  createdAt: Date;
}

export interface ICreateExchangeRate {
  organizationId: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
}

export interface IUpdateExchangeRate {
  rate: number;
}
