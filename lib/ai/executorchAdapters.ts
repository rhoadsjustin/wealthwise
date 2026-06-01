import type { ChatConfig } from 'react-native-executorch';
import type { Embeddings, LLM, Message, ResourceSource } from 'react-native-rag';

interface ExecuTorchEmbeddingsParams {
  modelSource: ResourceSource;
  tokenizerSource: ResourceSource;
  onDownloadProgress?: (progress: number) => void;
}

export class ExecuTorchEmbeddings implements Embeddings {
  private module: {
    delete: () => void;
    forward: (text: string) => PromiseLike<ArrayLike<number>>;
  } | null = null;
  private modelSource: ResourceSource;
  private tokenizerSource: ResourceSource;
  private onDownloadProgress: (progress: number) => void;
  private isLoaded = false;

  constructor({
    modelSource,
    tokenizerSource,
    onDownloadProgress = () => {},
  }: ExecuTorchEmbeddingsParams) {
    this.modelSource = modelSource;
    this.tokenizerSource = tokenizerSource;
    this.onDownloadProgress = onDownloadProgress;
  }

  async load() {
    if (!this.isLoaded) {
      const { TextEmbeddingsModule } = await import('react-native-executorch');
      this.module = await TextEmbeddingsModule.fromCustomModel(
        this.modelSource,
        this.tokenizerSource,
        this.onDownloadProgress
      );
      this.isLoaded = true;
    }

    return this;
  }

  async unload() {
    this.module?.delete();
  }

  async embed(text: string): Promise<number[]> {
    if (!this.module) {
      throw new Error('ExecuTorch embeddings model is not loaded.');
    }

    return Array.from(await this.module.forward(text));
  }
}

interface ExecuTorchLLMParams {
  modelSource: ResourceSource;
  tokenizerSource: ResourceSource;
  tokenizerConfigSource: ResourceSource;
  onDownloadProgress?: (progress: number) => void;
  responseCallback?: (response: string) => void;
  chatConfig?: Partial<ChatConfig>;
}

export class ExecuTorchLLM implements LLM {
  private module: {
    configure: (config: { chatConfig?: Partial<ChatConfig> }) => void;
    interrupt: () => void;
    delete: () => void;
    setTokenCallback: (config: { tokenCallback: (token: string) => void }) => void;
    generate: (messages: Message[]) => Promise<string>;
  } | null = null;
  private modelSource: ResourceSource;
  private tokenizerSource: ResourceSource;
  private tokenizerConfigSource: ResourceSource;
  private onDownloadProgress: (progress: number) => void;
  private chatConfig: Partial<ChatConfig> | undefined;
  private isLoaded = false;

  constructor({
    modelSource,
    tokenizerSource,
    tokenizerConfigSource,
    onDownloadProgress = () => {},
    responseCallback = () => {},
    chatConfig,
  }: ExecuTorchLLMParams) {
    this.modelSource = modelSource;
    this.tokenizerSource = tokenizerSource;
    this.tokenizerConfigSource = tokenizerConfigSource;
    this.onDownloadProgress = onDownloadProgress;
    this.chatConfig = chatConfig;
    this.responseCallback = responseCallback;
  }

  private responseCallback: (response: string) => void;

  async load() {
    if (!this.isLoaded) {
      const { LLMModule } = await import('react-native-executorch');
      this.module = await LLMModule.fromCustomModel(
        this.modelSource,
        this.tokenizerSource,
        this.tokenizerConfigSource,
        this.onDownloadProgress,
        undefined,
        (messageHistory) => {
          const assistantMessages = messageHistory.filter(
            (message) => message.role === 'assistant'
          );
          const latestAssistant = assistantMessages[assistantMessages.length - 1];
          this.responseCallback(latestAssistant?.content ?? '');
        }
      );
      this.module.configure({
        chatConfig: this.chatConfig,
      });
      this.isLoaded = true;
    }

    return this;
  }

  async interrupt() {
    this.module?.interrupt();
  }

  async unload() {
    if (!this.module) {
      return;
    }

    this.module.interrupt();
    this.module.delete();
  }

  async generate(messages: Message[], callback: (token: string) => void) {
    if (!this.module) {
      throw new Error('ExecuTorch LLM is not loaded.');
    }

    this.module.setTokenCallback({ tokenCallback: callback });
    return this.module.generate(messages);
  }
}
