import { processToolsData, FeatureWeights } from '../utils/clusteringUtils';

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = async (e: MessageEvent) => {
  const { csvContent, similarityThreshold, featureWeights } = e.data as {
    csvContent: string;
    similarityThreshold: number;
    featureWeights: FeatureWeights;
  };
  try {
    const tools = await processToolsData(csvContent, similarityThreshold, featureWeights);
    self.postMessage({ tools });
  } catch (error) {
    self.postMessage({ error: (error as Error).message });
  }
};
