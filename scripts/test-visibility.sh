#!/usr/bin/env sh
set -eu

count_lines() {
	if [ -z "$1" ]; then
		printf "0"
	else
		printf "%s\n" "$1" | sed '/^$/d' | wc -l | tr -d ' '
	fi
}

go_packages=$(
	go list -f '{{.ImportPath}} {{len .GoFiles}} {{len .TestGoFiles}} {{len .XTestGoFiles}}' ./... |
		grep -v '/ui/node_modules/' || true
)

go_total=$(count_lines "$go_packages")
go_with_tests=$(printf "%s\n" "$go_packages" | awk '$3 + $4 > 0 { count++ } END { print count + 0 }')
go_without_tests=$(printf "%s\n" "$go_packages" | awk '$3 + $4 == 0 { count++ } END { print count + 0 }')
go_source_files=$(find cmd internal -name '*.go' -not -name '*_test.go' -not -path '*/vendor/*' | wc -l | tr -d ' ')
go_test_files=$(find cmd internal -name '*_test.go' -not -path '*/vendor/*' | wc -l | tr -d ' ')

ui_source_files=$(
	find ui/src -type f \( -name '*.ts' -o -name '*.tsx' \) \
		-not -name '*.d.ts' \
		-not -name '*.test.ts' \
		-not -name '*.test.tsx' |
		wc -l |
		tr -d ' '
)
ui_test_files=$(
	find ui/src -type f \( -name '*.test.ts' -o -name '*.test.tsx' \) |
		wc -l |
		tr -d ' '
)

printf "\nTest visibility\n"
printf "===============\n"
printf "Go packages: %s total, %s with tests, %s without tests\n" "$go_total" "$go_with_tests" "$go_without_tests"
printf "Go files: %s source, %s test\n" "$go_source_files" "$go_test_files"
printf "UI files: %s source, %s test\n" "$ui_source_files" "$ui_test_files"

if [ "$go_without_tests" -gt 0 ]; then
	printf "\nGo packages without package-level tests:\n"
	printf "%s\n" "$go_packages" |
		awk '$3 + $4 == 0 { sub(/^github.com\/korex-labs\/kview\/v5\//, "", $1); printf "- %s (%s source files)\n", $1, $2 }'
fi

printf "\nNotes:\n"
printf "%s\n" "- Prefer behavior tests over placeholder tests; DTO-only or glue packages can stay visible here without padded assertions."
printf "%s\n" "- Use make coverage for Go and frontend coverage artifacts under .artifacts/coverage."
