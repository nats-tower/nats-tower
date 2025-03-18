package utils

import (
	"math"
	"strconv"
)

// Copyright © 2015 Jaime Pillora <dev@jpillora.com>

// String representations of each scale
var scaleStrings = []string{"B", "KB", "MB", "GB", "TB", "PB", "XB"}

// Converts a byte count into a byte string
func ToStringSigBytesPerKB(n uint64, sig, bytesPerKB float64) string {
	var f = float64(n)
	var i int
	for i = range scaleStrings {
		if f < bytesPerKB {
			break
		}
		f = f / bytesPerKB
	}
	f = ToPrecision(f, sig)
	if f == bytesPerKB {
		return strconv.FormatFloat(f/bytesPerKB, 'f', 0, 64) + scaleStrings[i+1]
	}
	return strconv.FormatFloat(f, 'f', -1, 64) + scaleStrings[i]
}

var log10 = math.Log(10)

// A Go implementation of JavaScript's Math.toPrecision
func ToPrecision(n, p float64) float64 {
	//credits http://stackoverflow.com/a/12055126/977939
	if n == 0 {
		return 0
	}
	e := math.Floor(math.Log10(math.Abs(n)))
	f := round(math.Exp(math.Abs(e-p+1) * log10))
	if e-p+1 < 0 {
		return round(n*f) / f
	}
	return round(n/f) * f
}

func round(n float64) float64 {
	return math.Floor(n + 0.5)
}
