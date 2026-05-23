import ExpoModulesCore
import Foundation

#if canImport(PDFKit)
import PDFKit
#endif

#if canImport(Vision)
import Vision
#endif

#if canImport(UIKit)
import UIKit
#endif

#if canImport(VisionKit)
import VisionKit
#endif

public class DocumentImportKitModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DocumentImportKitModule")

    AsyncFunction("extractTextFromPdf") { (uri: String) throws -> String in
      try Self.extractTextFromPdf(uri: uri)
    }

    AsyncFunction("extractTextFromImage") { (uri: String) async throws -> String in
      try await Self.extractTextFromImage(uri: uri)
    }

    AsyncFunction("scanTextWithCamera") { () async throws -> String in
      try await Self.scanTextWithCamera()
    }
  }
}

private enum DocumentImportKitError: Error {
  case invalidURI
  case frameworkUnavailable
  case scannerUnsupported
  case scannerUnavailable
  case unreadableDocument
  case unreadableImage
  case noTextFound
  case userCancelled
  case presentationFailed
}

extension DocumentImportKitError: LocalizedError {
  var errorDescription: String? {
    switch self {
    case .invalidURI:
      return "The selected file could not be opened."
    case .frameworkUnavailable:
      return "This build does not include the required iOS document extraction frameworks."
    case .scannerUnsupported:
      return "Live text scanning is not supported on this device."
    case .scannerUnavailable:
      return "The camera scanner is not currently available."
    case .unreadableDocument:
      return "The selected PDF could not be read."
    case .unreadableImage:
      return "The selected image could not be processed."
    case .noTextFound:
      return "No readable transaction text was found in the selected file."
    case .userCancelled:
      return "Scanning was cancelled."
    case .presentationFailed:
      return "The camera scanner could not be presented."
    }
  }
}

private extension DocumentImportKitModule {
  static var activeScannerCoordinator: LiveTextScannerCoordinator?

  static func extractTextFromPdf(uri: String) throws -> String {
    #if canImport(PDFKit)
    let fileURL = try resolveFileURL(uri)
    guard let document = PDFDocument(url: fileURL) else {
      throw DocumentImportKitError.unreadableDocument
    }

    var pages: [String] = []
    for index in 0..<document.pageCount {
      guard let page = document.page(at: index) else { continue }
      let text = page.string?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
      if !text.isEmpty {
        pages.append(text)
      }
    }

    let result = pages.joined(separator: "\n\n")
    guard !result.isEmpty else {
      throw DocumentImportKitError.noTextFound
    }

    return result
    #else
    throw DocumentImportKitError.frameworkUnavailable
    #endif
  }

  static func extractTextFromImage(uri: String) async throws -> String {
    #if canImport(Vision) && canImport(UIKit)
    let fileURL = try resolveFileURL(uri)

    guard let image = UIImage(contentsOfFile: fileURL.path) else {
      throw DocumentImportKitError.unreadableImage
    }

    let cgImage: CGImage
    if let imageRef = image.cgImage {
      cgImage = imageRef
    } else {
      throw DocumentImportKitError.unreadableImage
    }

    return try await withCheckedThrowingContinuation { continuation in
      let request = VNRecognizeTextRequest { request, error in
        if let error {
          continuation.resume(throwing: error)
          return
        }

        let observations = request.results as? [VNRecognizedTextObservation] ?? []
        let lines = observations.compactMap { observation in
          observation.topCandidates(1).first?.string.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        let result = lines.filter { !$0.isEmpty }.joined(separator: "\n")

        if result.isEmpty {
          continuation.resume(throwing: DocumentImportKitError.noTextFound)
          return
        }

        continuation.resume(returning: result)
      }

      request.recognitionLevel = .accurate
      request.usesLanguageCorrection = true

      DispatchQueue.global(qos: .userInitiated).async {
        do {
          let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
          try handler.perform([request])
        } catch {
          continuation.resume(throwing: error)
        }
      }
    }
    #else
    throw DocumentImportKitError.frameworkUnavailable
    #endif
  }

  static func scanTextWithCamera() async throws -> String {
    #if canImport(VisionKit) && canImport(UIKit)
    if #available(iOS 16.0, *) {
      guard DataScannerViewController.isSupported else {
        throw DocumentImportKitError.scannerUnsupported
      }

      guard DataScannerViewController.isAvailable else {
        throw DocumentImportKitError.scannerUnavailable
      }

      return try await withCheckedThrowingContinuation { continuation in
        DispatchQueue.main.async {
          guard let presenter = topViewController() else {
            continuation.resume(throwing: DocumentImportKitError.presentationFailed)
            return
          }

          let coordinator = LiveTextScannerCoordinator(continuation: continuation) {
            activeScannerCoordinator = nil
          }
          activeScannerCoordinator = coordinator
          coordinator.present(from: presenter)
        }
      }
    }
    #endif

    throw DocumentImportKitError.frameworkUnavailable
  }

