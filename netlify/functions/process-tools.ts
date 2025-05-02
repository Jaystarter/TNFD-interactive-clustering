import { Handler } from '@netlify/functions';
import { processToolsData, FeatureWeights } from '../../src/utils/clusteringUtils';

interface RequestBody {
  csvContent: string;
  similarityThreshold?: number;
  featureWeights?: FeatureWeights;
}

export const handler: Handler = async (event) => {
  try {
    const body: RequestBody = event.body ? JSON.parse(event.body) : {} as any;
    const { csvContent, similarityThreshold = 0.7, featureWeights } = body;

    if (!csvContent) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'csvContent field is required.' })
      };
    }

    const tools = await processToolsData(csvContent, similarityThreshold, featureWeights);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ tools })
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[process-tools] Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: message })
    };
  }
};
