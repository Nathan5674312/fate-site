# Split four two-hand pose composites into eight registered single-hand PNGs.
#
# THE WHOLE JOB IS REGISTRATION. The site dissolves between poses per pixel; it
# never moves anything into place. So every pose of a given hand must sit on the
# same canvas with the ARM in the same position, and only the fingers differing.
# Get that wrong and the transition is a jump cut.
#
# The arm is the anchor because it is the part that should not appear to move:
# it runs off the frame edge in the composition. For the left hand the arm meets
# the left edge, for the right hand the right edge, so each is aligned on the
# vertical centre of its own arm cross-section at that edge.
#
# Also strips leftover background: opaque pixels that are near-white AND nearly
# desaturated. Fresco skin is warm and mid-tone, so the test is safe - real
# highlights on the hands measured 195-230 luminance, well under the 246 cut.

Add-Type -AssemblyName System.Drawing

$srcDir = "[downloads]"
$outDir = ".\public\art\poses"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$files = @(
  "$srcDir\image_nobg_preview_photiu.ai.png",
  "$srcDir\image_nobg_preview_photiu.ai(1).png",
  "$srcDir\image_nobg_preview_photiu.ai(2).png",
  "$srcDir\image_nobg_preview_photiu.ai(3).png"
)

function Get-Pixels($path) {
  $bmp = New-Object System.Drawing.Bitmap $path
  $rect = New-Object System.Drawing.Rectangle 0, 0, $bmp.Width, $bmp.Height
  $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $bytes = New-Object byte[] ($bmp.Width * $bmp.Height * 4)
  [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
  $bmp.UnlockBits($data)
  $w = $bmp.Width; $h = $bmp.Height
  $bmp.Dispose()
  return @{ bytes = $bytes; w = $w; h = $h }
}

# Pass 1 - clean, find the seam between the hands, measure each side.
$measured = @()
$i = 0
foreach ($f in $files) {
  $i++
  $p = Get-Pixels $f
  $b = $p.bytes; $w = $p.w; $h = $p.h

  # Strip near-white, near-grey leftovers.
  $stripped = 0
  for ($k = 0; $k -lt $b.Length; $k += 4) {
    if ($b[$k+3] -lt 8) { continue }
    $bl = $b[$k]; $gr = $b[$k+1]; $rd = $b[$k+2]
    $lum = 0.299*$rd + 0.587*$gr + 0.114*$bl
    $mx = [Math]::Max($rd, [Math]::Max($gr, $bl))
    $mn = [Math]::Min($rd, [Math]::Min($gr, $bl))
    $sat = if ($mx -eq 0) { 0 } else { ($mx - $mn) / $mx }
    if ($lum -gt 246 -and $sat -lt 0.05) { $b[$k+3] = 0; $stripped++ }
  }

  # Opaque count per column, to find the gap between the two hands.
  $cols = New-Object int[] $w
  for ($y = 0; $y -lt $h; $y++) {
    $row = $y * $w * 4
    for ($x = 0; $x -lt $w; $x++) {
      if ($b[$row + $x*4 + 3] -gt 24) { $cols[$x]++ }
    }
  }
  # Search the middle half only; the hands live at the edges.
  $lo = [int]($w * 0.25); $hi = [int]($w * 0.75)
  $seam = $lo; $best = [int]::MaxValue
  for ($x = $lo; $x -lt $hi; $x++) {
    if ($cols[$x] -lt $best) { $best = $cols[$x]; $seam = $x }
  }

  $measured += @{ bytes = $b; w = $w; h = $h; seam = $seam; stripped = $stripped; idx = $i; name = (Split-Path $f -Leaf) }
  "[$i] $($p.w)x$($p.h)  seam@$seam (density $best)  stripped $stripped px"
}

# Per-side bounding box and arm anchor.
function Measure-Side($m, $side) {
  $b = $m.bytes; $w = $m.w; $h = $m.h
  if ($side -eq 'L') { $x0 = 0; $x1 = $m.seam } else { $x0 = $m.seam; $x1 = $w }
  $minX = $w; $maxX = -1; $minY = $h; $maxY = -1
  for ($y = 0; $y -lt $h; $y++) {
    $row = $y * $w * 4
    for ($x = $x0; $x -lt $x1; $x++) {
      if ($b[$row + $x*4 + 3] -le 24) { continue }
      if ($x -lt $minX) { $minX = $x }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }
  # The arm anchor: vertical centre of the opaque run in the edge column where
  # the arm leaves the frame.
  $edge = if ($side -eq 'L') { $minX } else { $maxX }
  $ys = @()
  for ($y = 0; $y -lt $h; $y++) {
    if ($b[$y * $w * 4 + $edge*4 + 3] -gt 24) { $ys += $y }
  }
  $anchorY = if ($ys.Count) { ($ys[0] + $ys[-1]) / 2 } else { ($minY + $maxY) / 2 }
  return @{ minX = $minX; maxX = $maxX; minY = $minY; maxY = $maxY; anchorX = $edge; anchorY = $anchorY }
}

$sides = @{}
foreach ($side in @('L','R')) {
  $list = @()
  foreach ($m in $measured) { $list += (Measure-Side $m $side) }
  $sides[$side] = $list
}

# Pass 2 - common canvas per side, every pose aligned on its arm anchor.
foreach ($side in @('L','R')) {
  $list = $sides[$side]
  # Room needed either side of the anchor, across all four poses.
  $left = 0; $right = 0; $up = 0; $down = 0
  foreach ($s in $list) {
    $left  = [Math]::Max($left,  $s.anchorX - $s.minX)
    $right = [Math]::Max($right, $s.maxX - $s.anchorX)
    $up    = [Math]::Max($up,    $s.anchorY - $s.minY)
    $down  = [Math]::Max($down,  $s.maxY - $s.anchorY)
  }
  $pad = 6
  $cw = [int]($left + $right + 1 + $pad*2)
  $ch = [int]($up + $down + 1 + $pad*2)
  $ax = [int]($left + $pad)
  $ay = [int]($up + $pad)
  $label = if ($side -eq 'L') { 'human' } else { 'machine' }
  "$label canvas: ${cw}x${ch}, anchor at ($ax,$ay)"

  for ($n = 0; $n -lt $measured.Count; $n++) {
    $m = $measured[$n]; $s = $list[$n]
    $out = New-Object System.Drawing.Bitmap $cw, $ch, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $rect = New-Object System.Drawing.Rectangle 0, 0, $cw, $ch
    $od = $out.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $ob = New-Object byte[] ($cw * $ch * 4)

    $dx = $ax - $s.anchorX
    $dy = [int]($ay - $s.anchorY)
    $x0 = if ($side -eq 'L') { 0 } else { $m.seam }
    $x1 = if ($side -eq 'L') { $m.seam } else { $m.w }

    for ($y = $s.minY; $y -le $s.maxY; $y++) {
      $ty = $y + $dy
      if ($ty -lt 0 -or $ty -ge $ch) { continue }
      $srcRow = $y * $m.w * 4
      $dstRow = $ty * $cw * 4
      for ($x = [Math]::Max($x0, $s.minX); $x -le [Math]::Min($x1 - 1, $s.maxX); $x++) {
        $tx = $x + $dx
        if ($tx -lt 0 -or $tx -ge $cw) { continue }
        $si = $srcRow + $x*4
        if ($m.bytes[$si+3] -le 0) { continue }
        $di = $dstRow + $tx*4
        $ob[$di]   = $m.bytes[$si]
        $ob[$di+1] = $m.bytes[$si+1]
        $ob[$di+2] = $m.bytes[$si+2]
        $ob[$di+3] = $m.bytes[$si+3]
      }
    }
    [System.Runtime.InteropServices.Marshal]::Copy($ob, 0, $od.Scan0, $ob.Length)
    $out.UnlockBits($od)
    $path = "$outDir\$label-$($m.idx).png"
    $out.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $out.Dispose()
    "  wrote $label-$($m.idx).png"
  }
}
"done"
