# Re-register the split poses on the WRIST instead of the arm.
#
# WHY. The poses are currently aligned where the arm leaves the frame, which
# keeps the arm still and lets the hand swing. Measured, the human fingertip
# travels about a third of the frame height as the sequence cycles - the hand
# flails rather than reaches, because Nathan's four stills have the arm at
# genuinely different angles and matching the arm cannot also match the hand.
#
# Anchoring the wrist inverts it: the hand stays where it is and the ARM swings
# instead. That is the better trade here, because the arm mostly runs off the
# frame edge and the hand is the subject. It is also what a real reach looks
# like - the wrist roughly holds station while the fingers extend.
#
# FINDING THE WRIST. It is the narrowest cross-section between forearm and hand,
# so the per-column opaque MASS profile runs high through the forearm, dips at
# the wrist, rises again across the knuckles and falls away into the fingers.
# The dip is the wrist. Mass rather than vertical extent, because extent counts
# the gaps between splayed fingers and would find the wrong minimum.
#
# Writes to poses-wrist/ rather than over the originals. The arm-aligned set is
# the fallback if this reads worse.

Add-Type -AssemblyName System.Drawing

$src = ".\public\art\poses"
$dst = ".\public\art\poses-wrist"
New-Item -ItemType Directory -Force -Path $dst | Out-Null

function Read-Png($path) {
  $fs = [System.IO.File]::OpenRead($path)
  $bmp = [System.Drawing.Bitmap]::FromStream($fs)
  $w = $bmp.Width; $h = $bmp.Height
  $rect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
  $d = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $stride = $d.Stride
  $bytes = New-Object byte[] ($stride * $h)
  [System.Runtime.InteropServices.Marshal]::Copy($d.Scan0, $bytes, 0, $bytes.Length)
  $bmp.UnlockBits($d); $bmp.Dispose(); $fs.Close()
  return @{ bytes = $bytes; w = $w; h = $h; stride = $stride }
}

# side 'L' = arm enters from the left (human), 'R' = from the right (machine).
function Find-Wrist($p, $side) {
  $w = $p.w; $h = $p.h; $b = $p.bytes; $stride = $p.stride
  $mass = New-Object int[] $w
  $minY = New-Object int[] $w
  $maxY = New-Object int[] $w
  for ($x = 0; $x -lt $w; $x++) { $minY[$x] = $h; $maxY[$x] = -1 }
  for ($y = 0; $y -lt $h; $y++) {
    $row = $y * $stride
    for ($x = 0; $x -lt $w; $x++) {
      if ($b[$row + $x*4 + 3] -le 24) { continue }
      $mass[$x]++
      if ($y -lt $minY[$x]) { $minY[$x] = $y }
      if ($y -gt $maxY[$x]) { $maxY[$x] = $y }
    }
  }
  $cols = @(); for ($x = 0; $x -lt $w; $x++) { if ($mass[$x] -gt 0) { $cols += $x } }
  $x0 = $cols[0]; $x1 = $cols[-1]
  $span = $x1 - $x0

  # Search the band where a wrist can plausibly sit, measured FROM the arm side.
  if ($side -eq 'L') {
    $from = $x0 + [int]($span * 0.15); $to = $x0 + [int]($span * 0.62)
  } else {
    $from = $x1 - [int]($span * 0.62); $to = $x1 - [int]($span * 0.15)
  }

  $wx = $from; $best = [int]::MaxValue
  for ($x = $from; $x -le $to; $x++) {
    if ($mass[$x] -gt 0 -and $mass[$x] -lt $best) { $best = $mass[$x]; $wx = $x }
  }
  $wy = [int](($minY[$wx] + $maxY[$wx]) / 2)
  return @{ x = $wx; y = $wy; mass = $best; x0 = $x0; x1 = $x1; contentMinY = ($minY | Where-Object { $_ -lt $h } | Measure-Object -Minimum).Minimum; contentMaxY = ($maxY | Measure-Object -Maximum).Maximum }
}

foreach ($set in @(@('human','L'), @('machine','R'))) {
  $label = $set[0]; $side = $set[1]
  $poses = @()
  for ($i = 1; $i -le 4; $i++) {
    $p = Read-Png "$src\$label-$i.png"
    $wr = Find-Wrist $p $side
    $poses += @{ p = $p; wr = $wr; idx = $i }
    "$label-$i  wrist at ($($wr.x),$($wr.y))  neck mass $($wr.mass)px  content x$($wr.x0)-$($wr.x1) y$($wr.contentMinY)-$($wr.contentMaxY)"
  }

  # Common canvas: enough room around the shared wrist for every pose.
  $left = 0; $right = 0; $up = 0; $down = 0
  foreach ($e in $poses) {
    $left  = [Math]::Max($left,  $e.wr.x - $e.wr.x0)
    $right = [Math]::Max($right, $e.wr.x1 - $e.wr.x)
    $up    = [Math]::Max($up,    $e.wr.y - $e.wr.contentMinY)
    $down  = [Math]::Max($down,  $e.wr.contentMaxY - $e.wr.y)
  }
  $pad = 6
  $cw = $left + $right + 1 + $pad*2
  $ch = $up + $down + 1 + $pad*2
  $ax = $left + $pad
  $ay = $up + $pad
  "$label -> canvas ${cw}x${ch}, wrist pinned at ($ax,$ay)"

  foreach ($e in $poses) {
    $p = $e.p
    $dx = $ax - $e.wr.x
    $dy = $ay - $e.wr.y
    $out = New-Object System.Drawing.Bitmap $cw, $ch, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $orect = New-Object System.Drawing.Rectangle 0, 0, $cw, $ch
    $od = $out.LockBits($orect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $ob = New-Object byte[] ($od.Stride * $ch)
    for ($y = 0; $y -lt $p.h; $y++) {
      $ty = $y + $dy
      if ($ty -lt 0 -or $ty -ge $ch) { continue }
      $srcRow = $y * $p.stride
      $dstRow = $ty * $od.Stride
      for ($x = 0; $x -lt $p.w; $x++) {
        if ($p.bytes[$srcRow + $x*4 + 3] -le 0) { continue }
        $tx = $x + $dx
        if ($tx -lt 0 -or $tx -ge $cw) { continue }
        $si = $srcRow + $x*4; $di = $dstRow + $tx*4
        $ob[$di]   = $p.bytes[$si]
        $ob[$di+1] = $p.bytes[$si+1]
        $ob[$di+2] = $p.bytes[$si+2]
        $ob[$di+3] = $p.bytes[$si+3]
      }
    }
    [System.Runtime.InteropServices.Marshal]::Copy($ob, 0, $od.Scan0, $ob.Length)
    $out.UnlockBits($od)
    $out.Save("$dst\$label-$($e.idx).png", [System.Drawing.Imaging.ImageFormat]::Png)
    $out.Dispose()
    "  $label-$($e.idx) shifted by ($dx,$dy)"
  }
}
"done"
