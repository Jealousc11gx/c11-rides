import AVFoundation
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

struct Options {
  let inputPath: String
  let outputPath: String
  let fps: Double
  let maxWidth: Double
  let quality: Double
  let startTime: Double
  let endTime: Double?
}

func value(after flag: String, in args: [String]) -> String? {
  guard let index = args.firstIndex(of: flag), index + 1 < args.count else {
    return nil
  }

  return args[index + 1]
}

func parseOptions() -> Options {
  let args = CommandLine.arguments

  guard
    let inputPath = value(after: "--input", in: args),
    let outputPath = value(after: "--output", in: args)
  else {
    print("Usage: swift scripts/extract-frames.swift --input public/web_vedio.mp4 --output public/frames/web_vedio --fps 30 --width 1280 --quality 0.72 --start 0.35")
    exit(1)
  }

  let endValue = value(after: "--end", in: args).flatMap(Double.init)

  return Options(
    inputPath: inputPath,
    outputPath: outputPath,
    fps: Double(value(after: "--fps", in: args) ?? "30") ?? 30,
    maxWidth: Double(value(after: "--width", in: args) ?? "1280") ?? 1280,
    quality: Double(value(after: "--quality", in: args) ?? "0.72") ?? 0.72,
    startTime: Double(value(after: "--start", in: args) ?? "0.35") ?? 0.35,
    endTime: endValue
  )
}

func writeImage(_ image: CGImage, to url: URL, quality: Double) throws {
  guard let destination = CGImageDestinationCreateWithURL(
    url as CFURL,
    UTType.webP.identifier as CFString,
    1,
    nil
  ) else {
    throw NSError(
      domain: "FrameExtraction",
      code: 1,
      userInfo: [NSLocalizedDescriptionKey: "Cannot create WebP image destination"]
    )
  }

  let options = [
    kCGImageDestinationLossyCompressionQuality: quality,
  ] as CFDictionary

  CGImageDestinationAddImage(destination, image, options)

  if !CGImageDestinationFinalize(destination) {
    throw NSError(
      domain: "FrameExtraction",
      code: 2,
      userInfo: [NSLocalizedDescriptionKey: "Cannot write image at \(url.path)"]
    )
  }
}

let options = parseOptions()
let inputURL = URL(fileURLWithPath: options.inputPath)
let outputURL = URL(fileURLWithPath: options.outputPath)
let fileManager = FileManager.default

try? fileManager.removeItem(at: outputURL)
try fileManager.createDirectory(at: outputURL, withIntermediateDirectories: true)

let asset = AVURLAsset(url: inputURL)
let duration = try await asset.load(.duration)
let durationSeconds = CMTimeGetSeconds(duration)
let startTime = min(max(0, options.startTime), durationSeconds)
let sampleEndTime = min(max(startTime, options.endTime ?? durationSeconds), durationSeconds)
let sampleDuration = max(0.001, sampleEndTime - startTime)
let frameCount = Int(ceil(sampleDuration * options.fps)) + 1
let generator = AVAssetImageGenerator(asset: asset)
generator.appliesPreferredTrackTransform = true
generator.requestedTimeToleranceBefore = .zero
generator.requestedTimeToleranceAfter = .zero
generator.maximumSize = CGSize(width: options.maxWidth, height: options.maxWidth)

var manifestWidth = Int(options.maxWidth)
var manifestHeight = Int(options.maxWidth)

for index in 0..<frameCount {
  let seconds = min(startTime + Double(index) / options.fps, sampleEndTime)
  let time = CMTime(seconds: seconds, preferredTimescale: 600)
  let image = try generator.copyCGImage(at: time, actualTime: nil)
  let filename = "frame_\(String(index).padLeft(to: 4, with: "0")).webp"

  if index == 0 {
    manifestWidth = image.width
    manifestHeight = image.height
  }

  try writeImage(image, to: outputURL.appendingPathComponent(filename), quality: options.quality)

  if index % 25 == 0 || index == frameCount - 1 {
    print("wrote \(index + 1)/\(frameCount)")
  }
}

let manifest: [String: Any] = [
  "basePath": "/frames/web_vedio",
  "frameCount": frameCount,
  "fps": options.fps,
  "duration": sampleDuration,
  "startTime": startTime,
  "endTime": sampleEndTime,
  "width": manifestWidth,
  "height": manifestHeight,
  "pad": 4,
  "ext": "webp",
]
let manifestData = try JSONSerialization.data(withJSONObject: manifest, options: [.prettyPrinted, .sortedKeys])
try manifestData.write(to: outputURL.appendingPathComponent("manifest.json"))

print("done \(frameCount) frames")

extension String {
  func padLeft(to length: Int, with character: Character) -> String {
    if count >= length {
      return self
    }

    return String(repeating: String(character), count: length - count) + self
  }
}
