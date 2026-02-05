UI_DIR=ui
EMBED_DIR=internal/server/ui_dist

.PHONY: ui run build clean

ui:
	cd $(UI_DIR) && npm install && npm run build
	rm -rf $(EMBED_DIR)
	mkdir -p $(EMBED_DIR)
	cp -r $(UI_DIR)/dist/* $(EMBED_DIR)/
	@echo "UI built and copied into $(EMBED_DIR)"

run: ui
	go run ./cmd/kview

build: ui
	go build -o kview ./cmd/kview
	@echo "Built ./kview"

clean:
	rm -rf $(UI_DIR)/dist
	rm -rf $(UI_DIR)/node_modules
	rm -rf $(EMBED_DIR)/*
	@echo "Cleaned UI dist/node_modules and embedded ui_dist contents"

