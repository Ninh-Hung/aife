import axiosInstance from '../lib/axios';
import type { ApiKeyUsageGroupBy, ApiKeyUsageResponse } from '../types';

export async function getApiKeyUsage(params: {
  groupBy: ApiKeyUsageGroupBy;
  from?: string;
  to?: string;
  apiKeyPublicId?: string;
  agentPublicId?: string;
  capability?: string;
}): Promise<ApiKeyUsageResponse> {
  const response = await axiosInstance.get('/v1/usage/api-keys', {
    params: {
      group_by: params.groupBy,
      from: params.from,
      to: params.to,
      api_key_public_id: params.apiKeyPublicId,
      agent_public_id: params.agentPublicId,
      capability: params.capability,
    },
  });

  return response.data;
}
