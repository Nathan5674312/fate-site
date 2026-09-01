# Drop background scraps from the split poses, WITHOUT eating detached fingers.
#
# One composite carried a leftover sliver of fresco. It survived a near-white
# colour test because it is warm mid-tone plaster, the same range as skin.
#
# 🔴 TWO MISTAKES THIS SCRIPT EXISTS TO NOT MAKE, both of which the first
# version made and which would have quietly destroyed the art:
#
# 1. 4-CONNECTIVITY. Diagonal pixel chains are everywhere in a feathered
#    cut-out, so 4-connectivity shattered each hand into 150-320 fragments and
#    "keep the largest blob" wanted to delete 63%% of a hand. 8-connectivity
#    gives the true picture: one hand, one scrap, and a scatter of single pixels.
#
# 2. KEEPING ONLY THE LARGEST BLOB. In the splayed pose a FINGERTIP is genuinely
#    detached from the hand - 825px of real art that a size rule would have
#    thrown away. So the test is not size, it is position: a blob whose bounding
#    box intersects the hand's is part of the hand, however far it sits from the
#    mass. The scrap fails that test (y270-386 against the hand's y61-209); the
#    fingertip passes it (y92-115 inside y69-312).
#
# Also: the source is read through a FileStream and disposed before saving.
# Bitmap.FromFile holds the file open, so saving back over it fails with a bare
# "generic error occurred in GDI+" - which, the first time, was luck, because it
# meant the destructive version never wrote anything.

Add-Type -AssemblyName System.Drawing

$dir = ".\public\art\poses"

foreach ($f in (Get-ChildItem "$dir\*.png" | Sort-Object Name)) {
  $fs = [System.IO.File]::OpenRead($f.FullName)
  $bmp = [System.Drawing.Bitmap]::FromStream($fs)
  $w = $bmp.Width; $h = $bmp.Height
  $rect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
  $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $stride = $data.Stride
  $bytes = New-Object byte[] ($stride * $h)
  [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
  $bmp.UnlockBits($data); $bmp.Dispose(); $fs.Close()

  $label = New-Object int[] ($w * $h)
  $blobs = @()
  $cur = 0
  $stack = New-Object 'System.Collections.Generic.Stack[int]'

  for ($p = 0; $p -lt $w * $h; $p++) {
    $py = [int]($p / $w); $px = $p % $w
    if ($bytes[$py*$stride + $px*4 + 3] -le 24 -or $label[$p] -ne 0) { continue }
    $cur++; $n = 0; $x0 = $w; $x1 = -1; $y0 = $h; $y1 = -1
    $stack.Push($p); $label[$p] = $cur
    while ($stack.Count -gt 0) {
      $q = $stack.Pop(); $n++
      $qx = $q % $w; $qy = [int]($q / $w)
      if ($qx -lt $x0) { $x0 = $qx }; if ($qx -gt $x1) { $x1 = $qx }
      if ($qy -lt $y0) { $y0 = $qy }; if ($qy -gt $y1) { $y1 = $qy }
      foreach ($d in @(@(1,0),@(-1,0),@(0,1),@(0,-1),@(1,1),@(-1,-1),@(1,-1),@(-1,1))) {
        $nx = $qx + $d[0]; $ny = $qy + $d[1]
        if ($nx -lt 0 -or $ny -lt 0 -or $nx -ge $w -or $ny -ge $h) { continue }
        $ni = $ny * $w + $nx
        if ($label[$ni] -ne 0 -or $bytes[$ny*$stride + $nx*4 + 3] -le 24) { continue }
        $label[$ni] = $cur; $stack.Push($ni)
      }
    }
    $blobs += ,@($cur, $n, $x0, $y0, $x1, $y1)
  }

  # The hand is the biggest blob; anything overlapping its box belongs to it.
  $main = $blobs | Sort-Object { -$_[1] } | Select-Object -First 1
  $keep = @{}
  foreach ($b in $blobs) {
    $overlaps = -not ($b[4] -lt $main[2] -or $b[2] -gt $main[4] -or $b[5] -lt $main[3] -or $b[3] -gt $main[5])
    if ($overlaps) { $keep[$b[0]] = $true }
  }

  $removed = 0; $dropped = @()
  foreach ($b in $blobs) {
    if (-not $keep.ContainsKey($b[0])) {
      $removed += $b[1]
      if ($b[1] -ge 20) { $dropped += "$($b[1])px @ x$($b[2])-$($b[4]) y$($b[3])-$($b[5])" }
    }
  }
  for ($p = 0; $p -lt $w * $h; $p++) {
    $l = $label[$p]
    if ($l -ne 0 -and -not $keep.ContainsKey($l)) {
      $py = [int]($p / $w); $px = $p % $w
      $bytes[$py*$stride + $px*4 + 3] = 0
    }
  }

  if ($removed -gt 0) {
    $out = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $od = $out.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $od.Scan0, $bytes.Length)
    $out.UnlockBits($od)
    $out.Save($f.FullName, [System.Drawing.Imaging.ImageFormat]::Png)
    $out.Dispose()
  }

  $note = if ($dropped.Count) { "  DROPPED: " + ($dropped -join '; ') } else { "" }
  "$($f.Name): hand $($main[1])px, kept $($keep.Count)/$($blobs.Count) blobs, removed $removed px$note"
}
"done"
