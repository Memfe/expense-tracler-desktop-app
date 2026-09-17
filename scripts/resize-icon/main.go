package main

// Downscales build/appicon.png to the sizes given on the command line and
// writes each one to the matching output path. Throwaway helper for the .deb
// packaging script - pure stdlib, box-filter downscale.

import (
	"image"
	"image/color"
	"image/png"
	"os"
)

func main() {
	if len(os.Args) < 4 || (len(os.Args)-2)%2 != 0 {
		println("usage: resize-icon <src.png> <size> <out.png> [<size> <out.png> ...]")
		os.Exit(1)
	}

	srcFile, err := os.Open(os.Args[1])
	if err != nil {
		panic(err)
	}
	src, err := png.Decode(srcFile)
	if err != nil {
		panic(err)
	}
	srcFile.Close()

	bounds := src.Bounds()
	for i := 2; i+1 < len(os.Args); i += 2 {
		size := atoi(os.Args[i])
		out := image.NewRGBA(image.Rect(0, 0, size, size))
		sx := bounds.Dx() / size
		sy := bounds.Dy() / size
		for y := 0; y < size; y++ {
			for x := 0; x < size; x++ {
				var r, g, b, a, n float64
				for yy := 0; yy < sy; yy++ {
					for xx := 0; xx < sx; xx++ {
						cr, cg, cb, ca := src.At(bounds.Min.X+x*sx+xx, bounds.Min.Y+y*sy+yy).RGBA()
						r += float64(cr >> 8)
						g += float64(cg >> 8)
						b += float64(cb >> 8)
						a += float64(ca >> 8)
						n++
					}
				}
				out.Set(x, y, colorRGBA(uint8(r/n), uint8(g/n), uint8(b/n), uint8(a/n)))
			}
		}
		f, err := os.Create(os.Args[i+1])
		if err != nil {
			panic(err)
		}
		if err := png.Encode(f, out); err != nil {
			panic(err)
		}
		f.Close()
		println("wrote", os.Args[i+1])
	}
}

func atoi(s string) int {
	n := 0
	for _, c := range s {
		if c < '0' || c > '9' {
			panic("bad size: " + s)
		}
		n = n*10 + int(c-'0')
	}
	return n
}

func colorRGBA(r, g, b, a uint8) color.RGBA {
	return color.RGBA{R: r, G: g, B: b, A: a}
}