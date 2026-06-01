import { requireNativeModule } from 'expo';

type DocumentImportKitNativeModule = {
  extractTextFromPdf(uri: string): Promise<string>;
  extractPdfPages(uri: string): Promise<{ pageNumber: number; text: string }[]>;
  extractTextFromImage(uri: string): Promise<string>;
  scanTextWithCamera(): Promise<string>;
};

let nativeModule: DocumentImportKitNativeModule | null = null;

function getNativeModule(): DocumentImportKitNativeModule {
  if (nativeModule) {
    return nativeModule;
  }

  nativeModule = requireNativeModule<DocumentImportKitNativeModule>('DocumentImportKitModule');
  return nativeModule;
}

const DocumentImportKitModuleProxy: DocumentImportKitNativeModule = {
  extractTextFromPdf(uri: string) {
    return getNativeModule().extractTextFromPdf(uri);
  },
  extractPdfPages(uri: string) {
    return getNativeModule().extractPdfPages(uri);
  },
  extractTextFromImage(uri: string) {
    return getNativeModule().extractTextFromImage(uri);
  },
  scanTextWithCamera() {
    return getNativeModule().scanTextWithCamera();
  },
};

export default DocumentImportKitModuleProxy;
