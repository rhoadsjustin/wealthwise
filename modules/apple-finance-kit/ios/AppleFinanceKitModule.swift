import ExpoModulesCore
import Foundation

#if canImport(FinanceKit)
import FinanceKit
#endif

public class AppleFinanceKitModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AppleFinanceKitModule")

    AsyncFunction("getAvailability") { () -> [String: Any] in
      try Self.requireFinanceKit()

      #if canImport(FinanceKit)
      if #available(iOS 17.4, *) {
        let isEntitled = Self.hasFinanceKitEntitlement()
        return [
          "platformSupported": true,
          "financeKitEntitled": isEntitled,
          "walletDataAvailable": isEntitled ? FinanceStore.isDataAvailable(.financialData) : false,
          "minimumSupportedIOSVersion": "17.4",
        ]
      }
      #endif

      return [
        "platformSupported": false,
        "financeKitEntitled": false,
        "walletDataAvailable": false,
        "minimumSupportedIOSVersion": "17.4",
      ]
    }

    AsyncFunction("getAuthorizationStatus") { () -> String in
      try Self.requireFinanceKit()
      try Self.requireFinancialDataAvailability()

      #if canImport(FinanceKit)
      if #available(iOS 17.4, *) {
        let status = try await FinanceStore.shared.authorizationStatus()
        return Self.serializeAuthorizationStatus(status)
      }
      #endif

      throw AppleFinanceKitError.unsupportedOS
    }

    AsyncFunction("requestAuthorization") { () -> String in
      try Self.requireFinanceKit()
      try Self.requireFinancialDataAvailability()

      #if canImport(FinanceKit)
      if #available(iOS 17.4, *) {
        let status = try await FinanceStore.shared.requestAuthorization()
        return Self.serializeAuthorizationStatus(status)
      }
      #endif

      throw AppleFinanceKitError.unsupportedOS
    }

    AsyncFunction("getAccounts") { () -> [[String: Any]] in
      try Self.requireFinanceKit()
      try Self.requireFinancialDataAvailability()

      #if canImport(FinanceKit)
      if #available(iOS 17.4, *) {
        let accounts = try await FinanceStore.shared.accounts(
          query: AccountQuery(sortDescriptors: [], predicate: nil, limit: nil, offset: nil)
        )
        return accounts.map(Self.serializeAccount)
      }
      #endif

      throw AppleFinanceKitError.unsupportedOS
    }

    AsyncFunction("getRecentTransactions") { (limit: Int?) -> [[String: Any]] in
      try Self.requireFinanceKit()
      try Self.requireFinancialDataAvailability()

      #if canImport(FinanceKit)
      if #available(iOS 17.4, *) {
        let normalizedLimit = max(1, min(limit ?? 100, 500))
        let transactions = try await FinanceStore.shared.transactions(
          query: TransactionQuery(
            sortDescriptors: [],
            predicate: nil,
            limit: normalizedLimit,
            offset: nil
          )
        )

        return transactions
          .sorted { left, right in
            let leftDate = left.postedDate ?? left.transactionDate
            let rightDate = right.postedDate ?? right.transactionDate
            return leftDate > rightDate
          }
          .prefix(normalizedLimit)
          .map(Self.serializeTransaction)
      }
      #endif

      throw AppleFinanceKitError.unsupportedOS
    }
  }
}

private enum AppleFinanceKitError: Error {
  case frameworkUnavailable
  case unsupportedOS
  case missingEntitlement
  case dataUnavailable
}

extension AppleFinanceKitError: LocalizedError {
  var errorDescription: String? {
    switch self {
    case .frameworkUnavailable:
      return "FinanceKit is unavailable in this build."
    case .unsupportedOS:
      return "FinanceKit requires iOS 17.4 or later."
    case .missingEntitlement:
      return "This build is missing the Apple FinanceKit entitlement."
    case .dataUnavailable:
      return "Financial data is not available in Apple Wallet on this device."
    }
  }
}

