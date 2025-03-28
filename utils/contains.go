package utils

func ContainsStringWithPrefix(a []string, prefix string) bool {
	for _, n := range a {
		if n == prefix || (len(n) > len(prefix) && n[:len(prefix)] == prefix) {
			return true
		}
	}
	return false
}

func ContainsString(a []string, x string) bool {
	for _, n := range a {
		if x == n {
			return true
		}
	}
	return false
}
