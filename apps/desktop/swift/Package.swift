// swift-tools-version: 5.10
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "recorder-cli",
    platforms: [
        .macOS(.v13)
    ],
    targets: [
        .executableTarget(
            name: "recorder-cli",
            linkerSettings: [
                .linkedFramework("AVFoundation"),
                .linkedFramework("ScreenCaptureKit"),
                .linkedFramework("CoreMedia"),
                .linkedFramework("CoreGraphics")
            ]
        )
    ]
)