  static func resolveFileURL(_ uri: String) throws -> URL {
    if let url = URL(string: uri), url.isFileURL {
      return url
    }

    if uri.hasPrefix("/") {
      return URL(fileURLWithPath: uri)
    }

    throw DocumentImportKitError.invalidURI
  }

  static func topViewController(
    base: UIViewController? = UIApplication.shared
      .connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap { $0.windows }
      .first(where: \.isKeyWindow)?
      .rootViewController
  ) -> UIViewController? {
    if let navigationController = base as? UINavigationController {
      return topViewController(base: navigationController.visibleViewController)
    }

    if let tabBarController = base as? UITabBarController,
      let selectedViewController = tabBarController.selectedViewController
    {
      return topViewController(base: selectedViewController)
    }

    if let presentedViewController = base?.presentedViewController {
      return topViewController(base: presentedViewController)
    }

    return base
  }
}

#if canImport(VisionKit) && canImport(UIKit)
@available(iOS 16.0, *)
private final class LiveTextScannerCoordinator: NSObject, DataScannerViewControllerDelegate {
  private let continuation: CheckedContinuation<String, Error>
  private let onFinish: () -> Void
  private var latestText = ""
  private var hasFinished = false
  private weak var navigationController: UINavigationController?

  init(continuation: CheckedContinuation<String, Error>, onFinish: @escaping () -> Void) {
    self.continuation = continuation
    self.onFinish = onFinish
  }

  func present(from presenter: UIViewController) {
    let scannerViewController = DataScannerViewController(
      recognizedDataTypes: [.text()],
      qualityLevel: .accurate,
      recognizesMultipleItems: true,
      isHighFrameRateTrackingEnabled: false,
      isPinchToZoomEnabled: true,
      isGuidanceEnabled: true,
      isHighlightingEnabled: true
    )
    scannerViewController.delegate = self
    scannerViewController.title = "Scan Statement"
    scannerViewController.navigationItem.leftBarButtonItem = UIBarButtonItem(
      barButtonSystemItem: .cancel,
      target: self,
      action: #selector(cancelTapped)
    )
    scannerViewController.navigationItem.rightBarButtonItem = UIBarButtonItem(
      title: "Use Text",
      style: .done,
      target: self,
      action: #selector(useTextTapped)
    )

    let navigationController = UINavigationController(rootViewController: scannerViewController)
    self.navigationController = navigationController

    presenter.present(navigationController, animated: true) {
      do {
        try scannerViewController.startScanning()
      } catch {
        self.finish(with: .failure(error))
      }
    }
  }

  func dataScanner(
    _ dataScanner: DataScannerViewController,
    didAdd addedItems: [RecognizedItem],
    allItems: [RecognizedItem]
  ) {
    latestText = extractText(from: allItems)
  }

  func dataScanner(
    _ dataScanner: DataScannerViewController,
    didUpdate updatedItems: [RecognizedItem],
    allItems: [RecognizedItem]
  ) {
    latestText = extractText(from: allItems)
  }

  func dataScanner(
    _ dataScanner: DataScannerViewController,
    didRemove removedItems: [RecognizedItem],
    allItems: [RecognizedItem]
  ) {
    latestText = extractText(from: allItems)
  }

  @objc private func cancelTapped() {
    finish(with: .failure(DocumentImportKitError.userCancelled))
  }

  @objc private func useTextTapped() {
    let trimmed = latestText.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else {
      finish(with: .failure(DocumentImportKitError.noTextFound))
      return
    }

    finish(with: .success(trimmed))
  }

  private func extractText(from items: [RecognizedItem]) -> String {
    let values = items.compactMap { item -> String? in
      switch item {
      case .text(let text):
        return text.transcript.trimmingCharacters(in: .whitespacesAndNewlines)
      default:
        return nil
      }
    }

    return values.filter { !$0.isEmpty }.joined(separator: "\n")
  }

  private func finish(with result: Result<String, Error>) {
    guard !hasFinished else { return }
    hasFinished = true

    navigationController?.dismiss(animated: true)
    onFinish()

    switch result {
    case .success(let text):
      continuation.resume(returning: text)
    case .failure(let error):
      continuation.resume(throwing: error)
    }
  }
}
#endif
