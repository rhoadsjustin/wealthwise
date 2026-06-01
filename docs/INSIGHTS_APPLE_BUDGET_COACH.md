# Apple Budget Coach Insights

This feature adds an on-device budget analysis option inside the Insights tab. A new segmented toggle lets a user switch from the chat assistant to "Apple coach". When selected, the UI trains and queries a native Create ML pipeline that lives in `BudgetInsightsModule` (Swift) and surfaces category classifications and budget adjustment recommendations.

See also: [`docs/OFFLINE_FINANCE_ASSISTANT_STRATEGY.md`](./OFFLINE_FINANCE_ASSISTANT_STRATEGY.md)

## How it works

- `lib/ai/appleBudgetAdvisor.ts` derives six months of category snapshots from DataContext transactions and budgets. Each snapshot includes spend totals, budget amount, and lightweight metadata.
- The snapshots are passed to `BudgetInsightsModule.trainBudgetModels`. The native module wraps Create ML's `MLClassifier` and `MLRecommender` (guarded with `#if canImport(CreateML)`), returning:
  - per-category classifications (predicted status, confidence, variance)
  - recommendation rows with opportunity scores
  - metadata such as training accuracy and sample counts
- The Insights UI displays the latest month breakdown, guidance copy, and a retrain button. Errors such as “Create ML unavailable” are surfaced inline.

## Apple budget chat (iOS 18+)

- `lib/ai/appleBudgetChat.ts` orchestrates a lightweight tool-call loop for the on-device Apple advisor. It composes system instructions, watches for `<tool_call>` markers emitted by the native model, and resolves them with DataContext-backed summaries.
- The tool definition (`fetchBudgetContext`) can return overall summaries, category snapshots, top spenders, or trimmed transaction lists. Results are injected into the follow-up prompt so the model never touches SQLite directly.
- `AppleBudgetChatModule.swift` is an Expo module compatible with the new architecture. It inspects each conversation turn and either issues a tool call or synthesizes guidance based on the latest tool payload. The module is pure Swift and runs entirely on device.
- The Insights tab now renders a “Apple budget Q&A” card that mirrors the chat experience: iOS devices can ask natural-language questions, and other platforms receive a friendly notice that the feature is iOS-only.

## Platform notes

- Training requires a device/simulator with Create ML availability. The JS layer traps `feature_unavailable` and provides a friendly message instead of failing.
- When budgets or expenses are sparse the module asks for at least three snapshots before attempting to train.

## Maintenance tips

- If new budget fields are added, update the snapshot builder and Swift trainer to keep schemas in sync.
- `BudgetInsightsModule` is registered via the Xcode project. Remember to re-run `npx pod-install` after modifying native files.
- The Expo Insights tab relies on the same DataContext feed; no direct SQLite access is required.
