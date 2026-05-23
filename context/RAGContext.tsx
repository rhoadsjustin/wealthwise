import React, { createContext, useState, useEffect, useContext } from 'react';
import { AppState } from 'react-native';
import { ExecuTorchEmbeddings, ExecuTorchLLM } from '@react-native-rag/executorch';
import { ALL_MINILM_L6_V2, LLAMA3_2_1B } from 'react-native-executorch';
import { MemoryVectorStore } from 'react-native-rag';
import categorizer from '@/lib/ai/categorizer';
import * as FileSystem from 'expo-file-system/legacy';

const VectorStoreContext = createContext<{
  vectorStore: MemoryVectorStore | null;
  llm: ExecuTorchLLM | null;
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
  const [vectorStore, setVectorStore] = useState<MemoryVectorStore | null>(null);
  const [llm, setLlm] = useState<ExecuTorchLLM | null>(null);
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
        } catch (e) {
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
        categorizer.setVectorStore(store);
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
  }, []);

  // Unload models when app goes to background; keep latest instances via deps
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active') {
        try {
          await vectorStore?.unload();
          await llm?.unload();
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
