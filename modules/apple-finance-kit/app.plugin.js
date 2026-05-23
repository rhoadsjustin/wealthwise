const {
  createRunOncePlugin,
  withEntitlementsPlist,
  withInfoPlist,
} = require('expo/config-plugins');

const pkg = require('./package.json');

const FINANCE_KIT_ENTITLEMENT = 'com.apple.developer.financekit';
const FINANCE_KIT_ENABLED_INFO_PLIST_KEY = 'AppleFinanceKitEnabled';
const DEFAULT_USAGE_DESCRIPTION =
  'Allow $(PRODUCT_NAME) to read Apple Wallet financial data so it can import your Apple Card transactions and balances into your budget.';

const withAppleFinanceKit = (config, props = {}) => {
  const usageDescription = props.usageDescription || DEFAULT_USAGE_DESCRIPTION;
  const enabled = props.enabled !== false;

  config = withInfoPlist(config, (config) => {
    config.modResults.NSFinancialDataUsageDescription = usageDescription;
    config.modResults[FINANCE_KIT_ENABLED_INFO_PLIST_KEY] = enabled;
    return config;
  });

  config = withEntitlementsPlist(config, (config) => {
    if (enabled) {
      config.modResults[FINANCE_KIT_ENTITLEMENT] = true;
    } else {
      delete config.modResults[FINANCE_KIT_ENTITLEMENT];
    }
    return config;
  });

  return config;
};

module.exports = createRunOncePlugin(withAppleFinanceKit, pkg.name, pkg.version);
