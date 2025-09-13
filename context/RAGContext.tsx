import React, { createContext, useState, useEffect, useContext } from 'react';
import { ExecuTorchEmbeddings } from '@react-native-rag/executorch';
import { ALL_MINILM_L6_V2 } from 'react-native-executorch';
import { type Message, MemoryVectorStore } from 'react-native-rag';

const VectorStoreContext = createContext<{
  vectorStore: MemoryVectorStore | null;
}>({
  vectorStore: null,
});

export const VectorStoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [vectorStore, setVectorStore] = useState<MemoryVectorStore | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        const embeddings = new ExecuTorchEmbeddings(ALL_MINILM_L6_V2);

        const store = await new MemoryVectorStore({
          embeddings,
        }).load();

        setVectorStore(store);
      } catch (error) {
        console.error('Failed to initialize vector store:', error);
      }
    };

    initialize();

    return () => {
      setVectorStore(null);
    };
  }, []);

  return (
    <VectorStoreContext.Provider value={{ vectorStore }}>{children}</VectorStoreContext.Provider>
  );
};

export const useVectorStore = () => useContext(VectorStoreContext);
