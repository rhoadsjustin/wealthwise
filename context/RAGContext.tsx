import React, { createContext, useState, useEffect, useContext } from 'react';
import { ExecuTorchEmbeddings, ExecuTorchLLM } from '@react-native-rag/executorch';
import { ALL_MINILM_L6_V2, LLAMA3_2_1B } from 'react-native-executorch';
import { MemoryVectorStore } from 'react-native-rag';
import categorizer from '@/lib/ai/categorizer';

const VectorStoreContext = createContext<{
  vectorStore: MemoryVectorStore | null;
  llm: ExecuTorchLLM | null;
  embeddingsProgress: number; // 0..1
  llmProgress: number; // 0..1
}>({
  vectorStore: null,
  llm: null,
  embeddingsProgress: 0,
  llmProgress: 0,
});

export const VectorStoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [vectorStore, setVectorStore] = useState<MemoryVectorStore | null>(null);
  const [llm, setLlm] = useState<ExecuTorchLLM | null>(null);
  const [embeddingsProgress, setEmbeddingsProgress] = useState(0);
  const [llmProgress, setLlmProgress] = useState(0);
  useEffect(() => {
    const initialize = async () => {
      try {
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

  return (
    <VectorStoreContext.Provider value={{ vectorStore, llm, embeddingsProgress, llmProgress }}>
      {children}
    </VectorStoreContext.Provider>
  );
};

export const useVectorStore = () => useContext(VectorStoreContext);
