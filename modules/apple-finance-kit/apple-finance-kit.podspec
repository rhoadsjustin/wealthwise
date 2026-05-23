require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name             = 'apple-finance-kit'
  s.version          = package['version']
  s.summary          = package['description']
  s.description      = 'Local Expo module that exposes Apple FinanceKit APIs for Apple Wallet and Apple Card imports in WealthWise.'
  s.license          = package['license']
  s.author           = 'Local Project'
  s.homepage         = 'https://docs.expo.dev/modules/overview/'
  s.platforms        = {
    :ios => '17.4'
  }
  s.swift_version    = '5.9'
  s.source           = { :git => 'https://example.invalid/local-expo-module', :tag => s.version.to_s }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }

  s.source_files = 'ios/**/*.{h,m,swift}'
end
