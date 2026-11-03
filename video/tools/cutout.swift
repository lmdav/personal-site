// Cuts the subjects out of a photo with macOS Vision (no download needed).
// Writes all.png (every subject) and instance-N.png (each subject alone),
// cropped to the subject, with a transparent background.
// Usage: swift tools/cutout.swift <photo> <output folder>
import CoreImage
import Foundation
import Vision

let args = CommandLine.arguments
guard args.count == 3 else {
  print("Usage: swift tools/cutout.swift <photo> <output folder>")
  exit(1)
}
let input = URL(fileURLWithPath: args[1])
let outDir = URL(fileURLWithPath: args[2])
try FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)

let handler = VNImageRequestHandler(url: input)
let request = VNGenerateForegroundInstanceMaskRequest()
try handler.perform([request])
guard let result = request.results?.first else {
  print("No subject found in \(input.lastPathComponent)")
  exit(1)
}

let context = CIContext()
let srgb = CGColorSpace(name: CGColorSpace.sRGB)!
func save(_ buffer: CVPixelBuffer, _ name: String) throws {
  try context.writePNGRepresentation(
    of: CIImage(cvPixelBuffer: buffer), to: outDir.appendingPathComponent(name), format: .RGBA8, colorSpace: srgb)
}

let all = result.allInstances
try save(try result.generateMaskedImage(ofInstances: all, from: handler, croppedToInstancesExtent: true), "all.png")
for i in all {
  let one = try result.generateMaskedImage(ofInstances: IndexSet(integer: i), from: handler, croppedToInstancesExtent: true)
  try save(one, "instance-\(i).png")
}
print("\(input.lastPathComponent): \(all.count) subject(s)")
