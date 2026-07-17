# Docker Compose Guidelines

When working with Docker Compose, strictly adhere to the following rules regarding environment variables:

1. **Root `.env` vs `env_file`**:
   - A `.env` file in the same directory as `docker-compose.yml` is automatically read by the `docker compose` CLI. It is strictly for substituting variables *inside the `docker-compose.yml` file itself* (e.g., `${PORT}`).
   - The `env_file:` directive inside a service definition injects variables into the *container's runtime environment*. It does **not** make those variables available for string interpolation within `docker-compose.yml`.

2. **Why You Don't Need the Root `.env` in `env_file` (Avoid Redundancy)**:
   - When Docker Compose reads the root `.env`, it holds those variables in memory to parse your `docker-compose.yml`.
   - If a container needs one of those variables, you explicitly pass it using the `environment:` block like this:
     ```yaml
     environment:
       - PORT=${PORT}
     ```
   - Because you explicitly hand the container the variable it needs via `environment:`, adding `env_file: - .env` is redundant. Furthermore, relying on `environment:` is safer because it prevents accidentally dumping *every* variable from the root `.env` into the container if the file later grows to include unrelated host secrets.

3. **No Cross-Contamination**:
   - Never load a service's specific environment file (e.g., `backend/.env`) into a different service (e.g., `frontend`). This prevents leaking sensitive credentials like API keys to containers that don't need them.
