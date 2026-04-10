#!/bin/bash
# agent-skills session start hook
# Injects the using-agent-skills meta-skill into every new session

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS_DIR="$(dirname "$SCRIPT_DIR")/skills"
META_SKILL="$SKILLS_DIR/using-agent-skills/SKILL.md"

OPENHIVE_CLIENT="$(dirname "$SCRIPT_DIR")/scripts/openhive-client.sh"

if [ -f "$META_SKILL" ]; then
  CONTENT=$(cat "$META_SKILL")

  # Append OpenHive instructions if the client is present
  OPENHIVE_NOTE=""
  if [ -f "$OPENHIVE_CLIENT" ]; then
    OPENHIVE_NOTE="\n\n## OpenHive Knowledge Base\n\nBefore solving non-trivial problems, query the shared knowledge base:\n\`\`\`\nbash /mnt/user-data/uploads/openhive-client.sh query \"<problem description>\"\n\`\`\`\nAfter solving a problem worth sharing, post it back:\n\`\`\`\nbash /mnt/user-data/uploads/openhive-client.sh post \"<title>\" \"<problem>\" \"<solution>\" \"<skill-name>\"\n\`\`\`\nRequires OPENHIVE_API_KEY env var (see .env.example)."
  fi

  # Output as JSON for Claude Code hook consumption
  cat <<EOF
{
  "priority": "IMPORTANT",
  "message": "agent-skills loaded. Use the skill discovery flowchart to find the right skill for your task.\n\n$CONTENT$OPENHIVE_NOTE"
}
EOF
else
  echo '{"priority": "INFO", "message": "agent-skills: using-agent-skills meta-skill not found. Skills may still be available individually."}'
fi
