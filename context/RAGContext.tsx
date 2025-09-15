import React, { createContext, useState, useEffect, useContext } from 'react';
import { ExecuTorchEmbeddings, ExecuTorchLLM } from '@react-native-rag/executorch';
import { ALL_MINILM_L6_V2, LLAMA3_2_1B } from 'react-native-executorch';
import { type Message, MemoryVectorStore, useRAG } from 'react-native-rag';

const VectorStoreContext = createContext<{
  vectorStore: MemoryVectorStore | null;
  llm: ExecuTorchLLM | null;
}>({
  vectorStore: null,
  llm: null,
});

export const VectorStoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [vectorStore, setVectorStore] = useState<MemoryVectorStore | null>(null);
  const [llm, setLlm] = useState<ExecuTorchLLM | null>(null);
  useEffect(() => {
    const initialize = async () => {
      try {
        const embeddings = new ExecuTorchEmbeddings(ALL_MINILM_L6_V2);

        const store = await new MemoryVectorStore({
          embeddings,
        }).load();

        const llm = new ExecuTorchLLM(LLAMA3_2_1B);

        setVectorStore(store);
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
    <VectorStoreContext.Provider value={{ vectorStore, llm }}>
      {children}
    </VectorStoreContext.Provider>
  );
};

export const useVectorStore = () => useContext(VectorStoreContext);
