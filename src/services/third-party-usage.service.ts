import axiosInstance from '../lib/axios';
import type { ThirdPartyUsageGroupBy, ThirdPartyUsageResponse } from '../types';

export async function getThirdPartyUsage(params: {
  groupBy: ThirdPartyUsageGroupBy;
  from?: string;
  to?: string;
  agentPublicId?: string;
  clientId?: string;
  externalTenantId?: string;
}): Promise<ThirdPartyUsageResponse> {
  const response = await axiosInstance.get('/v1/usage/third-party', {
    params: {
      group_by: params.groupBy,
      from: params.from,
      to: params.to,
      agent_public_id: params.agentPublicId,
      client_id: params.clientId,
      external_tenant_id: params.externalTenantId,
    },
  });

  return response.data;
}
