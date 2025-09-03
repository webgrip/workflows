###############################################################################
# Minimal Makefile for running GitHub Actions locally with act
# Usage: make <target>
# Targets kept intentionally small for this workflows repo.
###############################################################################

SHELL := /usr/bin/bash
.DEFAULT_GOAL := help

# ---------------------------------------------------------------------------
# Colour / style (optional; ignored if terminal strips ANSI)
# ---------------------------------------------------------------------------
C_RESET := \033[0m
C_INFO  := \033[36m
C_OK    := \033[32m
C_ERR   := \033[31m
C_WARN  := \033[33m
C_BOLD  := \033[1m
C_DIM   := \033[2m
C_UL    := \033[4m

# ---------------------------------------------------------------------------
# Core configuration (override via environment when invoking make)
# ---------------------------------------------------------------------------
ACT ?= act
ACT_RUNNER_PLATFORM ?= linux/amd64
COMPOSE ?= docker compose
ACT_SERVICE ?= workflows.act
ACT_IMAGE ?= webgrip/act-runner:latest
SYNC_WORKFLOW ?= .github/workflows/sync-template-files.yml

# Derived helpers
ACTC = $(COMPOSE) run --rm $(ACT_SERVICE) $(ACT)
# Use an overridden entrypoint for running arbitrary shell scripts or an interactive shell.
ACTC_BASH = $(COMPOSE) run --rm --entrypoint bash $(ACT_SERVICE)
ACTC_SH = $(COMPOSE) run --rm --entrypoint sh $(ACT_SERVICE)

# Docker run (custom image path) base args (used by legacy/custom targets)
DOCKER_ACT_IMAGE_BASE = docker run --rm \
	-v $(PWD):/workspace -w /workspace \
	-v /var/run/docker.sock:/var/run/docker.sock
DOCKER_ACT_IMAGE_ENV = --env-file .act_secrets --env-file .act_env
DOCKER_ACT_IMAGE = $(DOCKER_ACT_IMAGE_BASE) $(DOCKER_ACT_IMAGE_ENV) $(ACT_IMAGE) act

define _req_cmd
	@if ! command -v $(1) >/dev/null 2>&1; then \
		printf "$(C_ERR)Missing dependency: $(1) (install it first)$(C_RESET)\n"; \
		exit 1; \
	fi
endef

define _req_file
	@if [ ! -f $(1) ]; then \
		printf "$(C_ERR)Missing required file: $(1)$(C_RESET)\n"; \
		exit 1; \
	fi
endef

help: ## Show this help
	@printf "${C_BOLD}${C_INFO}act local workflow helper${C_RESET}\n"; \
	printf "${C_DIM}Run GitHub Actions locally with act (docker compose only)${C_RESET}\n\n"; \
	printf "${C_BOLD}Core Targets:${C_RESET}\n"; \
	printf "  ${C_INFO}act:list${C_RESET}               ${C_DIM}List workflows${C_RESET}\n"; \
	printf "  ${C_INFO}act:push${C_RESET}               ${C_DIM}Run push event${C_RESET}\n"; \
	printf "  ${C_INFO}act:workflow-dispatch${C_RESET}  ${C_DIM}Run workflow_dispatch event${C_RESET}\n"; \
	printf "  ${C_INFO}act:job${C_RESET}                ${C_DIM}Run single job (JOB=, EVENT=push)${C_RESET}\n"; \
	printf "  ${C_INFO}act:all${C_RESET}                ${C_DIM}Run all workflows (EVENT=push)${C_RESET}\n"; \
	printf "  ${C_INFO}act:clean${C_RESET}              ${C_DIM}Clean act artifacts${C_RESET}\n"; \
	printf "  ${C_INFO}act:shell${C_RESET}              ${C_DIM}Shell inside act container${C_RESET}\n"; \
	printf "  ${C_INFO}act:pull${C_RESET}               ${C_DIM}Pull compose image${C_RESET}\n"; \
	printf "  ${C_INFO}act:up${C_RESET}                 ${C_DIM}Start service (detached)${C_RESET}\n"; \
	printf "  ${C_INFO}act:down${C_RESET}               ${C_DIM}Stop service${C_RESET}\n\n"; \
	printf "${C_BOLD}Quality Targets:${C_RESET}\n"; \
	printf "  ${C_INFO}lint${C_RESET}                  ${C_DIM}Static lint & audit${C_RESET}\n"; \
	printf "  ${C_INFO}act:scenarios${C_RESET}          ${C_DIM}Run scenario wrappers${C_RESET}\n\n"; \
	printf "${C_BOLD}Custom Image Targets:${C_RESET}\n"; \
	printf "  ${C_INFO}build-act${C_RESET}             ${C_DIM}Build custom image (Dockerfile.act)${C_RESET}\n"; \
	printf "  ${C_INFO}setup-act${C_RESET}             ${C_DIM}Build + create secrets/env files${C_RESET}\n"; \
	printf "  ${C_INFO}validate-act${C_RESET}          ${C_DIM}Check image & optional script${C_RESET}\n"; \
	printf "  ${C_INFO}test-sync-workflow${C_RESET}    ${C_DIM}Run sync workflow (dispatch)${C_RESET}\n"; \
	printf "  ${C_INFO}test-sync-push${C_RESET}        ${C_DIM}Run sync workflow (push)${C_RESET}\n"; \
	printf "  ${C_INFO}test-workflows${C_RESET}        ${C_DIM}List + run subset (push)${C_RESET}\n"; \
	printf "  ${C_INFO}list-workflows${C_RESET}        ${C_DIM}List workflows (custom image)${C_RESET}\n"; \
	printf "  ${C_INFO}clean-act${C_RESET}             ${C_DIM}Clean custom image artifacts${C_RESET}\n\n"; \
	printf "${C_BOLD}Variables:${C_RESET}\n"; \
	printf "  ${C_INFO}ACT${C_RESET} (default: act)\n"; \
	printf "  ${C_INFO}ACT_RUNNER_PLATFORM${C_RESET} (linux/amd64)\n"; \
	printf "  ${C_INFO}ACT_SERVICE${C_RESET} (compose service)\n"; \
	printf "  ${C_INFO}SYNC_WORKFLOW${C_RESET} (sync workflow path)\n"; \
	printf "  ${C_INFO}ACT_IMAGE${C_RESET} (image tag, default: webgrip/act-runner:latest)\n"; \
	printf "  ${C_INFO}COMPOSE${C_RESET} (compose command)\n\n"; \
	printf "${C_BOLD}Examples:${C_RESET}\n"; \
	printf "  make act:list\n"; \
	printf "  make act:push ARGS='-j build'\n"; \
	printf "  make act:job JOB=test EVENT=pull_request\n"; \
	printf "  make act:all EVENT=pull_request\n"; \
	printf "  make test-sync-workflow\n"; \
	printf "\n${C_DIM}Tip:${C_RESET} ARGS passes extra flags; use EVENT=pull_request for PR emulation.\n";

act: ## Alias: show help filtered to act
	@$(MAKE) --no-print-directory help | grep 'act:' || true

act\:list: ## List workflows detected by act
	$(ACTC) --list

act\:push: ## Run workflows for a push event (extra flags via ARGS="...")
	$(ACTC) push -P $(ACT_RUNNER_PLATFORM) $(ARGS)

act\:workflow-dispatch: ## Run workflow_dispatch (ARGS for -W or -j)
	$(ACTC) workflow_dispatch -P $(ACT_RUNNER_PLATFORM) $(ARGS)

act\:job: ## Run a single job: make act:job JOB=name [EVENT=push]
	: $${EVENT:=push}; : $${JOB:?Set JOB=<job id from act --list>}; \
	$(ACTC) $$EVENT -j $$JOB -P $(ACT_RUNNER_PLATFORM) $(ARGS)

act\:all: ## Run all workflows (auto event selection) ARGS='--events=push,pull_request --dry-run'
	: $${EVENT:=push}; \
	$(ACTC_BASH) scripts/act-run-all.sh $(ARGS)

act\:scenarios: ## Run scenario definitions (use ARGS='--dry-run --debug')
	$(ACTC_BASH) scripts/act-run-all.sh --scenarios $(ARGS)

act\:clean: ## Remove local act artifacts
	rm -rf act_output/ .act/ .act_temp/ || true
	@printf "$(C_OK)Cleaned act artifacts$(C_RESET)\n"

act\:shell: ## Open a /bin/sh in the act service container
	$(ACTC_SH)

act\:pull: ## Pull latest act runner image
	$(COMPOSE) pull $(ACT_SERVICE)

act\:up: ## Start (detached) the act service container (if it had long-running tasks)
	$(COMPOSE) up -d $(ACT_SERVICE)

act\:down: ## Stop any running act service container
	$(COMPOSE) down

# ---------------------------------------------------------------------------
# Custom ACT image & direct docker run based tests (optional advanced path)
# ---------------------------------------------------------------------------

build-act:  ## Build custom ACT image (Dockerfile.act required)
	@$(call _req_cmd,docker)
	@printf "$(C_INFO)Building ACT Docker image ($(ACT_IMAGE))...$(C_RESET)\n"
	docker build -f Dockerfile.act -t $(ACT_IMAGE) .
	@printf "$(C_OK)ACT Docker image built: $(ACT_IMAGE)$(C_RESET)\n"

setup-act: build-act ## Build image & create secrets/env files if missing
	@if [ ! -f .act_secrets ]; then \
		printf "$(C_WARN)Creating .act_secrets from example (edit with real secrets)$(C_RESET)\n"; \
		if [ -f .act_secrets.example ]; then cp .act_secrets.example .act_secrets; else touch .act_secrets; fi; \
	fi
	@if [ ! -f .act_env ]; then printf "$(C_WARN)Creating blank .act_env file$(C_RESET)\n"; touch .act_env; fi
	@printf "$(C_OK)ACT setup complete$(C_RESET)\n"

validate-act: ## Validate custom ACT image & optional script
	@$(call _req_cmd,docker)
	@printf "$(C_INFO)Validating ACT configuration...$(C_RESET)\n"
	@docker run --rm -v $(PWD):/workspace -w /workspace -v /var/run/docker.sock:/var/run/docker.sock $(ACT_IMAGE) act --version || { printf "$(C_ERR)act binary missing inside image$(C_RESET)\n"; exit 1; }
	@[ -x scripts/validate-act.sh ] && ./scripts/validate-act.sh || printf "$(C_WARN)scripts/validate-act.sh not present (skipped)$(C_RESET)\n"
	@printf "$(C_OK)Validation complete$(C_RESET)\n"

test-sync-workflow: ## Run sync workflow (workflow_dispatch)
	@$(call _req_cmd,docker)
	@$(call _req_file,.act_secrets)
	@$(call _req_file,.act_env)
	@printf "$(C_INFO)Testing sync-template-files workflow (workflow_dispatch)$(C_RESET)\n"
	@mkdir -p act_output
	docker run --rm \
		-v $(PWD):/workspace \
		-w /workspace \
		-v /var/run/docker.sock:/var/run/docker.sock \
		--env-file .act_secrets \
		--env-file .act_env \
	$(ACT_IMAGE) act workflow_dispatch -P $(ACT_RUNNER_PLATFORM) \
		--workflows $(SYNC_WORKFLOW) \
		--artifact-server-path ./act_output

test-sync-push: ## Run sync workflow (push)
	@$(call _req_cmd,docker)
	@$(call _req_file,.act_secrets)
	@$(call _req_file,.act_env)
	@printf "$(C_INFO)Testing sync-template-files (push)$(C_RESET)\n"
	@mkdir -p act_output
	docker run --rm \
		-v $(PWD):/workspace \
		-w /workspace \
		-v /var/run/docker.sock:/var/run/docker.sock \
		--env-file .act_secrets \
		--env-file .act_env \
	$(ACT_IMAGE) act push -P $(ACT_RUNNER_PLATFORM) \
		--workflows $(SYNC_WORKFLOW) \
		--artifact-server-path ./act_output || true

test-workflows: ## List workflows then run sync workflow (push)
	@$(call _req_cmd,docker)
	@$(call _req_file,.act_secrets)
	@$(call _req_file,.act_env)
	@printf "$(C_INFO)Listing workflows (custom image)...$(C_RESET)\n"
	docker run --rm -v $(PWD):/workspace -w /workspace $(ACT_IMAGE) act --list || true
	@$(MAKE) --no-print-directory test-sync-push
	@printf "$(C_OK)Workflow test batch complete$(C_RESET)\n"

list-workflows: ## List all workflows (custom image)
	@$(call _req_cmd,docker)
	@printf "$(C_INFO)Available workflows (custom image)$(C_RESET)\n"
	@docker run --rm -v $(PWD):/workspace -w /workspace -v /var/run/docker.sock:/var/run/docker.sock $(ACT_IMAGE) act --list || printf "$(C_WARN)Listing encountered issues (act still accessible)$(C_RESET)\n"

clean-act: ## Clean custom ACT image artifacts
	@printf "$(C_INFO)Cleaning ACT artifacts...$(C_RESET)\n"
	rm -rf act_output/ .act_temp/ || true
	@printf "$(C_OK)ACT artifacts cleaned$(C_RESET)\n"

.PHONY: help act act\:list act\:push act\:workflow-dispatch act\:job act\:all act\:clean act\:shell act\:pull act\:up act\:down build-act setup-act validate-act test-sync-workflow test-sync-push test-workflows list-workflows clean-act

lint: ## Run actionlint + audit script (requires actionlint in PATH)
	@command -v actionlint >/dev/null 2>&1 && actionlint || printf "${C_WARN}actionlint not installed (skip)${C_RESET}\n"
	@./scripts/workflow-audit.sh || true

