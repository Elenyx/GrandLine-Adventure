param(
    [string]$Message = "chore: apply changes from assistant",
    [switch]$Force
)

# Determine current branch
$branch = git rev-parse --abbrev-ref HEAD 2>$null
if (-not $branch) {
    Write-Error "Could not determine current git branch. Aborting push."
    exit 1
}
$branch = $branch.Trim()

Write-Host "Staging all changes..."
git add -A

Write-Host "Committing with message: $Message"
git commit -m "$Message" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "No changes to commit or commit failed. Continuing to push if remote is ahead/behind."
}

Write-Host "Pushing branch '$branch' to origin..."
git push origin $branch
if ($LASTEXITCODE -ne 0) {
    Write-Error "git push failed. Please verify remote access and run the script manually."
    exit $LASTEXITCODE
}

Write-Host "Push complete."