private extension AppleFinanceKitModule {
  static let isoFormatter: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
  }()

  static func requireFinanceKit() throws {
    #if canImport(FinanceKit)
    return
    #else
    throw AppleFinanceKitError.frameworkUnavailable
    #endif
  }

  static func requireFinancialDataAvailability() throws {
    #if canImport(FinanceKit)
    if #available(iOS 17.4, *) {
      guard hasFinanceKitEntitlement() else {
        throw AppleFinanceKitError.missingEntitlement
      }

      guard FinanceStore.isDataAvailable(.financialData) else {
        throw AppleFinanceKitError.dataUnavailable
      }
      return
    }
    #endif

    throw AppleFinanceKitError.unsupportedOS
  }

  static func hasFinanceKitEntitlement() -> Bool {
    let value = Bundle.main.object(forInfoDictionaryKey: "AppleFinanceKitEnabled")
    return value as? Bool ?? false
  }

  static func serializeAuthorizationStatus(_ status: AuthorizationStatus) -> String {
    switch status {
    case .authorized:
      return "authorized"
    case .denied:
      return "denied"
    case .notDetermined:
      return "notDetermined"
    @unknown default:
      return "unknown"
    }
  }

  static func serializeAccount(_ account: Account) -> [String: Any] {
    switch account {
    case .asset(let asset):
      var serialized: [String: Any] = [
        "id": asset.id.uuidString,
        "kind": "asset",
        "displayName": asset.displayName,
        "institutionName": asset.institutionName,
        "description": asset.accountDescription as Any,
        "currencyCode": asset.currencyCode,
      ]

      if #available(iOS 18.0, *) {
        serialized["openingDate"] = serializeDate(asset.openingDate) as Any
      }

      return serialized
    case .liability(let liability):
      var serialized: [String: Any] = [
        "id": liability.id.uuidString,
        "kind": "liability",
        "displayName": liability.displayName,
        "institutionName": liability.institutionName,
        "description": liability.accountDescription as Any,
        "currencyCode": liability.currencyCode,
        "creditLimit": serializeCurrencyAmount(liability.creditInformation.creditLimit) as Any,
        "minimumNextPaymentAmount": serializeCurrencyAmount(
          liability.creditInformation.minimumNextPaymentAmount
        ) as Any,
        "overduePaymentAmount": serializeCurrencyAmount(
          liability.creditInformation.overduePaymentAmount
        ) as Any,
        "nextPaymentDueDate": serializeDate(liability.creditInformation.nextPaymentDueDate) as Any,
      ]

      if #available(iOS 18.0, *) {
        serialized["openingDate"] = serializeDate(liability.openingDate) as Any
      }

      return serialized
    @unknown default:
      return [:]
    }
  }

  static func serializeTransaction(_ transaction: FinanceKit.Transaction) -> [String: Any] {
    [
      "id": transaction.id.uuidString,
      "accountId": transaction.accountID.uuidString,
      "description": transaction.transactionDescription,
      "originalDescription": transaction.originalTransactionDescription,
      "merchantName": transaction.merchantName as Any,
      "transactionDate": serializeDate(transaction.transactionDate),
      "postedDate": serializeDate(transaction.postedDate) as Any,
      "amount": serializeCurrencyAmount(transaction.transactionAmount),
      "foreignCurrencyAmount": serializeCurrencyAmount(transaction.foreignCurrencyAmount) as Any,
      "status": String(describing: transaction.status),
      "creditDebitIndicator": String(describing: transaction.creditDebitIndicator),
      "transactionType": String(describing: transaction.transactionType),
      "merchantCategoryCode": transaction.merchantCategoryCode.map { String(describing: $0) } as Any,
    ]
  }

  static func serializeCurrencyAmount(_ amount: CurrencyAmount?) -> [String: Any]? {
    guard let amount else { return nil }
    return [
      "amount": NSDecimalNumber(decimal: amount.amount).stringValue,
      "currencyCode": amount.currencyCode,
    ]
  }

  static func serializeDate(_ date: Date?) -> String? {
    guard let date else { return nil }
    return isoFormatter.string(from: date)
  }
}
