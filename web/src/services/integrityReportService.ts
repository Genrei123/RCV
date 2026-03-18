import { apiClient } from './axiosConfig';

export interface FieldComparison {
  field: string;
  label: string;
  dbValue: string | null;
  blockchainValue: string | null;
  match: boolean;
}

export interface ReportIntegrityCheckResult {
  reportId: string;
  status: 'intact' | 'tampered' | 'no_blockchain' | 'error' | 'data_loss';
  message: string;
  txHash: string | null;
  etherscanUrl: string | null;
  blockTimestamp: Date | null;
  fields: FieldComparison[];
  mismatchCount: number;
}

export const checkReportIntegrity = async (reportId: string): Promise<ReportIntegrityCheckResult> => {
  const response = await apiClient.get(`/integrity/check/report/${reportId}`);
  return response.data.data;
};
