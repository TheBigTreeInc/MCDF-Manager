<#
.SYNOPSIS
  Builds a .mcdfauth package from a legacy MCDF Manager config/local-storage export.

.DESCRIPTION
  The .mcdfauth package is a portable publisher identity backup. It contains the
  private key, public key, and server-issued certificate for an existing publisher
  identity. Keep the generated file private.

  This script accepts a legacy JSON config file. It also accepts explicit key
  values as parameters when the old config used different names.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\Build-MCDFAuthFromLegacyConfig.ps1 `
    -ConfigPath "$env:USERPROFILE\.mcdf-manager\old-config.json" `
    -OutputPath "$env:USERPROFILE\Desktop\dorbian.mcdfauth"

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\Build-MCDFAuthFromLegacyConfig.ps1 `
    -OutputPath "$env:USERPROFILE\Desktop\dorbian.mcdfauth" `
    -PublisherId dorbian `
    -DisplayName Dorbian `
    -PublicKey '<base64 spki>' `
    -PrivateKey '<base64 pkcs8>' `
    -Certificate '<pem certificate>'
#>
[CmdletBinding()]
param(
  [string]$ConfigPath,
  [Parameter(Mandatory=$true)] [string]$OutputPath,
  [string]$ArchiveHost,
  [string]$PublisherId,
  [string]$Username,
  [string]$DisplayName,
  [string]$PublicKey,
  [string]$PrivateKey,
  [string]$Certificate,
  [string]$CaId
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Read-JsonFile([string]$Path) {
  if (-not $Path) { return $null }
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Legacy config file not found: $Path"
  }
  $raw = Get-Content -LiteralPath $Path -Raw
  if (-not $raw.Trim()) { throw "Legacy config file is empty: $Path" }
  return $raw | ConvertFrom-Json -Depth 100
}

function Walk-Json($Value) {
  if ($null -eq $Value) { return }
  if ($Value -is [System.Array]) {
    foreach ($item in $Value) { Walk-Json $item }
    return
  }
  if ($Value -is [pscustomobject]) {
    foreach ($prop in $Value.PSObject.Properties) {
      [pscustomobject]@{ Name = [string]$prop.Name; Value = $prop.Value }
      Walk-Json $prop.Value
    }
    return
  }
  if ($Value -is [System.Collections.IDictionary]) {
    foreach ($key in $Value.Keys) {
      [pscustomobject]@{ Name = [string]$key; Value = $Value[$key] }
      Walk-Json $Value[$key]
    }
  }
}

function Find-FirstString($Json, [string[]]$Names) {
  if ($null -eq $Json) { return $null }
  $normalized = $Names | ForEach-Object { $_.ToLowerInvariant() }
  foreach ($entry in (Walk-Json $Json)) {
    $name = $entry.Name.ToLowerInvariant()
    if ($normalized -contains $name) {
      if ($entry.Value -is [string] -and $entry.Value.Trim()) {
        return $entry.Value.Trim()
      }
    }
  }
  return $null
}

$config = Read-JsonFile $ConfigPath

if (-not $PrivateKey) {
  $PrivateKey = Find-FirstString $config @(
    'private_key', 'privateKey', 'privateKeyPkcs8', 'private_key_pkcs8',
    'publisher_private_key', 'publisherPrivateKey', 'mcdf.publisher.privateKey.pkcs8'
  )
}
if (-not $PublicKey) {
  $PublicKey = Find-FirstString $config @(
    'public_key', 'publicKey', 'publicKeySpki', 'public_key_spki',
    'publisher_public_key', 'publisherPublicKey', 'mcdf.publisher.publicKey.spki'
  )
}
if (-not $Certificate) {
  $Certificate = Find-FirstString $config @(
    'certificate', 'client_certificate', 'publisher_certificate',
    'publisherCertificate', 'mcdf.publisher.certificate'
  )
}
if (-not $PublisherId) {
  $PublisherId = Find-FirstString $config @(
    'publisher_id', 'publisherId', 'owner_id', 'ownerId', 'user_id', 'userId',
    'username', 'mcdf.publisher.username'
  )
}
if (-not $Username) {
  $Username = Find-FirstString $config @('username', 'publisher_username', 'publisherUsername', 'mcdf.publisher.username')
}
if (-not $DisplayName) {
  $DisplayName = Find-FirstString $config @('display_name', 'displayName', 'publisher_display_name', 'publisherDisplayName', 'mcdf.publisher.displayName')
}
if (-not $ArchiveHost) {
  $ArchiveHost = Find-FirstString $config @('archive_host', 'archiveHost', 'server_url', 'serverUrl', 'public_url', 'mcdf.archive.host')
}
if (-not $CaId) {
  $CaId = Find-FirstString $config @('ca_id', 'caId')
}

$missing = @()
if (-not $PrivateKey) { $missing += 'private key' }
if (-not $PublicKey) { $missing += 'public key' }
if (-not $Certificate) { $missing += 'certificate' }
if ($missing.Count -gt 0) {
  throw "Cannot build .mcdfauth package. Missing: $($missing -join ', '). Provide them as parameters or export a config/local-storage JSON that contains them."
}

if (-not $PublisherId) { $PublisherId = $Username }
if (-not $Username) { $Username = $PublisherId }
if (-not $DisplayName) { $DisplayName = $Username }
if (-not $PublisherId) { $PublisherId = ($DisplayName -replace '[^a-zA-Z0-9_-]+','-').Trim('-').ToLowerInvariant() }
if (-not $Username) { $Username = $PublisherId }
if (-not $ArchiveHost) { $ArchiveHost = $null }

$package = [ordered]@{
  schema_version = 1
  package_kind = 'mcdf-client-auth'
  exported_at = (Get-Date).ToUniversalTime().ToString('o')
  archive_host = $ArchiveHost
  archive_endpoint = $null
  publisher_id = $PublisherId
  username = $Username
  display_name = $DisplayName
  public_key = $PublicKey
  private_key = $PrivateKey
  certificate = $Certificate
  ca_id = $CaId
  notes = @(
    'Migrated from a legacy MCDF Manager config.',
    'This package contains a private key. Keep it private and do not share it.'
  )
}

$out = [System.IO.Path]::GetFullPath($OutputPath)
if ([System.IO.Path]::GetExtension($out).ToLowerInvariant() -ne '.mcdfauth') {
  $out = [System.IO.Path]::ChangeExtension($out, '.mcdfauth')
}
$parent = [System.IO.Path]::GetDirectoryName($out)
if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
$package | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $out -Encoding UTF8
Write-Host "Created MCDF auth package: $out"
Write-Host "Import it in MCDF Manager using Register and Connect > Import."
