/**
 * 纯 JS 的 GIF89a 编码器，支持多帧 + 帧间延迟。
 * 不依赖任何第三方库，在浏览器中直接使用。
 */

export interface GifFrame {
  imageData: ImageData
  delay: number // 帧延迟，单位：百分之一秒 (cs)，例如 100 = 1 秒
}

interface OctreeNode {
  r: number; g: number; b: number
  count: number
  children: (OctreeNode | null)[]
  leafCount: number
  isLeaf: boolean
}

// ---- 八叉树颜色量化 ----

function createOctreeNode(): OctreeNode {
  return { r: 0, g: 0, b: 0, count: 0, children: Array(8).fill(null), leafCount: 0, isLeaf: false }
}

function octreeIndex(r: number, g: number, b: number, level: number): number {
  const bit = 7 - level
  const ri = (r >> bit) & 1
  const gi = (g >> bit) & 1
  const bi = (b >> bit) & 1
  return (ri << 2) | (gi << 1) | bi
}

const MAX_LEAVES = 256

function octreeInsert(node: OctreeNode, r: number, g: number, b: number, level: number): void {
  if (node.isLeaf) {
    node.count++
    node.r += r; node.g += g; node.b += b
    return
  }
  const idx = octreeIndex(r, g, b, level)
  if (!node.children[idx]) {
    const child = createOctreeNode()
    node.children[idx] = child
    if (level === 7) {
      child.isLeaf = true
      node.leafCount++
    }
  }
  octreeInsert(node.children[idx]!, r, g, b, level + 1)
}

function octreeReduce(root: OctreeNode): number {
  // 找到可合并的最深层节点
  function findTarget(node: OctreeNode): OctreeNode | null {
    if (node.isLeaf) return null
    let best: OctreeNode | null = null
    let bestDepth = -1
    function walk(n: OctreeNode, depth: number): void {
      if (n.isLeaf) return
      // 如果有叶子子节点，这是一个候选
      if (depth > bestDepth) {
        for (const child of n.children) {
          if (child && child.isLeaf) { best = n; bestDepth = depth; return }
        }
      }
      for (const child of n.children) {
        if (child) walk(child, depth + 1)
      }
    }
    walk(node, 0)
    return best
  }

  const targetNode = findTarget(root)
  if (!targetNode) return 0

  let removed = 0
  for (let i = 0; i < 8; i++) {
    const child = targetNode.children[i]
    if (child && child.isLeaf) {
      targetNode.r += child.r; targetNode.g += child.g; targetNode.b += child.b
      targetNode.count += child.count
      targetNode.children[i] = null
      targetNode.leafCount--
      removed++
    }
  }
  targetNode.isLeaf = true
  targetNode.leafCount = 0
  return removed
}

function octreeToPalette(root: OctreeNode): [number, number, number][] {
  const palette: [number, number, number][] = []
  function collect(node: OctreeNode): void {
    if (node.isLeaf && node.count > 0) {
      palette.push([
        Math.round(node.r / node.count),
        Math.round(node.g / node.count),
        Math.round(node.b / node.count),
      ])
    } else {
      for (const child of node.children) {
        if (child) collect(child)
      }
    }
  }
  collect(root)
  return palette
}

function quantizeColors(pixels: Uint8ClampedArray, colorCount: number): {
  palette: [number, number, number][]
  indexed: Uint8Array
} {
  const root = createOctreeNode()

  // Insert all pixels
  for (let i = 0; i < pixels.length; i += 4) {
    octreeInsert(root, pixels[i], pixels[i + 1], pixels[i + 2], 0)
  }

  // Reduce to max colors
  while (root.leafCount > colorCount) {
    octreeReduce(root)
  }

  const palette = octreeToPalette(root)
  while (palette.length < 2) palette.push([0, 0, 0])

  // Pad to power of 2
  let paddedLen = 2
  while (paddedLen < palette.length) paddedLen <<= 1
  while (palette.length < paddedLen) palette.push([0, 0, 0])

  // Map pixels to palette indices (nearest color)
  const indexed = new Uint8Array(pixels.length / 4)
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2]
    let bestDist = Infinity, bestIdx = 0
    for (let j = 0; j < palette.length; j++) {
      const dr = r - palette[j][0], dg = g - palette[j][1], db = b - palette[j][2]
      const dist = dr * dr + dg * dg + db * db
      if (dist < bestDist) { bestDist = dist; bestIdx = j }
    }
    indexed[i / 4] = bestIdx
  }

  return { palette, indexed }
}

// ---- LZW 编码 ----

function lzwEncode(indexed: Uint8Array, minCodeSize: number): number[] {
  const clearCode = 1 << minCodeSize
  const eofCode = clearCode + 1
  let nextCode = eofCode + 1
  let codeSize = minCodeSize + 1
  let maxCode = (1 << codeSize) - 1

  const dict = new Map<string, number>()
  for (let i = 0; i < clearCode; i++) dict.set(String.fromCharCode(i), i)
  dict.set('CLR', clearCode)
  dict.set('EOF', eofCode)

  const output: number[] = [clearCode]
  let w = String.fromCharCode(indexed[0])

  for (let i = 1; i < indexed.length; i++) {
    const k = String.fromCharCode(indexed[i])
    const wk = w + k
    if (dict.has(wk)) {
      w = wk
    } else {
      output.push(dict.get(w)!)
      dict.set(wk, nextCode++)
      w = k
      if (nextCode > maxCode && codeSize < 12) {
        codeSize++
        maxCode = (1 << codeSize) - 1
      }
      if (nextCode >= 4095) {
        output.push(clearCode)
        dict.clear()
        for (let j = 0; j < clearCode; j++) dict.set(String.fromCharCode(j), j)
        dict.set('CLR', clearCode)
        dict.set('EOF', eofCode)
        nextCode = eofCode + 1
        codeSize = minCodeSize + 1
        maxCode = (1 << codeSize) - 1
      }
    }
  }
  output.push(dict.get(w)!)
  output.push(eofCode)
  return output
}

