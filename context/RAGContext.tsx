import React, { createContext, useState, useEffect, useContext } from 'react';
import { AppState, Platform } from 'react-native';
import { setVectorStore as setCategorizerVectorStore } from '@/lib/ai/categorizer';
import { ExecuTorchEmbeddings, ExecuTorchLLM } from '@/lib/ai/executorchAdapters';
import { initializeExecutorch } from '@/lib/ai/executorchInit';
import * as FileSystem from 'expo-file-system/legacy';

type VectorStoreInstance = {
  unload?: () => Promise<void>;
};

type LlmInstance = {
  unload?: () => Promise<void>;
};

const VectorStoreContext = createContext<{
  vectorStore: VectorStoreInstance | null;
  llm: LlmInstance | null;
  embeddingsProgress: number; // 0..1
  llmProgress: number; // 0..1
  embeddingsInstalled: boolean;
  llmInstalled: boolean;
}>({
  vectorStore: null,
  llm: null,
  embeddingsProgress: 0,
  llmProgress: 0,
  embeddingsInstalled: false,
  llmInstalled: false,
});

export const VectorStoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [vectorStore, setVectorStore] = useState<VectorStoreInstance | null>(null);
  const [llm, setLlm] = useState<LlmInstance | null>(null);
  const [embeddingsProgress, setEmbeddingsProgress] = useState(0);
  const [llmProgress, setLlmProgress] = useState(0);
  const [embeddingsInstalled, setEmbeddingsInstalled] = useState(false);
  const [llmInstalled, setLlmInstalled] = useState(false);

  // react-native-executorch stores files under documentDirectory/react-native-executorch
  const RNEDirectory = `${FileSystem.documentDirectory}react-native-executorch/`;

  const getFilenameFromUri = (uri: string) => {
    let cleanUri = uri.replace(/^https?:\/\//, '');
    cleanUri = cleanUri.split('#')?.[0] ?? cleanUri;
    return cleanUri.replace(/[^a-zA-Z0-9._-]/g, '_');
  };

  const fileExists = async (uri: string) => {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      return !!info.exists;
    } catch {
      return false;
    }
  };
  useEffect(() => {
    const initialize = async () => {
      try {
        if (Platform.OS === 'web') {
          return;
        }

        await initializeExecutorch();

        const [executorchModels, { MemoryVectorStore }] = await Promise.all([
          import('react-native-executorch'),
          import('react-native-rag'),
        ]);

        const { ALL_MINILM_L6_V2, LLAMA3_2_1B } = executorchModels;

        // Preflight: check if resources already exist on disk
        try {
          const embeddingsModelFile = `${RNEDirectory}${getFilenameFromUri((ALL_MINILM_L6_V2 as any).modelSource)}`;
          const embeddingsTokenizerFile = `${RNEDirectory}${getFilenameFromUri((ALL_MINILM_L6_V2 as any).tokenizerSource)}`;
          const hasEmbeddings =
            (await fileExists(embeddingsModelFile)) && (await fileExists(embeddingsTokenizerFile));
          setEmbeddingsInstalled(hasEmbeddings);
          if (hasEmbeddings) setEmbeddingsProgress(1);

          const llmModelFile = `${RNEDirectory}${getFilenameFromUri((LLAMA3_2_1B as any).modelSource)}`;
          const llmTokenizerFile = `${RNEDirectory}${getFilenameFromUri((LLAMA3_2_1B as any).tokenizerSource)}`;
          const llmTokenizerConfigFile = `${RNEDirectory}${getFilenameFromUri((LLAMA3_2_1B as any).tokenizerConfigSource)}`;
          const hasLLM =
            (await fileExists(llmModelFile)) &&
            (await fileExists(llmTokenizerFile)) &&
            (await fileExists(llmTokenizerConfigFile));
          setLlmInstalled(hasLLM);
          if (hasLLM) setLlmProgress(1);
        } catch {
          // ignore preflight errors; downloads will proceed as normal later
        }

        // Create embeddings and vector store, but defer heavy model loads
        const embeddings = new ExecuTorchEmbeddings({
          ...(ALL_MINILM_L6_V2 as any),
          onDownloadProgress: (p: number) => setEmbeddingsProgress(p),
        } as any);
        const store = new MemoryVectorStore({ embeddings });

        // Configure the LLM with conservative generation settings to reduce memory
        const llm = new ExecuTorchLLM({
          ...(LLAMA3_2_1B as any),
          onDownloadProgress: (p: number) => setLlmProgress(p),
          chatConfig: {
            maxTokens: 256,
            temperature: 0.3,
            topK: 20,
            topP: 0.9,
          },
        } as any);

        setVectorStore(store);
        setCategorizerVectorStore(store as any);
        setLlm(llm);
      } catch (error) {
        console.error('Failed to initialize vector store:', error);
      }
    };

    initialize();

    return () => {
      setVectorStore(null);
      setLlm(null);
    };
  }, [RNEDirectory]);

  // Unload models when app goes to background; keep latest instances via deps
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active') {
        try {
          if (vectorStore?.unload) {
            await vectorStore.unload();
          }
          if (llm?.unload) {
            await llm.unload();
          }
        } catch {
          // no-op
        }
      }
    });
    return () => sub.remove();
  }, [vectorStore, llm]);

  return (
    <VectorStoreContext.Provider
      value={{
        vectorStore,
        llm,
        embeddingsProgress,
        llmProgress,
        embeddingsInstalled,
        llmInstalled,
      }}>
      {children}
    </VectorStoreContext.Provider>
  );
};

export const useVectorStore = () => useContext(VectorStoreContext);
