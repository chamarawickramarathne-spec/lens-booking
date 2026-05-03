Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap("e:\Web projects\webampp\htdocs\lens-booking\public\hireartist_logo_full.png")
$colors = @{}
for ($x = 0; $x -lt $bmp.Width; $x += 10) {
    for ($y = 0; $y -lt $bmp.Height; $y += 10) {
        $pixel = $bmp.GetPixel($x, $y)
        if ($pixel.A -gt 100 -and -not ($pixel.R -gt 240 -and $pixel.G -gt 240 -and $pixel.B -gt 240) -and -not ($pixel.R -lt 15 -and $pixel.G -lt 15 -and $pixel.B -lt 15)) {
            $hex = "#{0:X2}{1:X2}{2:X2}" -f $pixel.R, $pixel.G, $pixel.B
            if ($colors.ContainsKey($hex)) { $colors[$hex]++ } else { $colors[$hex] = 1 }
        }
    }
}
$colors.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 5