function packLzw(codes: number[], minCodeSize: number): Uint8Array {
  let codeSize = minCodeSize + 1
  const blocks: number[][] = []
  let currentBlock: number[] = []
  let buffer = 0
  let bitsInBuffer = 0

  function flushByte() {
    if (bitsInBuffer >= 8) {
      currentBlock.push(buffer & 0xff)
      buffer >>= 8
      bitsInBuffer -= 8
    }
  }

  for (const code of codes) {
    buffer |= code << bitsInBuffer
    bitsInBuffer += codeSize

    // Adjust code size
    const maxVal = (1 << codeSize) - 1
    if (codes.indexOf(code) === codes.length - 1) {
      // Don't grow on last code
    } else if (code > maxVal && codeSize < 12) {
      codeSize++
    }

    while (bitsInBuffer >= 8) {
      currentBlock.push(buffer & 0xff)
      if (currentBlock.length === 255) {
        blocks.push(currentBlock)
        currentBlock = []
      }
      buffer >>= 8
      bitsInBuffer -= 8
    }
  }

  // Flush remaining bits
  while (bitsInBuffer > 0) {
    currentBlock.push(buffer & 0xff)
    if (currentBlock.length === 255) {
      blocks.push(currentBlock)
      currentBlock = []
    }
    buffer >>= 8
    bitsInBuffer -= 8
  }

  if (currentBlock.length > 0) blocks.push(currentBlock)

  // Build output
  let outputLen = 0
  for (const b of blocks) outputLen += 1 + b.length
  outputLen += 1 // zero-length block terminator
  const output = new Uint8Array(outputLen)
  let pos = 0
  for (const b of blocks) {
    output[pos++] = b.length
    output.set(b, pos)
    pos += b.length
  }
  output[pos] = 0 // block terminator
  return output
}

// ---- GIF 组装 ----

function writeUint16(buf: number[], val: number): void {
  buf.push(val & 0xff, (val >> 8) & 0xff)
}

export function encodeGif(frames: GifFrame[], options?: { repeat?: number }): Uint8Array {
  const repeat = options?.repeat ?? 0 // 0 = infinite loop
  const width = frames[0].imageData.width
  const height = frames[0].imageData.height

  // 收集所有像素做全局量化
  const allPixels: number[] = []
  for (const frame of frames) {
    const d = frame.imageData.data
    for (let i = 0; i < d.length; i++) allPixels.push(d[i])
  }
  const { palette, indexed } = quantizeColors(new Uint8ClampedArray(allPixels), 255)

  const colorDepth = Math.max(2, Math.ceil(Math.log2(palette.length)))
  const minCodeSize = Math.max(2, colorDepth)

  const buf: number[] = []

  // Header
  buf.push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61) // GIF89a

  // Logical Screen Descriptor
  writeUint16(buf, width)
  writeUint16(buf, height)
  const packed = 0xf0 | (colorDepth - 1) // global color table, 8 bits per component
  buf.push(packed)
  buf.push(0) // bg color index
  buf.push(0) // pixel aspect ratio

  // Global Color Table
  for (const [r, g, b] of palette) {
    buf.push(r, g, b)
  }

  // Netscape Extension (looping)
  buf.push(0x21, 0xff, 0x0b) // application extension
  buf.push(0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45) // "NETSCAPE"
  buf.push(0x32, 0x2e, 0x30) // "2.0"
  buf.push(0x03, 0x01) // sub-block length, data
  writeUint16(buf, repeat) // loop count
  buf.push(0x00) // block terminator

  // Frames
  let pixelOffset = 0
  for (const frame of frames) {
    const framePixels = frame.imageData.width * frame.imageData.height

    // Graphic Control Extension
    buf.push(0x21, 0xf9, 0x04) // extension introducer, graphic control label
    buf.push(0x04) // disposal method: restore to background (for transparency/overlay)
    writeUint16(buf, Math.max(1, frame.delay)) // delay in centiseconds
    buf.push(0) // transparent color index (none)
    buf.push(0x00) // block terminator

    // Image Descriptor
    buf.push(0x2c) // image separator
    writeUint16(buf, 0) // left
    writeUint16(buf, 0) // top
    writeUint16(buf, frame.imageData.width)
    writeUint16(buf, frame.imageData.height)
    buf.push(0x00) // no local color table

    // LZW Image Data
    const frameIndexed = new Uint8Array(framePixels)
    for (let i = 0; i < framePixels; i++) {
      frameIndexed[i] = indexed[pixelOffset + i]
    }
    pixelOffset += framePixels

    buf.push(minCodeSize) // LZW minimum code size
    const codes = lzwEncode(frameIndexed, minCodeSize)
    const packed = packLzw(codes, minCodeSize)
    for (const b of packed) buf.push(b)
  }

  // Trailer
  buf.push(0x3b)

  return new Uint8Array(buf)
}
