# ==============================================================================
# Teach&Learn Workspace — Task Automation Makefile
# ==============================================================================

.PHONY: help check lint lint-backend lint-frontend build-frontend lint-docs \
        db-setup db-reset db-dump db-dump-schema db-dump-data \
        migrate migrate-status types deploy-functions deploy-functions-status \
        dev-backend dev-frontend docker-dev docker-prod

.DEFAULT_GOAL := help

help:
	@echo "Teach&Learn Development Commands:"
	@echo "  make check                    Run full workspace linter (backend, frontend, doc coverage)"
	@echo "  make lint-backend             Run backend Ruff, BasedPyright, and micro-doc checks"
	@echo "  make lint-frontend            Run frontend TypeScript and micro-doc checks"
	@echo "  make build-frontend           Build frontend production Vite bundle"
	@echo "  make lint-docs                Verify 100% code.md documentation coverage"
	@echo ""
	@echo "Supabase & Database Commands:"
	@echo "  make db-setup                 Initialize database (safe, applies migrations & types)"
	@echo "  make db-reset                 Full destructive teardown, re-migration & setup"
	@echo "  make db-dump-schema           Dump separate DDL schemas (schema.<name>.sql in supabase/schemas/)"
	@echo "  make db-dump-data             Dump table data (public, ai, langgraph) into supabase/seed.sql"
	@echo "  make db-dump                  Dump both separate schemas and data (into seed.sql)"
	@echo "  make migrate-status           Display status of applied and pending SQL migrations"
	@echo "  make migrate                  Apply unapplied migrations via Supabase CLI and regen types"
	@echo "  make types                    Regenerate TypeScript and Python types via Supabase CLI"
	@echo "  make deploy-functions         Deploy modified Supabase Edge Functions"
	@echo "  make deploy-functions-status  Check diff status of Supabase Edge Functions"
	@echo ""
	@echo "Local Development:"
	@echo "  make dev-backend              Start FastAPI backend with live hot-reloading"
	@echo "  make dev-frontend             Start Vite frontend dev server"
	@echo "  make docker-dev               Start rootless multi-container dev stack (live reload)"
	@echo "  make docker-prod              Start production container stack in background"

# ------------------------------------------------------------------------------
# Quality Gates & Linting
# ------------------------------------------------------------------------------
check: lint-backend lint-frontend lint-docs

lint-backend:
	cd backend && uv run poe lint

lint-frontend:
	cd frontend && pnpm run lint

build-frontend:
	cd frontend && pnpm run build

lint-docs:
	python scripts/verify_doc_coverage.py all

# ------------------------------------------------------------------------------
# Database & Supabase CLI
# ------------------------------------------------------------------------------
db-setup:
	uv run --project backend python scripts/db_setup.py $(ARGS)

db-reset:
	uv run --project backend python scripts/db_setup.py --reset $(ARGS)

db-dump-schema:
	python scripts/db_dump.py --schema-only $(if $(DIR),-d $(DIR),) $(if $(SCHEMA),-s $(SCHEMA),) $(if $(FILE),-f $(FILE),) $(ARGS)

db-dump-data:
	python scripts/db_dump.py --data-only $(if $(DIR),-d $(DIR),) $(if $(SCHEMA),-s $(SCHEMA),) $(if $(FILE),-f $(FILE),) $(ARGS)

db-dump:
	python scripts/db_dump.py --both $(if $(DIR),-d $(DIR),) $(if $(SCHEMA),-s $(SCHEMA),) $(if $(FILE),-f $(FILE),) $(ARGS)

migrate-status:
	python scripts/migrate.py --status

migrate:
	python scripts/migrate.py

types:
	python scripts/_generate_types.py

deploy-functions:
	python scripts/deploy_edge_functions.py

deploy-functions-status:
	python scripts/deploy_edge_functions.py --status

# ------------------------------------------------------------------------------
# Local Development & Orchestration
# ------------------------------------------------------------------------------
dev-backend:
	cd backend && uv run poe run-dev

dev-frontend:
	cd frontend && pnpm run dev

docker-dev:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

docker-prod:
	docker compose up --build -d
