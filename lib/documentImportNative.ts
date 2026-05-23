import { Platform } from 'react-native';
import DocumentImportKitModule from '@/modules/document-import-kit';

function ensureIOS() {
  if (Platform.OS !== 'ios') {
    throw new Error('Document OCR and PDF extraction are only available on iOS right now.');
  }

  return DocumentImportKitModule;
}

export async function extractTextFromPdf(uri: string) {
  return ensureIOS().extractTextFromPdf(uri);
}

export async function extractTextFromImage(uri: string) {
  return ensureIOS().extractTextFromImage(uri);
}

export async function scanTextWithCamera() {
  return ensureIOS().scanTextWithCamera();
}
