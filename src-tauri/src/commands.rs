use crate::local_cache;
use crate::mcdf::{ExtractedFileInfo, MCDFParser, MareCharaFileData, ParsedMCDFPackage};
use crate::online_locations::{self, OnlineLocation, OnlineLocationScanResult, OnlineLocationType, OnlineManifestBuildRequest};
use crate::vault_manifest::{self, ManifestBuildResult, ManifestStatus, RebuildResult, VaultManifest};
use std::fs::{self, File};
use std::io::BufReader;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::Duration;
use serde::{Deserialize, Serialize};
use tauri::command;

#[command]
pub fn window_minimize(window: tauri::Window) -> Result<(), String> {
    window.minimize().map_err(|error| error.to_string())
}

#[command]
pub fn window_toggle_maximize(window: tauri::Window) -> Result<(), String> {
    if window.is_maximized().map_err(|error| error.to_string())? {
        window.unmaximize().map_err(|error| error.to_string())
    } else {
        window.maximize().map_err(|error| error.to_string())
    }
}

#[command]
pub fn window_close(window: tauri::Window) -> Result<(), String> {
    window.close().map_err(|error| error.to_string())
}









#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportedPreviewImage {
    pub source_path: String,
    pub cached_path: String,
    pub bytes: u64,
    pub blake3: String,
}

#[command]
pub fn import_preview_image(source_path: String) -> Result<ImportedPreviewImage, String> {
    let source_path = source_path.trim().to_string();
    if source_path.is_empty() {
        return Err("Choose a preview image first.".to_string());
    }
    let source = PathBuf::from(&source_path);
    if !source.exists() {
        return Err(format!("Preview image does not exist: {source_path}"));
    }
    if !source.is_file() {
        return Err(format!("Preview image path is not a file: {source_path}"));
    }
    let bytes = fs::read(&source).map_err(|error| format!("Preview image could not be read from {source_path}: {error}"))?;
    if bytes.len() > 5 * 1024 * 1024 {
        return Err("Preview image is too large; keep MCDF Manager previews below 5 MiB.".to_string());
    }
    let extension = source
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("png")
        .trim_start_matches('.')
        .to_ascii_lowercase();
    let extension = match extension.as_str() {
        "jpg" | "jpeg" | "png" | "webp" | "gif" => extension,
        _ => "png".to_string(),
    };
    let hash = blake3::hash(&bytes).to_hex().to_string();
    let preview_dir = local_cache::library_dir()?.join("previews");
    fs::create_dir_all(&preview_dir).map_err(|error| format!("Failed to create preview image folder: {error}"))?;
    let cached = preview_dir.join(format!("preview-{}.{}", &hash[..24], extension));
    if !cached.exists() {
        fs::write(&cached, &bytes).map_err(|error| format!("Failed to save preview image in MCDF Manager library: {error}"))?;
    }
    Ok(ImportedPreviewImage {
        source_path,
        cached_path: cached.to_string_lossy().to_string(),
        bytes: bytes.len() as u64,
        blake3: hash,
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportLocalMcdfResult {
    pub source_path: String,
    pub output_path: String,
    pub bytes_written: u64,
}

#[command]
pub fn export_local_mcdf_file(source_path: String, output_path: String) -> Result<ExportLocalMcdfResult, String> {
    let source = PathBuf::from(&source_path);
    if !source.exists() {
        return Err(format!("Local MCDF source does not exist: {source_path}"));
    }
    if !source.is_file() {
        return Err(format!("Local MCDF source is not a file: {source_path}"));
    }
    let output = PathBuf::from(&output_path);
    if let Some(parent) = output.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent).map_err(|error| format!("Failed to create export folder: {error}"))?;
        }
    }
    let bytes_written = fs::copy(&source, &output).map_err(|error| format!("Failed to export MCDF: {error}"))?;
    Ok(ExportLocalMcdfResult {
        source_path,
        output_path,
        bytes_written,
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportInternalMcdfFileResult {
    pub source_path: String,
    pub output_path: String,
    pub index: usize,
    pub payload_blake3: String,
    pub bytes_written: u64,
}

#[command]
pub fn export_internal_mcdf_file(
    source_path: String,
    output_path: String,
    file_index: usize,
    payload_blake3: String,
) -> Result<ExportInternalMcdfFileResult, String> {
    let source = PathBuf::from(&source_path);
    if !source.exists() {
        return Err(format!("Local MCDF source does not exist: {source_path}"));
    }
    if !source.is_file() {
        return Err(format!("Local MCDF source is not a file: {source_path}"));
    }
    let file = File::open(&source).map_err(|error| format!("Failed to open MCDF for layer export: {error}"))?;
    let mut reader = BufReader::new(file);
    let package = MCDFParser::parse_package(&mut reader).map_err(|error| format!("Failed to parse MCDF for layer export: {error}"))?;
    let expected_hash = payload_blake3.trim().to_ascii_lowercase();
    let info = package
        .files
        .iter()
        .find(|file| file.index == file_index && file.blake3.eq_ignore_ascii_case(&expected_hash))
        .or_else(|| package.files.iter().find(|file| file.blake3.eq_ignore_ascii_case(&expected_hash)))
        .ok_or_else(|| format!("Internal file {file_index} / {expected_hash} was not found in this MCDF."))?;
    let payload = package
        .file_payload_slice(info)
        .map_err(|error| format!("Failed to read internal MCDF file slice: {error}"))?;
    let verified_hash = blake3::hash(payload).to_hex().to_string();
    if !expected_hash.is_empty() && verified_hash != expected_hash {
        return Err(format!("Internal file hash changed while exporting. Expected {expected_hash}, got {verified_hash}."));
    }
    let output = PathBuf::from(&output_path);
    if let Some(parent) = output.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent).map_err(|error| format!("Failed to create export folder: {error}"))?;
        }
    }
    fs::write(&output, payload).map_err(|error| format!("Failed to save internal MCDF file: {error}"))?;
    Ok(ExportInternalMcdfFileResult {
        source_path,
        output_path,
        index: info.index,
        payload_blake3: verified_hash,
        bytes_written: payload.len() as u64,
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageSettingsResponse {
    pub schema_version: u32,
    pub initialized: bool,
    pub settings_file: String,
    pub app_home_dir: String,
    pub library_dir: String,
    pub exchange_cache_dir: String,
    pub downloads_dir: String,
    pub auto_import_dirs: Vec<String>,
    pub auto_import_recursive: bool,
    pub admin_token: Option<String>,
    pub notes: Vec<String>,
}

impl From<local_cache::StorageSettings> for StorageSettingsResponse {
    fn from(value: local_cache::StorageSettings) -> Self {
        Self {
            schema_version: value.schema_version,
            initialized: value.initialized,
            settings_file: value.settings_file,
            app_home_dir: value.app_home_dir,
            library_dir: value.library_dir,
            exchange_cache_dir: value.exchange_cache_dir,
            downloads_dir: value.downloads_dir,
            auto_import_dirs: value.auto_import_dirs,
            auto_import_recursive: value.auto_import_recursive,
            admin_token: value.admin_token,
            notes: value.notes,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct StorageSettingsUpdateRequest {
    pub settings_file: Option<String>,
    pub library_dir: Option<String>,
    pub exchange_cache_dir: Option<String>,
    pub downloads_dir: Option<String>,
    pub auto_import_dirs: Option<Vec<String>>,
    pub auto_import_recursive: Option<bool>,
    pub initialized: Option<bool>,
    pub admin_token: Option<String>,
}


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageUsageItem {
    pub label: String,
    pub path: String,
    pub bytes: u64,
    pub files: u64,
    pub directories: u64,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageUsageResponse {
    pub total_bytes: u64,
    pub items: Vec<StorageUsageItem>,
}

fn directory_usage(path: &Path) -> (u64, u64, u64) {
    let mut bytes = 0u64;
    let mut files = 0u64;
    let mut directories = 0u64;
    let mut stack = vec![path.to_path_buf()];
    while let Some(current) = stack.pop() {
        let entries = match fs::read_dir(&current) {
            Ok(value) => value,
            Err(_) => continue,
        };
        for entry in entries.flatten() {
            let entry_path = entry.path();
            let metadata = match entry.metadata() {
                Ok(value) => value,
                Err(_) => continue,
            };
            if metadata.is_dir() {
                directories = directories.saturating_add(1);
                stack.push(entry_path);
            } else if metadata.is_file() {
                files = files.saturating_add(1);
                bytes = bytes.saturating_add(metadata.len());
            }
        }
    }
    (bytes, files, directories)
}

fn storage_usage_item(label: &str, path: String) -> StorageUsageItem {
    let path_buf = PathBuf::from(&path);
    if !path_buf.exists() {
        return StorageUsageItem {
            label: label.to_string(),
            path,
            bytes: 0,
            files: 0,
            directories: 0,
            error: Some("Folder does not exist yet.".to_string()),
        };
    }
    if !path_buf.is_dir() {
        return StorageUsageItem {
            label: label.to_string(),
            path,
            bytes: 0,
            files: 0,
            directories: 0,
            error: Some("Path is not a folder.".to_string()),
        };
    }
    let (bytes, files, directories) = directory_usage(&path_buf);
    StorageUsageItem {
        label: label.to_string(),
        path,
        bytes,
        files,
        directories,
        error: None,
    }
}

#[command]
pub fn get_storage_usage() -> Result<StorageUsageResponse, String> {
    let settings = local_cache::storage_settings()?;
    let items = vec![
        storage_usage_item("App home", settings.app_home_dir),
        storage_usage_item("My Library", settings.library_dir),
        storage_usage_item("Exchange cache", settings.exchange_cache_dir),
        storage_usage_item("Downloads", settings.downloads_dir),
    ];
    // Add each configured storage root only once. When Library/Exchange/Downloads
    // live below the app home, the app home already includes their bytes.
    let mut roots: Vec<(PathBuf, u64)> = items
        .iter()
        .filter(|item| item.error.is_none())
        .map(|item| {
            let raw = PathBuf::from(&item.path);
            let path = fs::canonicalize(&raw).unwrap_or(raw);
            (path, item.bytes)
        })
        .collect();
    roots.sort_by_key(|(path, _)| path.components().count());
    let mut counted: Vec<PathBuf> = Vec::new();
    let mut total = 0u64;
    for (path, bytes) in roots {
        if counted.iter().any(|root| path.starts_with(root)) {
            continue;
        }
        counted.push(path);
        total = total.saturating_add(bytes);
    }
    Ok(StorageUsageResponse { total_bytes: total, items })
}

#[command]
pub fn get_storage_settings() -> Result<StorageSettingsResponse, String> {
    Ok(local_cache::storage_settings()?.into())
}

#[command]
pub fn save_storage_settings(update: StorageSettingsUpdateRequest) -> Result<StorageSettingsResponse, String> {
    let update = local_cache::StorageSettingsUpdate {
        settings_file: update.settings_file,
        library_dir: update.library_dir,
        exchange_cache_dir: update.exchange_cache_dir,
        downloads_dir: update.downloads_dir,
        auto_import_dirs: update.auto_import_dirs,
        auto_import_recursive: update.auto_import_recursive,
        initialized: update.initialized,
        admin_token: update.admin_token,
    };
    Ok(local_cache::save_storage_settings(update)?.into())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutoImportCandidate {
    pub local_path: String,
    pub original_filename: String,
    pub title: String,
    pub description: String,
    pub package_hash_blake3: String,
    pub file_count: usize,
    pub total_file_bytes: u64,
    pub component_kinds: Vec<String>,
    pub file_manifest: Vec<FileManifestEntry>,
    pub notes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutoImportFolderResult {
    pub folder: String,
    pub scanned_file_count: usize,
    pub imported_count: usize,
    pub entries: Vec<AutoImportCandidate>,
    pub notes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileManifestEntry {
    pub index: usize,
    pub game_paths: Vec<String>,
    pub length: u32,
    pub payload_blake3: String,
}

fn collect_mcdf_paths(folder: &Path, recursive: bool, output: &mut Vec<PathBuf>, notes: &mut Vec<String>) -> Result<(), String> {
    if !folder.exists() {
        notes.push(format!("Auto-import folder does not exist: {}", folder.to_string_lossy()));
        return Ok(());
    }
    if !folder.is_dir() {
        notes.push(format!("Auto-import path is not a folder: {}", folder.to_string_lossy()));
        return Ok(());
    }
    for entry in fs::read_dir(folder).map_err(|error| error.to_string())? {
        let entry = match entry {
            Ok(value) => value,
            Err(error) => {
                notes.push(format!("Could not read a folder entry: {error}"));
                continue;
            }
        };
        let path = entry.path();
        if path.is_dir() && recursive {
            collect_mcdf_paths(&path, recursive, output, notes)?;
        } else if path.is_file() && path.extension().and_then(|value| value.to_str()).map(|value| value.eq_ignore_ascii_case("mcdf")).unwrap_or(false) {
            output.push(path);
        }
    }
    Ok(())
}

fn file_manifest_entries(files: &[ExtractedFileInfo]) -> Vec<FileManifestEntry> {
    files.iter().map(|file| FileManifestEntry {
        index: file.index,
        game_paths: file.game_paths.clone(),
        length: file.length,
        payload_blake3: file.blake3.clone(),
    }).collect()
}

#[command]
pub fn scan_auto_import_folder(folder: String, recursive: Option<bool>) -> Result<AutoImportFolderResult, String> {
    let root = PathBuf::from(folder.trim());
    let recursive = recursive.unwrap_or(false);
    let mut notes = Vec::new();
    let mut paths = Vec::new();
    collect_mcdf_paths(&root, recursive, &mut paths, &mut notes)?;
    paths.sort();
    let scanned_file_count = paths.len();
    let mut entries = Vec::new();
    for path in paths {
        let bytes = match fs::read(&path) {
            Ok(value) => value,
            Err(error) => {
                notes.push(format!("Skipped {}: {error}", path.to_string_lossy()));
                continue;
            }
        };
        let package_hash = blake3::hash(&bytes).to_hex().to_string();
        let parsed = match MCDFParser::parse_package_from_slice(&bytes) {
            Ok(value) => value,
            Err(error) => {
                notes.push(format!("Skipped {}: {error}", path.to_string_lossy()));
                continue;
            }
        };
        let mut kinds: Vec<String> = parsed.files
            .iter()
            .flat_map(|file| file.game_paths.iter().take(1))
            .map(|path| infer_component_kind_from_path(path))
            .collect();
        kinds.sort();
        kinds.dedup();
        kinds.truncate(8);
        let file_name = path.file_name().and_then(|value| value.to_str()).unwrap_or("imported.mcdf").to_string();
        entries.push(AutoImportCandidate {
            local_path: path.to_string_lossy().to_string(),
            original_filename: file_name.clone(),
            title: file_name.trim_end_matches(".mcdf").to_string(),
            description: parsed.metadata.description.clone(),
            package_hash_blake3: package_hash,
            file_count: parsed.files.len(),
            total_file_bytes: parsed.files.iter().map(|file| file.length as u64).sum(),
            component_kinds: kinds,
            file_manifest: file_manifest_entries(&parsed.files),
            notes: vec!["Imported from a configured auto-import folder.".to_string()],
        });
    }
    let imported_count = entries.len();
    Ok(AutoImportFolderResult {
        folder: root.to_string_lossy().to_string(),
        scanned_file_count,
        imported_count,
        entries,
        notes,
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexSshKeyResult {
    pub ssh_dir: String,
    pub private_key_file: String,
    pub public_key_file: String,
    pub public_key: Option<String>,
    pub created: bool,
    pub notes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexSshTestResult {
    pub ssh_key_file: String,
    pub remote: String,
    pub ok: bool,
    pub exit_code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
    pub notes: Vec<String>,
}

fn default_index_ssh_dir() -> Result<PathBuf, String> {
    Ok(local_cache::app_home()?.join("ssh"))
}

fn default_index_ssh_key_file() -> Result<PathBuf, String> {
    Ok(default_index_ssh_dir()?.join("mcdf_index_ed25519"))
}

fn read_text_if_exists(path: &Path) -> Option<String> {
    fs::read_to_string(path).ok().map(|value| value.trim().to_string()).filter(|value| !value.is_empty())
}

#[command]
pub fn ensure_public_index_ssh_key() -> Result<IndexSshKeyResult, String> {
    let ssh_dir = default_index_ssh_dir()?;
    fs::create_dir_all(&ssh_dir).map_err(|error| error.to_string())?;
    let private_key = default_index_ssh_key_file()?;
    let public_key = private_key.with_extension("pub");
    let mut created = false;
    let mut notes = Vec::new();
    if !private_key.exists() || !public_key.exists() {
        let output = Command::new("ssh-keygen")
            .arg("-t")
            .arg("ed25519")
            .arg("-C")
            .arg("mcdf-registry-server public index writer")
            .arg("-f")
            .arg(&private_key)
            .arg("-N")
            .arg("")
            .output()
            .map_err(|error| format!("failed to start ssh-keygen: {error}"))?;
        if !output.status.success() {
            return Err(format!(
                "ssh-keygen failed with exit {:?}: {}",
                output.status.code(),
                String::from_utf8_lossy(&output.stderr).trim()
            ));
        }
        created = true;
        notes.push("Created a dedicated SSH deploy key for index publishing.".to_string());
    } else {
        notes.push("Existing index SSH deploy key found; no new key was generated.".to_string());
    }
    notes.push("Add the public key to the index repository as a deploy key with write access.".to_string());
    Ok(IndexSshKeyResult {
        ssh_dir: ssh_dir.to_string_lossy().to_string(),
        private_key_file: private_key.to_string_lossy().to_string(),
        public_key_file: public_key.to_string_lossy().to_string(),
        public_key: read_text_if_exists(&public_key),
        created,
        notes,
    })
}

#[command]
pub fn test_public_index_ssh_key(remote: Option<String>) -> Result<IndexSshTestResult, String> {
    let ssh_key = default_index_ssh_key_file()?;
    let remote = remote.unwrap_or_else(|| "git@github.com:obscure-crescent/moon-sparkles.git".to_string());
    let mut notes = Vec::new();
    if !ssh_key.exists() {
        notes.push("SSH key does not exist yet. Generate it first and add the public key to the repository deploy keys.".to_string());
        return Ok(IndexSshTestResult {
            ssh_key_file: ssh_key.to_string_lossy().to_string(),
            remote,
            ok: false,
            exit_code: None,
            stdout: String::new(),
            stderr: String::new(),
            notes,
        });
    }
    let git_ssh = format!(
        "ssh -i \"{}\" -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new",
        ssh_key.to_string_lossy()
    );
    let output = Command::new("git")
        .arg("ls-remote")
        .arg(&remote)
        .env("GIT_SSH_COMMAND", git_ssh)
        .output()
        .map_err(|error| format!("failed to start git ls-remote: {error}"))?;
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let ok = output.status.success();
    if ok {
        notes.push("SSH access to the index repository works for this server user.".to_string());
    } else {
        notes.push("SSH access failed. Check that the public key was added as a deploy key with write access.".to_string());
    }
    Ok(IndexSshTestResult {
        ssh_key_file: ssh_key.to_string_lossy().to_string(),
        remote,
        ok,
        exit_code: output.status.code(),
        stdout,
        stderr,
        notes,
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArchiveConfigResponse {
    pub schema_version: u32,
    pub service_name: String,
    pub api_version: String,
    pub generated_at: String,
    pub server: serde_json::Value,
    pub uploads: serde_json::Value,
    pub storage: serde_json::Value,
    pub public_index: serde_json::Value,
    pub catalog: serde_json::Value,
    pub identity: ArchiveIdentityConfigValue,
    pub notes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArchiveIdentityConfigValue {
    pub publisher_registration: Option<String>,
    pub client_keys_supported: Option<bool>,
    pub current_local_owner_id: Option<String>,
    pub current_publisher_id: Option<String>,
    pub identity_endpoint: Option<String>,
    pub registration_endpoint: Option<String>,
    pub notes: Option<Vec<String>>,
    #[serde(default)]
    pub certificate_authority: Option<ArchiveCaConfigValue>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArchiveCaConfigValue {
    pub enabled: Option<bool>,
    pub ca_id: Option<String>,
    pub ca_name: Option<String>,
    pub ca_public_key: Option<String>,
    pub ca_status_endpoint: Option<String>,
    pub client_certificate_endpoint: Option<String>,
    pub notes: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArchiveCaStatusResponse {
    pub schema_version: u32,
    pub ca_id: String,
    pub ca_name: String,
    pub ca_public_key: String,
    pub status: String,
    pub issued_certificate_count: usize,
    pub validity_years: i64,
    pub valid_from: String,
    pub valid_until: String,
    pub created_at: String,
    pub updated_at: String,
    pub notes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IssueClientCertificateRequest {
    pub username: Option<String>,
    pub display_name: Option<String>,
    pub label: Option<String>,
    pub public_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublisherIdentityRecord {
    pub schema_version: u32,
    pub publisher_id: String,
    pub username: Option<String>,
    pub display_name: String,
    pub public_key: Option<String>,
    pub certificate: Option<String>,
    pub status: String,
    pub source: String,
    pub created_at: String,
    pub updated_at: String,
    pub notes: Vec<String>,
}


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClientAuthExportPackage {
    pub schema_version: u32,
    pub package_kind: String,
    pub exported_at: String,
    pub archive_host: Option<String>,
    pub archive_endpoint: Option<String>,
    pub publisher_id: String,
    pub username: Option<String>,
    pub display_name: String,
    pub public_key: String,
    pub private_key: String,
    pub certificate: String,
    pub ca_id: Option<String>,
    pub notes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegisterIdentityRequest {
    pub display_name: Option<String>,
    pub public_key: Option<String>,
    pub certificate: Option<String>,
    pub label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PreviewCropData {
    #[serde(default)]
    pub x: f64,
    #[serde(default)]
    pub y: f64,
    #[serde(default)]
    pub scale: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublicPackageRecord {
    pub schema_version: u32,
    pub generated_at: String,
    pub package_hash_blake3: String,
    pub original_filename: String,
    #[serde(default)]
    pub title: Option<String>,
    pub description: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub preview_image_path: Option<String>,
    #[serde(default)]
    pub preview_crop: Option<PreviewCropData>,
    #[serde(default)]
    pub is_adult: bool,
    #[serde(default)]
    pub visibility: Option<String>,
    pub owner: PublicOwnerRecord,
    pub parser_revision: u32,
    pub parser_status: String,
    pub rebuild_strategy: String,
    pub container_encoding: String,
    #[serde(default)]
    pub exact_rebuild: Option<PublicExactRebuildData>,
    pub validation: PublicValidationRecord,
    pub file_count: usize,
    pub total_file_bytes: u64,
    #[serde(default)]
    pub files: Vec<PublicPackageFileRecord>,
    pub ghcr_manifest_ref: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PublicOwnerRecord {
    #[serde(default)]
    pub display_name: String,
    #[serde(default)]
    pub public_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PublicValidationRecord {
    #[serde(default)]
    pub decoded_content_identical: bool,
    #[serde(default)]
    pub file_payloads_hash_verified: bool,
    #[serde(default)]
    pub file_payload_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PublicExactRebuildData {
    pub mcdf_offset: usize,
    pub version: u8,
    pub json_len: usize,
    pub payload_start: usize,
    pub payload_end: usize,
    pub prefix_hex: String,
    pub header_hex: String,
    pub trailer_hex: String,
    #[serde(default)]
    pub container_encoding: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PublicPackageFileRecord {
    #[serde(default)]
    pub index: usize,
    #[serde(default)]
    pub payload_blake3: String,
    #[serde(default)]
    pub length: u32,
    #[serde(default)]
    pub game_paths: Vec<String>,
    #[serde(default)]
    pub media_type: String,
    #[serde(default)]
    pub component_kind: String,
    #[serde(default)]
    pub display_name: String,
    #[serde(default)]
    pub ghcr_ref: Option<String>,
    #[serde(default)]
    pub ghcr_digest: Option<String>,
    #[serde(default)]
    pub direct_blob_url: Option<String>,
    #[serde(default)]
    pub file_metadata_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArchiveDownloadResult {
    pub output_path: String,
    pub bytes_written: u64,
    /// The canonical package hash for the listing/source when known. For Exchange
    /// component rebuilds this remains the original published package hash, even
    /// when the rebuilt container bytes are not byte-for-byte identical.
    pub package_hash_blake3: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rebuilt_package_hash_blake3: Option<String>,
    #[serde(default)]
    pub package_hash_verified: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub download_note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CentralServerHealth {
    pub status: String,
    pub public_url: String,
    pub storage_mode: String,
    pub ghcr_configured: bool,
    pub uploads_require_auth: bool,
    #[serde(default)]
    pub service_port: Option<u16>,
    #[serde(default)]
    pub hosted_auth_mode: Option<String>,
    #[serde(default)]
    pub ca_id: Option<String>,
    #[serde(default)]
    pub client_certificates_supported: Option<bool>,
}


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageCatalogSummary {
    pub schema_version: u32,
    pub generated_at: String,
    pub package_count: usize,
    pub file_count: usize,
    pub total_file_bytes: u64,
    pub ghcr_file_count: usize,
    pub catalog_dir: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublicIndexLatest {
    pub schema_version: u32,
    pub generated_at: String,
    pub package_count: usize,
    pub packages: Vec<PublicIndexPackageSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublicIndexExportResponse {
    pub enabled: bool,
    pub index_dir: Option<String>,
    pub package_count: usize,
    pub file_count: usize,
    pub committed: bool,
    pub pushed: bool,
    pub notes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublicIndexStatusResponse {
    pub enabled: bool,
    pub repo: String,
    pub branch: String,
    pub index_dir: Option<String>,
    pub public_dir: Option<String>,
    pub latest_index_path: Option<String>,
    pub latest_index_exists: bool,
    pub commit_enabled: bool,
    pub push_enabled: bool,
    pub include_private: bool,
    pub git_worktree_present: bool,
    pub git_dirty: bool,
    pub git_head: Option<String>,
    pub package_count: usize,
    pub file_metadata_count: usize,
    pub notes: Vec<String>,
}


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublicIndexDiagnosticsResponse {
    pub enabled: bool,
    pub repo: String,
    pub branch: String,
    pub index_dir: Option<String>,
    pub public_dir: Option<String>,
    pub git_available: bool,
    pub git_version: Option<String>,
    pub credential_helper: Option<String>,
    pub credential_manager_version: Option<String>,
    pub token_auth_configured: bool,
    pub token_auth_source: Option<String>,
    pub ssh_auth_configured: bool,
    pub ssh_key_file: Option<String>,
    pub ssh_key_exists: bool,
    pub auth_method: String,
    pub worktree_exists: bool,
    pub worktree_initialized: bool,
    pub origin_url: Option<String>,
    pub current_branch: Option<String>,
    pub head: Option<String>,
    pub dirty: bool,
    pub latest_index_exists: bool,
    pub package_count: usize,
    pub file_metadata_count: usize,
    pub checks: Vec<PublicIndexDiagnosticCheck>,
    pub notes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublicIndexDiagnosticCheck {
    pub name: String,
    pub ok: bool,
    pub detail: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublicIndexPackageSummary {
    pub package_hash_blake3: String,
    pub original_filename: String,
    #[serde(default)]
    pub title: Option<String>,
    pub description: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub preview_image_path: Option<String>,
    #[serde(default)]
    pub preview_crop: Option<PreviewCropData>,
    #[serde(default)]
    pub is_adult: bool,
    #[serde(default)]
    pub visibility: Option<String>,
    pub owner_display_name: String,
    pub owner_public_id: String,
    pub file_count: usize,
    pub total_file_bytes: u64,
    pub component_kinds: Vec<String>,
    pub package_manifest_path: String,
    pub download_manifest_path: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CentralUploadResponse {
    pub package_hash_blake3: String,
    pub package_size: u64,
    pub file_count: usize,
    pub archived_file_count: usize,
    pub deduplicated_file_count: usize,
    pub manifest_url: String,
    pub download_url: String,
    pub storage_mode: String,
    #[serde(default)]
    pub ownership: Option<serde_json::Value>,
    #[serde(default)]
    pub validation: Option<serde_json::Value>,
    pub notes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PackageMarketplaceMetadata {
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub preview_image: Option<PackagePreviewImage>,
    #[serde(default)]
    pub preview_crop: Option<PreviewCropData>,
    #[serde(default)]
    pub is_adult: bool,
    #[serde(default)]
    pub visibility: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackagePreviewImage {
    pub filename: String,
    pub media_type: String,
    pub bytes_hex: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessRequestRecord {
    pub schema_version: u32,
    pub id: String,
    pub package_hash_blake3: String,
    pub package_title: Option<String>,
    pub owner_public_id: String,
    pub owner_display_name: String,
    pub requester_id: Option<String>,
    pub requester_display_name: String,
    pub requested_at: String,
    pub updated_at: String,
    pub status: String,
    pub note: Option<String>,
    pub decision_note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessRequestListResponse {
    pub schema_version: u32,
    pub generated_at: String,
    pub request_count: usize,
    pub requests: Vec<AccessRequestRecord>,
    pub notes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobCreateResponse {
    pub job_id: String,
    pub status_url: String,
    pub state: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobStatusResponse {
    pub job_id: String,
    pub label: String,
    pub state: String,
    pub message: String,
    pub created_at: String,
    pub updated_at: String,
    #[serde(default)]
    pub result: Option<serde_json::Value>,
    #[serde(default)]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FileDisplayMetadata {
    pub primary_game_path: String,
    pub display_name: String,
    pub extension: String,
    pub component_kind: String,
    pub size_bytes: u64,
    pub preview_supported: bool,
    pub render_status: String,
    pub metadata_notes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInventoryEntry {
    pub index: usize,
    pub game_paths: Vec<String>,
    pub length: u32,
    pub mcdf_hash: String,
    pub payload_offset: u64,
    pub payload_blake3: String,
    pub media_type: String,
    pub metadata: FileDisplayMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileProbeRequest {
    pub files: Vec<FileInventoryEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileAvailability {
    pub payload_blake3: String,
    pub length: u32,
    pub game_paths: Vec<String>,
    pub metadata: FileDisplayMetadata,
    pub upload_url: Option<String>,
    pub direct_blob_url: Option<String>,
    pub oci_ref: Option<String>,
    #[serde(default)]
    pub oci_digest: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileProbeResponse {
    pub known_files: Vec<FileAvailability>,
    pub missing_files: Vec<FileAvailability>,
}

fn inventory_from_extracted_files(files: Vec<ExtractedFileInfo>) -> Vec<FileInventoryEntry> {
    files
        .into_iter()
        .map(|file| FileInventoryEntry {
            index: file.index,
            game_paths: file.game_paths.clone(),
            length: file.length,
            mcdf_hash: file.hash.clone(),
            payload_offset: file.offset,
            payload_blake3: file.blake3.clone(),
            media_type: guess_media_type_from_paths(&file.game_paths),
            metadata: file_display_metadata(&file.game_paths, file.length as u64),
        })
        .collect()
}

#[command]
pub fn probe_mcdf_hash_manifest(
    server_url: String,
    bearer_token: Option<String>,
    files: Vec<ExtractedFileInfo>,
) -> Result<FileProbeResponse, String> {
    let base = normalize_archive_server_url(&server_url)?;
    let client = archive_http_client()?;
    let inventory = inventory_from_extracted_files(files);
    let mut request = client
        .post(format!("{base}/v1/files/probe"))
        .json(&FileProbeRequest { files: inventory });
    if let Some(token) = bearer_token.as_deref().map(str::trim).filter(|value| !value.is_empty()) {
        request = request.bearer_auth(token);
    }
    let response = request.send().map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_else(|_| "<unreadable response body>".to_string());
        return Err(format!("online BLAKE3 availability check failed: HTTP {status}: {body}"));
    }
    response.json::<FileProbeResponse>().map_err(|error| error.to_string())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExactRebuildDataForServer {
    pub mcdf_offset: usize,
    pub version: u8,
    pub json_len: usize,
    pub payload_start: usize,
    pub payload_end: usize,
    pub prefix_hex: String,
    pub header_hex: String,
    pub trailer_hex: String,
    pub container_encoding: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegisterExtractedPackageRequest {
    pub package_hash_blake3: String,
    pub package_size: u64,
    pub original_filename: String,
    pub description: String,
    #[serde(default)]
    pub marketplace: PackageMarketplaceMetadata,
    pub metadata: MareCharaFileData,
    pub files: Vec<FileInventoryEntry>,
    pub exact_rebuild: ExactRebuildDataForServer,
    pub decoded_uploaded_blake3: String,
    pub container_encoding: String,
}

fn normalize_archive_server_url(input: &str) -> Result<String, String> {
    let mut trimmed = input.trim().trim_end_matches('/').to_string();
    if trimmed.is_empty() {
        return Ok("http://mcdf.thebigtree.life:48443".to_string());
    }

    if trimmed.chars().all(|ch| ch.is_ascii_digit()) || trimmed.starts_with(':') {
        return Err("MCDF Manager uses http://mcdf.thebigtree.life:48443. A bare port is not a valid registry address.".to_string());
    }

    let scheme = if trimmed.starts_with("http://") {
        trimmed = trimmed.trim_start_matches("http://").to_string();
        "http"
    } else if trimmed.starts_with("https://") {
        trimmed = trimmed.trim_start_matches("https://").to_string();
        "https"
    } else {
        ""
    };

    let host_port_path = trimmed.split('/').next().unwrap_or(trimmed.as_str());
    let host = if host_port_path.starts_with('[') {
        host_port_path.to_string()
    } else {
        host_port_path.split(':').next().unwrap_or(host_port_path).to_string()
    };
    let host = host.trim();
    if host.is_empty() {
        return Err("archive host is required".to_string());
    }

    let local_host = matches!(host, "localhost" | "127.0.0.1" | "::1");
    if local_host {
        return Err("MCDF Manager is pinned to http://mcdf.thebigtree.life:48443. Localhost registry URLs are not used by this build.".to_string());
    }
    let resolved_scheme = if scheme == "https" { "https" } else { "http" };
    Ok(format!("{resolved_scheme}://{host}:48443"))
}



fn registry_url_from_returned_value(base: &str, returned_url: Option<&str>, fallback_path: &str) -> Result<String, String> {
    let base = base.trim_end_matches('/');
    let raw = returned_url.map(str::trim).filter(|value| !value.is_empty());
    let Some(raw) = raw else {
        return Ok(format!("{base}{fallback_path}"));
    };

    if raw.starts_with('/') {
        return Ok(format!("{base}{raw}"));
    }

    if let Ok(parsed) = reqwest::Url::parse(raw) {
        let host = parsed.host_str().unwrap_or_default();
        let returned_localhost = matches!(host, "localhost" | "127.0.0.1" | "::1");
        if returned_localhost {
            let query = parsed.query().map(|value| format!("?{value}")).unwrap_or_default();
            return Ok(format!("{base}{}{}", parsed.path(), query));
        }
    }

    Ok(raw.to_string())
}

fn archive_http_client() -> Result<reqwest::blocking::Client, String> {
    reqwest::blocking::Client::builder()
        .connect_timeout(Duration::from_secs(8))
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|error| format!("archive HTTP client setup failed: {error}"))
}

fn archive_transport_error(base: &str, path: &str, error: reqwest::Error) -> String {
    let url = format!("{}{}", base.trim_end_matches('/'), path);
    let mut message = format!("Could not reach the MCDF archive service at {url}: {error}");
    if base.starts_with("https://") {
        message.push_str(". The client resolved this host to HTTPS on port 48443. If the server is currently started with the built-in Rust listener, it is HTTP-only unless a TLS proxy/certificate listener is configured. For this temporary deployment, enter the archive host as http://mcdf.thebigtree.life to force HTTP, or put TLS in front of the service.");
    }
    message
}

fn archive_get(base: &str, path: &str) -> Result<reqwest::blocking::Response, String> {
    archive_http_client()?
        .get(format!("{}{}", base.trim_end_matches('/'), path))
        .send()
        .map_err(|error| archive_transport_error(base, path, error))
}

#[command]
pub fn fetch_archive_config(server_url: String) -> Result<ArchiveConfigResponse, String> {
    let base = normalize_archive_server_url(&server_url)?;
    let response = archive_get(&base, "/v1/archive/config")?;
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_else(|_| "<unreadable response body>".to_string());
        return Err(format!("archive config fetch failed: HTTP {status}: {body}"));
    }
    response.json::<ArchiveConfigResponse>().map_err(|error| error.to_string())
}

#[command]
pub fn central_server_health(server_url: String) -> Result<CentralServerHealth, String> {
    let base = normalize_archive_server_url(&server_url)?;
    let response = archive_get(&base, "/v1/health")?;
    if !response.status().is_success() {
        return Err(format!("central server health check failed: HTTP {}", response.status()));
    }
    response.json::<CentralServerHealth>().map_err(|error| error.to_string())
}



#[command]
pub fn resolve_archive_endpoint(server_url: String) -> Result<String, String> {
    normalize_archive_server_url(&server_url)
}

#[command]
pub fn fetch_archive_ca_status(server_url: String) -> Result<ArchiveCaStatusResponse, String> {
    let base = normalize_archive_server_url(&server_url)?;
    let response = archive_get(&base, "/v1/ca/status")?;
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_else(|_| "<unreadable response body>".to_string());
        return Err(format!("archive CA status fetch failed: HTTP {status}: {body}"));
    }
    response.json::<ArchiveCaStatusResponse>().map_err(|error| error.to_string())
}

#[command]
pub fn issue_publisher_certificate(
    server_url: String,
    bearer_token: Option<String>,
    username: Option<String>,
    display_name: Option<String>,
    label: Option<String>,
    public_key: String,
) -> Result<PublisherIdentityRecord, String> {
    let base = normalize_archive_server_url(&server_url)?;
    let client = archive_http_client()?;
    let mut request = client.post(format!("{base}/v1/identity/issue-client-certificate")).json(&IssueClientCertificateRequest {
        username,
        display_name,
        label,
        public_key,
    });
    if let Some(token) = bearer_token.as_deref().filter(|value| !value.trim().is_empty()) {
        request = request.bearer_auth(token);
    }
    let response = request.send().map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_else(|_| "<unreadable response body>".to_string());
        return Err(format!("publisher certificate issue failed: HTTP {status}: {body}"));
    }
    let identity = response.json::<PublisherIdentityRecord>().map_err(|error| error.to_string())?;
    if let Some(cert) = identity.certificate.as_deref().filter(|value| !value.trim().is_empty()) {
        let app_home = local_cache::app_home()?;
        std::fs::create_dir_all(&app_home).map_err(|error| error.to_string())?;
        let cert_path = app_home.join("publisher-certificate.pem");
        std::fs::write(cert_path, cert).map_err(|error| error.to_string())?;
    }
    Ok(identity)
}


#[command]
pub fn export_client_auth_package(path: String, auth_package: ClientAuthExportPackage) -> Result<String, String> {
    if auth_package.private_key.trim().is_empty() {
        return Err("client auth export needs the local private key".to_string());
    }
    if auth_package.public_key.trim().is_empty() || auth_package.certificate.trim().is_empty() {
        return Err("client auth export needs the public key and server-issued certificate".to_string());
    }
    let mut export_path = PathBuf::from(path);
    if export_path.extension().and_then(|value| value.to_str()).map(|value| value.eq_ignore_ascii_case("mcdfauth")).unwrap_or(false) == false {
        export_path.set_extension("mcdfauth");
    }
    if let Some(parent) = export_path.parent() {
        std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let bytes = serde_json::to_vec_pretty(&auth_package).map_err(|error| error.to_string())?;
    std::fs::write(&export_path, bytes).map_err(|error| error.to_string())?;
    Ok(export_path.to_string_lossy().to_string())
}

#[command]
pub fn import_client_auth_package(path: String) -> Result<ClientAuthExportPackage, String> {
    let import_path = PathBuf::from(path);
    let bytes = std::fs::read(&import_path).map_err(|error| error.to_string())?;
    let package: ClientAuthExportPackage = serde_json::from_slice(&bytes).map_err(|error| format!("client auth package is not valid JSON: {error}"))?;
    if package.package_kind != "mcdf-client-auth" {
        return Err("selected file is not an MCDF client auth package".to_string());
    }
    if package.private_key.trim().is_empty() || package.public_key.trim().is_empty() || package.certificate.trim().is_empty() {
        return Err("client auth package is missing private key, public key, or certificate".to_string());
    }
    Ok(package)
}

#[command]
pub fn fetch_storage_catalog(server_url: String, bearer_token: Option<String>) -> Result<StorageCatalogSummary, String> {
    let client = archive_http_client()?;
    let base = normalize_archive_server_url(&server_url)?;
    let mut request = client.get(format!("{base}/v1/storage/catalog"));
    if let Some(token) = bearer_token.as_deref().filter(|value| !value.trim().is_empty()) {
        request = request.bearer_auth(token);
    }
    let response = request.send().map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_else(|_| "<unreadable response body>".to_string());
        return Err(format!("storage catalog fetch failed: HTTP {status}: {body}"));
    }
    response.json::<StorageCatalogSummary>().map_err(|error| error.to_string())
}

#[command]
pub fn fetch_publisher_identity(server_url: String) -> Result<PublisherIdentityRecord, String> {
    let base = normalize_archive_server_url(&server_url)?;
    let response = archive_get(&base, "/v1/identity/local")?;
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_else(|_| "<unreadable response body>".to_string());
        return Err(format!("publisher identity fetch failed: HTTP {status}: {body}"));
    }
    response.json::<PublisherIdentityRecord>().map_err(|error| error.to_string())
}

#[command]
pub fn register_publisher_identity(
    server_url: String,
    bearer_token: Option<String>,
    display_name: Option<String>,
    label: Option<String>,
    public_key: Option<String>,
    certificate: Option<String>,
) -> Result<PublisherIdentityRecord, String> {
    let base = normalize_archive_server_url(&server_url)?;
    let client = archive_http_client()?;
    let mut request = client.post(format!("{base}/v1/identity/register")).json(&RegisterIdentityRequest {
        display_name,
        label,
        public_key,
        certificate,
    });
    if let Some(token) = bearer_token.as_deref().filter(|value| !value.trim().is_empty()) {
        request = request.bearer_auth(token);
    }
    let response = request.send().map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_else(|_| "<unreadable response body>".to_string());
        return Err(format!("publisher identity registration failed: HTTP {status}: {body}"));
    }
    response.json::<PublisherIdentityRecord>().map_err(|error| error.to_string())
}

fn resolve_public_index_relative_url(index_url: &str, rel_path: &str) -> Result<String, String> {
    let trimmed = index_url.trim();
    if rel_path.starts_with("http://") || rel_path.starts_with("https://") {
        return Ok(rel_path.to_string());
    }
    let base = trimmed
        .rsplit_once('/')
        .map(|(base, _)| base)
        .ok_or_else(|| format!("cannot resolve relative path from index URL: {trimmed}"))?;
    let root = base.trim_end_matches("/indexes");
    Ok(format!("{}/{}", root.trim_end_matches('/'), rel_path.trim_start_matches('/')))
}

fn cache_busted_url(url: &str) -> String {
    let separator = if url.contains('?') { "&" } else { "?" };
    let nonce = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0);
    format!("{url}{separator}mcdf_cache_bust={nonce}")
}

fn fetch_json_no_cache<T: for<'de> Deserialize<'de>>(url: String) -> Result<T, String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|error| error.to_string())?;
    let response = client
        .get(cache_busted_url(&url))
        .header("cache-control", "no-cache")
        .header("pragma", "no-cache")
        .send()
        .map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_else(|_| "<unreadable response body>".to_string());
        return Err(format!("public index fetch failed: HTTP {status}: {body}"));
    }
    response.json::<T>().map_err(|error| error.to_string())
}

#[command]
pub fn fetch_public_package_record(index_url: String, package_manifest_path: String) -> Result<PublicPackageRecord, String> {
    fetch_public_package_by_manifest(&index_url, &package_manifest_path)
}


fn hex_to_bytes(value: &str) -> Result<Vec<u8>, String> {
    let trimmed = value.trim();
    if trimmed.len() % 2 != 0 {
        return Err(format!("hex string has odd length: {}", trimmed.len()));
    }
    let mut out = Vec::with_capacity(trimmed.len() / 2);
    for idx in (0..trimmed.len()).step_by(2) {
        let byte = u8::from_str_radix(&trimmed[idx..idx + 2], 16)
            .map_err(|error| format!("invalid hex at byte {}: {error}", idx / 2))?;
        out.push(byte);
    }
    Ok(out)
}

fn empty_mcdf_metadata() -> MareCharaFileData {
    MareCharaFileData {
        description: String::new(),
        glamourer_data: String::new(),
        customize_plus_data: String::new(),
        manipulation_data: String::new(),
        files: Vec::new(),
        file_swaps: Vec::new(),
    }
}

fn fetch_public_package_by_manifest(index_url: &str, package_manifest_path: &str) -> Result<PublicPackageRecord, String> {
    let url = resolve_public_index_relative_url(index_url, package_manifest_path)?;
    fetch_json_no_cache::<PublicPackageRecord>(url)
}

fn fetch_exchange_file_part(server_base: &str, file: &PublicPackageFileRecord) -> Result<Vec<u8>, String> {
    if let Some(url) = file.direct_blob_url.as_ref().filter(|value| !value.trim().is_empty()) {
        let response = reqwest::blocking::get(url).map_err(|error| error.to_string())?;
        if response.status().is_success() {
            return response.bytes().map(|bytes| bytes.to_vec()).map_err(|error| error.to_string());
        }
    }
    if file.payload_blake3.trim().is_empty() {
        return Err(format!("exchange file #{} has no payload hash", file.index));
    }
    let response = archive_get(server_base, &format!("/v1/files/{}/blob", file.payload_blake3))?;
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_else(|_| "<unreadable response body>".to_string());
        return Err(format!("file part {} download failed: HTTP {status}: {body}", file.payload_blake3));
    }
    response.bytes().map(|bytes| bytes.to_vec()).map_err(|error| error.to_string())
}

#[command]
pub fn download_package_from_exchange_index(
    index_url: String,
    package_manifest_path: String,
    server_url: String,
    output_path: String,
) -> Result<ArchiveDownloadResult, String> {
    let record = fetch_public_package_by_manifest(&index_url, &package_manifest_path)?;
    if record.visibility.as_deref() == Some("locked") || record.visibility.as_deref() == Some("private") {
        return Err("This entry is locked/private. Request access before downloading.".to_string());
    }
    if record.files.is_empty() {
        return Err("Public package record has no file parts to download.".to_string());
    }
    let base = normalize_archive_server_url(&server_url)?;
    let mut files = record.files.clone();
    files.sort_by_key(|file| file.index);
    let mut file_bytes: Vec<Vec<u8>> = Vec::with_capacity(files.len());
    for file in &files {
        let bytes = fetch_exchange_file_part(&base, file)?;
        if bytes.len() as u32 != file.length {
            return Err(format!(
                "file part {} size mismatch: expected {}, got {}",
                file.payload_blake3,
                file.length,
                bytes.len()
            ));
        }
        let actual_hash = blake3::hash(&bytes).to_hex().to_string();
        if !file.payload_blake3.is_empty() && actual_hash != file.payload_blake3 {
            return Err(format!(
                "file part hash mismatch: expected {}, got {}",
                file.payload_blake3,
                actual_hash
            ));
        }
        let cache_path = local_cache::blob_path(&actual_hash)?;
        if !cache_path.exists() {
            fs::write(&cache_path, &bytes).map_err(|error| error.to_string())?;
        }
        file_bytes.push(bytes);
    }

    let rebuilt = if record.rebuild_strategy == "opaque_original_package" {
        if file_bytes.len() != 1 {
            return Err(format!("opaque package expected one archived package blob, found {}", file_bytes.len()));
        }
        file_bytes.remove(0)
    } else if let Some(exact) = &record.exact_rebuild {
        let prefix = hex_to_bytes(&exact.prefix_hex)?;
        let header = hex_to_bytes(&exact.header_hex)?;
        let trailer = hex_to_bytes(&exact.trailer_hex)?;
        let synthetic = ParsedMCDFPackage {
            metadata: empty_mcdf_metadata(),
            decoded_container_blake3: String::new(),
            files: Vec::new(),
            decoded_bytes: Vec::new(),
            prefix_bytes: prefix,
            header_bytes: header,
            trailer_bytes: trailer,
            mcdf_offset: exact.mcdf_offset,
            version: exact.version,
            json_len: exact.json_len,
            payload_start: exact.payload_start,
            payload_end: exact.payload_end,
            container_encoding: if exact.container_encoding.is_empty() { "raw_mcdf".to_string() } else { exact.container_encoding.clone() },
        };
        let slices: Vec<&[u8]> = file_bytes.iter().map(Vec::as_slice).collect();
        let mut rebuilt = Vec::new();
        synthetic.rebuild_exact(&mut rebuilt, &slices)
            .map_err(|error| format!("failed to rebuild MCDF from exchange file parts: {error}"))?;
        rebuilt
    } else {
        return Err("This Exchange entry does not include exact rebuild metadata yet. Re-publish it with the current server so direct file-part rebuilds are available.".to_string());
    };

    let actual_package_hash = blake3::hash(&rebuilt).to_hex().to_string();
    let package_hash_verified = actual_package_hash == record.package_hash_blake3;
    if !package_hash_verified && record.rebuild_strategy == "opaque_original_package" {
        return Err(format!(
            "archived package hash mismatch: expected {}, got {}. The full original package archive does not match the public Exchange record.",
            record.package_hash_blake3,
            actual_package_hash
        ));
    }
    let download_note = if package_hash_verified {
        Some("Downloaded package matches the original published MCDF hash.".to_string())
    } else {
        Some(format!(
            "Exchange rebuilt this MCDF from verified component files. The rebuilt container hash is {}, while the original package hash is {}. This is expected for component-based Exchange rebuilds: the internal game files are preserved, but the outer MCDF container may not be byte-for-byte identical.",
            actual_package_hash,
            record.package_hash_blake3
        ))
    };
    if let Some(parent) = Path::new(&output_path).parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::write(&output_path, &rebuilt).map_err(|error| error.to_string())?;
    Ok(ArchiveDownloadResult {
        output_path,
        bytes_written: rebuilt.len() as u64,
        package_hash_blake3: record.package_hash_blake3,
        rebuilt_package_hash_blake3: Some(actual_package_hash),
        package_hash_verified,
        download_note,
    })
}

#[command]
pub fn download_package_from_archive(
    server_url: String,
    package_hash: String,
    output_path: String,
) -> Result<ArchiveDownloadResult, String> {
    let base = normalize_archive_server_url(&server_url)?;
    let response = archive_get(&base, &format!("/v1/packages/{package_hash}/download"))?;
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_else(|_| "<unreadable response body>".to_string());
        return Err(format!("archive download failed: HTTP {status}: {body}"));
    }
    let bytes = response.bytes().map_err(|error| error.to_string())?;
    std::fs::write(&output_path, &bytes).map_err(|error| error.to_string())?;
    Ok(ArchiveDownloadResult {
        output_path,
        bytes_written: bytes.len() as u64,
        package_hash_blake3: package_hash,
        rebuilt_package_hash_blake3: None,
        package_hash_verified: true,
        download_note: Some("Downloaded package matches the requested archive package hash.".to_string()),
    })
}


#[command]
pub fn fetch_public_index_diagnostics(server_url: String) -> Result<PublicIndexDiagnosticsResponse, String> {
    let base = normalize_archive_server_url(&server_url)?;
    let response = archive_get(&base, "/v1/public-index/diagnostics")?;
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_else(|_| "<unreadable response body>".to_string());
        return Err(format!("public index diagnostics fetch failed: HTTP {status}: {body}"));
    }
    response.json::<PublicIndexDiagnosticsResponse>().map_err(|error| error.to_string())
}

#[command]
pub fn fetch_public_marketplace_index(index_url: String) -> Result<PublicIndexLatest, String> {
    fetch_json_no_cache::<PublicIndexLatest>(index_url.trim().to_string())
}

#[command]
pub fn fetch_public_index_status(server_url: String) -> Result<PublicIndexStatusResponse, String> {
    let base = normalize_archive_server_url(&server_url)?;
    let response = archive_get(&base, "/v1/public-index/status")?;
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_else(|_| "<unreadable response body>".to_string());
        return Err(format!("public index status fetch failed: HTTP {status}: {body}"));
    }
    response.json::<PublicIndexStatusResponse>().map_err(|error| error.to_string())
}

#[command]
pub fn export_public_index(server_url: String, bearer_token: Option<String>) -> Result<PublicIndexExportResponse, String> {
    let client = archive_http_client()?;
    let base = normalize_archive_server_url(&server_url)?;
    let mut request = client.post(format!("{base}/v1/admin/public-index/export"));
    if let Some(token) = bearer_token.as_deref().filter(|value| !value.trim().is_empty()) {
        request = request.bearer_auth(token);
    }
    let response = request.send().map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_else(|_| "<unreadable response body>".to_string());
        return Err(format!("public index export failed: HTTP {status}: {body}"));
    }
    response.json::<PublicIndexExportResponse>().map_err(|error| error.to_string())
}


#[command]
pub fn fetch_access_requests(server_url: String, bearer_token: Option<String>) -> Result<AccessRequestListResponse, String> {
    let base = normalize_archive_server_url(&server_url)?;
    let client = archive_http_client()?;
    let mut request = client.get(format!("{base}/v1/access-requests"));
    if let Some(token) = bearer_token.filter(|value| !value.trim().is_empty()) {
        request = request.bearer_auth(token);
    }
    let response = request.send().map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_else(|_| "<unreadable response body>".to_string());
        return Err(format!("access request fetch failed: HTTP {status}: {body}"));
    }
    response.json::<AccessRequestListResponse>().map_err(|error| error.to_string())
}

#[command]
pub fn review_access_request(server_url: String, bearer_token: Option<String>, request_id: String, status: String, decision_note: Option<String>) -> Result<AccessRequestRecord, String> {
    let base = normalize_archive_server_url(&server_url)?;
    let client = archive_http_client()?;
    let payload = serde_json::json!({ "status": status, "decision_note": decision_note });
    let mut request = client.post(format!("{base}/v1/access-requests/{}/review", request_id)).json(&payload);
    if let Some(token) = bearer_token.filter(|value| !value.trim().is_empty()) {
        request = request.bearer_auth(token);
    }
    let response = request.send().map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_else(|_| "<unreadable response body>".to_string());
        return Err(format!("access request review failed: HTTP {status}: {body}"));
    }
    response.json::<AccessRequestRecord>().map_err(|error| error.to_string())
}


#[command]
pub fn fetch_exchange_reports(server_url: String, bearer_token: Option<String>) -> Result<serde_json::Value, String> {
    let base = normalize_archive_server_url(&server_url)?;
    let client = archive_http_client()?;
    let mut request = client.get(format!("{base}/v1/reports"));
    if let Some(token) = bearer_token.filter(|value| !value.trim().is_empty()) {
        request = request.bearer_auth(token);
    }
    let response = request.send().map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_else(|_| "<unreadable response body>".to_string());
        return Err(format!("report fetch failed: HTTP {status}: {body}"));
    }
    response.json::<serde_json::Value>().map_err(|error| error.to_string())
}

#[command]
pub fn report_exchange_entry(server_url: String, bearer_token: Option<String>, package_hash_blake3: String, reporter_display_name: Option<String>, reason: String, note: Option<String>) -> Result<serde_json::Value, String> {
    let base = normalize_archive_server_url(&server_url)?;
    let client = archive_http_client()?;
    let payload = serde_json::json!({
        "package_hash_blake3": package_hash_blake3,
        "reporter_display_name": reporter_display_name,
        "reason": reason,
        "note": note,
    });
    let mut request = client.post(format!("{base}/v1/reports")).json(&payload);
    if let Some(token) = bearer_token.filter(|value| !value.trim().is_empty()) {
        request = request.bearer_auth(token);
    }
    let response = request.send().map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_else(|_| "<unreadable response body>".to_string());
        return Err(format!("report submit failed: HTTP {status}: {body}"));
    }
    response.json::<serde_json::Value>().map_err(|error| error.to_string())
}

#[command]
pub fn review_exchange_report(server_url: String, bearer_token: Option<String>, report_id: String, status: String, decision_note: Option<String>) -> Result<serde_json::Value, String> {
    let base = normalize_archive_server_url(&server_url)?;
    let client = reqwest::blocking::Client::new();
    let mut request = client.post(format!("{}/v1/reports/{}/review", base, report_id)).json(&serde_json::json!({
        "status": status,
        "decision_note": decision_note,
    }));
    if let Some(token) = bearer_token.as_ref().filter(|value| !value.trim().is_empty()) {
        request = request.bearer_auth(token.trim());
    }
    let response = request.send().map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_else(|_| "<unreadable response body>".to_string());
        return Err(format!("report review failed: HTTP {status}: {body}"));
    }
    response.json::<serde_json::Value>().map_err(|error| error.to_string())
}


#[command]
pub fn fetch_server_user_permissions(server_url: String, bearer_token: Option<String>) -> Result<serde_json::Value, String> {
    let base = normalize_archive_server_url(&server_url)?;
    let client = archive_http_client()?;
    let mut request = client.get(format!("{base}/v1/admin/users"));
    if let Some(token) = bearer_token.filter(|value| !value.trim().is_empty()) {
        request = request.bearer_auth(token);
    }
    let response = request.send().map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_else(|_| "<unreadable response body>".to_string());
        return Err(format!("user permission fetch failed: HTTP {status}: {body}"));
    }
    response.json::<serde_json::Value>().map_err(|error| error.to_string())
}

#[command]
pub fn update_server_user_upload_permission(server_url: String, bearer_token: Option<String>, publisher_id: String, can_upload: bool) -> Result<serde_json::Value, String> {
    update_server_user_permissions(server_url, bearer_token, publisher_id, None, Some(can_upload), None, None, None, Some(if can_upload { "Upload permission granted from client admin settings".to_string() } else { "Upload permission revoked from client admin settings".to_string() }))
}

#[command]
pub fn update_server_user_permissions(
    server_url: String,
    bearer_token: Option<String>,
    publisher_id: String,
    can_connect: Option<bool>,
    can_upload: Option<bool>,
    is_admin: Option<bool>,
    certificate_revoked: Option<bool>,
    status: Option<String>,
    note: Option<String>,
) -> Result<serde_json::Value, String> {
    let base = normalize_archive_server_url(&server_url)?;
    let client = archive_http_client()?;
    let mut body = serde_json::Map::new();
    if let Some(value) = can_connect { body.insert("can_connect".to_string(), serde_json::json!(value)); }
    if let Some(value) = can_upload { body.insert("can_upload".to_string(), serde_json::json!(value)); }
    if let Some(value) = is_admin { body.insert("is_admin".to_string(), serde_json::json!(value)); }
    if let Some(value) = certificate_revoked { body.insert("certificate_revoked".to_string(), serde_json::json!(value)); }
    if let Some(value) = status.filter(|value| !value.trim().is_empty()) { body.insert("status".to_string(), serde_json::json!(value)); }
    if let Some(value) = note.filter(|value| !value.trim().is_empty()) { body.insert("note".to_string(), serde_json::json!(value)); }
    let mut request = client.post(format!("{base}/v1/admin/users/{}/permissions", publisher_id)).json(&serde_json::Value::Object(body));
    if let Some(token) = bearer_token.filter(|value| !value.trim().is_empty()) {
        request = request.bearer_auth(token);
    }
    let response = request.send().map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_else(|_| "<unreadable response body>".to_string());
        return Err(format!("user permission update failed: HTTP {status}: {body}"));
    }
    response.json::<serde_json::Value>().map_err(|error| error.to_string())
}

#[command]
pub fn fetch_admin_server_settings(server_url: String, bearer_token: Option<String>) -> Result<serde_json::Value, String> {
    let base = normalize_archive_server_url(&server_url)?;
    let client = archive_http_client()?;
    let mut request = client.get(format!("{base}/v1/admin/server-settings"));
    if let Some(token) = bearer_token.filter(|value| !value.trim().is_empty()) { request = request.bearer_auth(token); }
    let response = request.send().map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_else(|_| "<unreadable response body>".to_string());
        return Err(format!("server settings fetch failed: HTTP {status}: {body}"));
    }
    response.json::<serde_json::Value>().map_err(|error| error.to_string())
}

#[command]
pub fn update_admin_server_settings(
    server_url: String,
    bearer_token: Option<String>,
    upload_mode: Option<String>,
    require_upload_token: Option<bool>,
    public_index_enabled: Option<bool>,
    public_index_include_private: Option<bool>,
) -> Result<serde_json::Value, String> {
    let base = normalize_archive_server_url(&server_url)?;
    let client = archive_http_client()?;
    let mut request = client.post(format!("{base}/v1/admin/server-settings")).json(&serde_json::json!({
        "upload_mode": upload_mode,
        "require_upload_token": require_upload_token,
        "public_index_enabled": public_index_enabled,
        "public_index_include_private": public_index_include_private,
    }));
    if let Some(token) = bearer_token.filter(|value| !value.trim().is_empty()) { request = request.bearer_auth(token); }
    let response = request.send().map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_else(|_| "<unreadable response body>".to_string());
        return Err(format!("server settings update failed: HTTP {status}: {body}"));
    }
    response.json::<serde_json::Value>().map_err(|error| error.to_string())
}

#[command]
pub fn generate_admin_token(server_url: String, bearer_token: Option<String>, label: Option<String>) -> Result<serde_json::Value, String> {
    let base = normalize_archive_server_url(&server_url)?;
    let client = archive_http_client()?;
    let mut request = client.post(format!("{base}/v1/admin/tokens/generate")).json(&serde_json::json!({
        "label": label,
    }));
    if let Some(token) = bearer_token.filter(|value| !value.trim().is_empty()) {
        request = request.bearer_auth(token);
    }
    let response = request.send().map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_else(|_| "<unreadable response body>".to_string());
        return Err(format!("admin token generation failed: HTTP {status}: {body}"));
    }
    response.json::<serde_json::Value>().map_err(|error| error.to_string())
}


#[command]
pub fn fetch_moderation_blocklist(server_url: String, bearer_token: Option<String>) -> Result<serde_json::Value, String> {
    let base = normalize_archive_server_url(&server_url)?;
    let client = archive_http_client()?;
    let mut request = client.get(format!("{base}/v1/admin/moderation/blocklist"));
    if let Some(token) = bearer_token.filter(|value| !value.trim().is_empty()) {
        request = request.bearer_auth(token);
    }
    let response = request.send().map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_else(|_| "<unreadable response body>".to_string());
        return Err(format!("moderation blocklist fetch failed: HTTP {status}: {body}"));
    }
    response.json::<serde_json::Value>().map_err(|error| error.to_string())
}

#[command]
pub fn add_moderation_block(server_url: String, bearer_token: Option<String>, target_type: String, hash_blake3: String, reason: Option<String>, category: Option<String>, source_package_hash: Option<String>) -> Result<serde_json::Value, String> {
    let base = normalize_archive_server_url(&server_url)?;
    let client = archive_http_client()?;
    let payload = serde_json::json!({
        "target_type": target_type,
        "hash_blake3": hash_blake3,
        "reason": reason,
        "category": category,
        "source_package_hash": source_package_hash,
    });
    let mut request = client.post(format!("{base}/v1/admin/moderation/blocklist")).json(&payload);
    if let Some(token) = bearer_token.filter(|value| !value.trim().is_empty()) {
        request = request.bearer_auth(token);
    }
    let response = request.send().map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_else(|_| "<unreadable response body>".to_string());
        return Err(format!("moderation block failed: HTTP {status}: {body}"));
    }
    response.json::<serde_json::Value>().map_err(|error| error.to_string())
}


#[command]
pub fn edit_exchange_entry(
    server_url: String,
    bearer_token: Option<String>,
    package_hash_blake3: String,
    title: Option<String>,
    description: Option<String>,
    tags: Option<Vec<String>>,
    is_adult: Option<bool>,
    visibility: Option<String>,
    preview_image_path: Option<String>,
    preview_crop: Option<PreviewCropData>,
    publisher_id: Option<String>,
    publisher_display_name: Option<String>,
    publisher_public_key: Option<String>,
    publisher_certificate: Option<String>,
) -> Result<serde_json::Value, String> {
    let base = normalize_archive_server_url(&server_url)?;
    let client = archive_http_client()?;
    let preview_image = preview_image_path
        .as_deref()
        .filter(|path| !path.trim().is_empty())
        .map(|path| {
            let path_buf = PathBuf::from(path);
            let bytes = std::fs::read(&path_buf)
                .map_err(|error| format!("Preview image could not be read from {path}: {error}"))?;
            if bytes.len() > 5 * 1024 * 1024 {
                return Err("Preview image is too large; keep MCDF Manager previews below 5 MiB.".to_string());
            }
            let filename = path_buf
                .file_name()
                .and_then(|value| value.to_str())
                .unwrap_or("preview.png")
                .to_string();
            let extension = filename.rsplit('.').next().unwrap_or("png").to_ascii_lowercase();
            let media_type = match extension.as_str() {
                "jpg" | "jpeg" => "image/jpeg",
                "webp" => "image/webp",
                "gif" => "image/gif",
                _ => "image/png",
            }
            .to_string();
            Ok(PackagePreviewImage { filename, media_type, bytes_hex: bytes_to_hex(&bytes) })
        })
        .transpose()?;
    let payload = serde_json::json!({
        "title": title,
        "description": description,
        "tags": tags,
        "is_adult": is_adult,
        "visibility": visibility,
        "preview_image": preview_image,
        "preview_crop": preview_crop,
        "reason": "Edited from MCDF Manager",
    });
    let mut request = client.post(format!("{base}/v1/packages/{}/metadata", package_hash_blake3)).json(&payload);
    if let Some(token) = bearer_token.as_deref().filter(|value| !value.trim().is_empty()) {
        request = request.bearer_auth(token.trim());
    }
    request = add_publisher_identity_headers(
        request,
        publisher_id.as_deref(),
        publisher_display_name.as_deref(),
        publisher_public_key.as_deref(),
        publisher_certificate.as_deref(),
    );
    let response = request.send().map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_else(|_| "<unreadable response body>".to_string());
        return Err(format!("owner edit failed: HTTP {status}: {body}"));
    }
    response.json::<serde_json::Value>().map_err(|error| error.to_string())
}

#[command]
pub fn delete_exchange_entry(
    server_url: String,
    bearer_token: Option<String>,
    package_hash_blake3: String,
    reason: Option<String>,
    publisher_id: Option<String>,
    publisher_display_name: Option<String>,
    publisher_public_key: Option<String>,
    publisher_certificate: Option<String>,
) -> Result<serde_json::Value, String> {
    let base = normalize_archive_server_url(&server_url)?;
    let client = archive_http_client()?;
    let payload = serde_json::json!({ "reason": reason });
    let mut request = client.post(format!("{base}/v1/packages/{}/remove", package_hash_blake3)).json(&payload);
    if let Some(token) = bearer_token.as_deref().filter(|value| !value.trim().is_empty()) {
        request = request.bearer_auth(token.trim());
    }
    request = add_publisher_identity_headers(
        request,
        publisher_id.as_deref(),
        publisher_display_name.as_deref(),
        publisher_public_key.as_deref(),
        publisher_certificate.as_deref(),
    );
    let response = request.send().map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_else(|_| "<unreadable response body>".to_string());
        return Err(format!("owner delete failed: HTTP {status}: {body}"));
    }
    response.json::<serde_json::Value>().map_err(|error| error.to_string())
}

#[command]
pub fn admin_remove_exchange_entry(server_url: String, bearer_token: Option<String>, package_hash_blake3: String, reason: Option<String>) -> Result<serde_json::Value, String> {
    let base = normalize_archive_server_url(&server_url)?;
    let client = archive_http_client()?;
    let payload = serde_json::json!({ "reason": reason });
    let mut request = client.post(format!("{base}/v1/admin/packages/{}/remove", package_hash_blake3)).json(&payload);
    if let Some(token) = bearer_token.filter(|value| !value.trim().is_empty()) {
        request = request.bearer_auth(token);
    }
    let response = request.send().map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_else(|_| "<unreadable response body>".to_string());
        return Err(format!("admin remove failed: HTTP {status}: {body}"));
    }
    response.json::<serde_json::Value>().map_err(|error| error.to_string())
}

#[command]
pub fn transfer_exchange_entry_owner(
    server_url: String,
    bearer_token: Option<String>,
    package_hash_blake3: String,
    new_owner_public_id: String,
    new_owner_display_name: Option<String>,
    reason: Option<String>,
) -> Result<serde_json::Value, String> {
    let base = normalize_archive_server_url(&server_url)?;
    let client = archive_http_client()?;
    let payload = serde_json::json!({
        "new_owner_public_id": new_owner_public_id,
        "new_owner_display_name": new_owner_display_name,
        "reason": reason,
    });
    let mut request = client.post(format!("{base}/v1/admin/packages/{}/owner", package_hash_blake3)).json(&payload);
    if let Some(token) = bearer_token.filter(|value| !value.trim().is_empty()) {
        request = request.bearer_auth(token);
    }
    let response = request.send().map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_else(|_| "<unreadable response body>".to_string());
        return Err(format!("owner transfer failed: HTTP {status}: {body}"));
    }
    response.json::<serde_json::Value>().map_err(|error| error.to_string())
}

#[command]
pub fn request_locked_mcdf_access(server_url: String, bearer_token: Option<String>, package_hash_blake3: String, requester_display_name: Option<String>, note: Option<String>) -> Result<AccessRequestRecord, String> {
    let base = normalize_archive_server_url(&server_url)?;
    let client = archive_http_client()?;
    let payload = serde_json::json!({
        "package_hash_blake3": package_hash_blake3,
        "requester_display_name": requester_display_name,
        "note": note,
    });
    let mut request = client.post(format!("{base}/v1/access-requests")).json(&payload);
    if let Some(token) = bearer_token.filter(|value| !value.trim().is_empty()) {
        request = request.bearer_auth(token);
    }
    let response = request.send().map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_else(|_| "<unreadable response body>".to_string());
        return Err(format!("access request submit failed: HTTP {status}: {body}"));
    }
    response.json::<AccessRequestRecord>().map_err(|error| error.to_string())
}

fn wait_for_archive_job(
    client: &reqwest::blocking::Client,
    base: &str,
    status_url: &str,
    bearer_token: Option<&str>,
) -> Result<CentralUploadResponse, String> {
    let normalized_status_url = registry_url_from_returned_value(base, Some(status_url), status_url)?;
    for _ in 0..720 {
        let mut request = client.get(&normalized_status_url);
        if let Some(token) = bearer_token.filter(|value| !value.trim().is_empty()) {
            request = request.bearer_auth(token);
        }
        let response = request.send().map_err(|error| error.to_string())?;
        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().unwrap_or_else(|_| "<unreadable response body>".to_string());
            return Err(format!("archive job status failed: HTTP {status}: {body}"));
        }
        let job = response.json::<JobStatusResponse>().map_err(|error| error.to_string())?;
        match job.state.as_str() {
            "done" => {
                let Some(result) = job.result else {
                    return Err("archive job completed without a result payload".to_string());
                };
                return serde_json::from_value::<CentralUploadResponse>(result)
                    .map_err(|error| format!("archive job result decode failed: {error}"));
            }
            "failed" => {
                return Err(job.error.unwrap_or_else(|| job.message));
            }
            _ => std::thread::sleep(std::time::Duration::from_secs(1)),
        }
    }
    Err("archive job timed out while waiting for server-side publishing to finish".to_string())
}

#[command]
pub fn upload_mcdf_to_central_server(
    path: String,
    server_url: String,
    bearer_token: Option<String>,
    title: Option<String>,
    description: Option<String>,
    tags: Option<Vec<String>>,
    preview_image_path: Option<String>,
    preview_crop: Option<PreviewCropData>,
    is_adult: Option<bool>,
    visibility: Option<String>,
    publisher_id: Option<String>,
    publisher_display_name: Option<String>,
    publisher_public_key: Option<String>,
    publisher_certificate: Option<String>,
) -> Result<CentralUploadResponse, String> {
    let path_buf = PathBuf::from(&path);
    let original_bytes = std::fs::read(&path_buf).map_err(|error| error.to_string())?;
    let filename = path_buf
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("upload.mcdf")
        .to_string();
    let mut marketplace = build_marketplace_metadata(title, description, tags.unwrap_or_default(), preview_image_path, preview_crop, is_adult.unwrap_or(false))?;
    marketplace.visibility = visibility
        .map(|value| value.trim().to_ascii_lowercase())
        .filter(|value| matches!(value.as_str(), "public" | "locked" | "private"));

    match MCDFParser::parse_package_from_slice(&original_bytes) {
        Ok(package) => upload_extracted_parts_to_central_server(
            &server_url,
            bearer_token.as_deref(),
            publisher_id.as_deref(),
            publisher_display_name.as_deref(),
            publisher_public_key.as_deref(),
            publisher_certificate.as_deref(),
            filename,
            &original_bytes,
            package,
            marketplace,
        ),
        Err(parse_error) => {
            // Compatibility fallback: unsupported MCDF variants still upload as opaque package
            // so the user can continue testing while parser support is improved.
            let mut response = upload_full_mcdf_to_central_server(
                &server_url,
                bearer_token.as_deref(),
                publisher_id.as_deref(),
                publisher_display_name.as_deref(),
                publisher_public_key.as_deref(),
                publisher_certificate.as_deref(),
                filename,
                original_bytes,
                marketplace,
            )?;
            response.notes.insert(0, format!(
                "Client-side extraction failed ({parse_error}); uploaded the full MCDF through the compatibility path."
            ));
            Ok(response)
        }
    }
}

fn build_marketplace_metadata(
    title: Option<String>,
    description: Option<String>,
    tags: Vec<String>,
    preview_image_path: Option<String>,
    preview_crop: Option<PreviewCropData>,
    is_adult: bool,
) -> Result<PackageMarketplaceMetadata, String> {
    let cleaned_tags = tags
        .into_iter()
        .flat_map(|tag| tag.split(',').map(str::to_string).collect::<Vec<_>>())
        .map(|tag| tag.trim().trim_start_matches('#').to_ascii_lowercase())
        .filter(|tag| !tag.is_empty())
        .take(32)
        .collect::<Vec<_>>();
    let preview_image = match preview_image_path.filter(|path| !path.trim().is_empty()) {
        Some(path) => {
            let path_buf = PathBuf::from(&path);
            let bytes = std::fs::read(&path_buf).map_err(|error| format!("Preview image could not be read from {path}: {error}"))?;
            if bytes.len() > 5 * 1024 * 1024 {
                return Err("Preview image is too large; keep MCDF Manager previews below 5 MiB.".to_string());
            }
            let filename = path_buf.file_name().and_then(|value| value.to_str()).unwrap_or("preview.png").to_string();
            let extension = filename.rsplit('.').next().unwrap_or("png").to_ascii_lowercase();
            let media_type = match extension.as_str() {
                "jpg" | "jpeg" => "image/jpeg",
                "webp" => "image/webp",
                "gif" => "image/gif",
                _ => "image/png",
            }.to_string();
            Some(PackagePreviewImage { filename, media_type, bytes_hex: bytes_to_hex(&bytes) })
        }
        None => None,
    };
    Ok(PackageMarketplaceMetadata {
        title: title.and_then(|value| { let value = value.trim().to_string(); (!value.is_empty()).then_some(value) }),
        description: description.and_then(|value| { let value = value.trim().to_string(); (!value.is_empty()).then_some(value) }),
        tags: cleaned_tags,
        preview_image,
        preview_crop,
        is_adult,
        visibility: None,
    })
}

fn describe_http_send_error(context: &str, error: reqwest::Error) -> String {
    let mut details = vec![format!("{context} could not be completed.")];

    if error.is_builder() {
        details.push("The HTTP request could not be built before it was sent. This usually means one of the generated headers, URLs, or preview/metadata fields is invalid or too large.".to_string());
    } else if error.is_timeout() {
        details.push("The request timed out while contacting the registry server.".to_string());
    } else if error.is_connect() {
        details.push("MCDF Manager could not connect to the registry server.".to_string());
    } else if error.is_body() {
        details.push("The request body could not be streamed to the registry server.".to_string());
    } else if error.is_decode() {
        details.push("The registry server response could not be decoded.".to_string());
    } else if error.is_request() {
        details.push("The request was rejected by the local HTTP client before a usable server response was available.".to_string());
    }

    details.push(format!("Technical error: {error}"));
    details.join("\n")
}

fn header_value_is_safe(value: &str) -> bool {
    value
        .bytes()
        .all(|byte| byte == b'\t' || (0x20..=0x7e).contains(&byte))
        && !value.contains('\n')
        && !value.contains('\r')
}

fn add_publisher_identity_headers(
    mut request: reqwest::blocking::RequestBuilder,
    publisher_id: Option<&str>,
    publisher_display_name: Option<&str>,
    publisher_public_key: Option<&str>,
    publisher_certificate: Option<&str>,
) -> reqwest::blocking::RequestBuilder {
    if let Some(value) = publisher_id.map(str::trim).filter(|value| !value.is_empty()) {
        request = request.header("x-mcdf-publisher-id", value);
    }
    if let Some(value) = publisher_display_name.map(str::trim).filter(|value| !value.is_empty()) {
        request = request.header("x-mcdf-publisher-display", value);
    }
    if let Some(value) = publisher_public_key.map(str::trim).filter(|value| !value.is_empty()) {
        request = request.header("x-mcdf-publisher-public-key", value);
    }
    if let Some(value) = publisher_certificate.map(str::trim).filter(|value| !value.is_empty()) {
        // PEM certificates contain newlines. Raw newlines are illegal in HTTP
        // header values and make reqwest fail locally with a vague
        // `builder error` before the request reaches the registry. Keep a
        // legacy plain header for already one-line values, and send multiline
        // certificates through a header-safe hex variant that newer registry
        // servers understand.
        if value.contains('\n') || value.contains('\r') {
            request = request.header("x-mcdf-publisher-certificate-hex", bytes_to_hex(value.as_bytes()));
        } else {
            request = request.header("x-mcdf-publisher-certificate", value);
        }
    }
    request
}

fn upload_extracted_parts_to_central_server(
    server_url: &str,
    bearer_token: Option<&str>,
    publisher_id: Option<&str>,
    publisher_display_name: Option<&str>,
    publisher_public_key: Option<&str>,
    publisher_certificate: Option<&str>,
    filename: String,
    original_bytes: &[u8],
    package: ParsedMCDFPackage,
    marketplace: PackageMarketplaceMetadata,
) -> Result<CentralUploadResponse, String> {
    let base = normalize_archive_server_url(server_url)?;
    let client = archive_http_client()?;
    let package_hash = blake3::hash(original_bytes).to_hex().to_string();
    let package_size = original_bytes.len() as u64;

    let inventory = inventory_from_extracted_files(package.files.clone());

    let mut probe_request = add_publisher_identity_headers(
        client
            .post(format!("{base}/v1/files/probe"))
            .json(&FileProbeRequest { files: inventory.clone() }),
        publisher_id,
        publisher_display_name,
        publisher_public_key,
        publisher_certificate,
    );
    if let Some(token) = bearer_token.filter(|value| !value.trim().is_empty()) {
        probe_request = probe_request.bearer_auth(token);
    }
    let probe_response = probe_request
        .send()
        .map_err(|error| describe_http_send_error("Registry file probe", error))?;
    if !probe_response.status().is_success() {
        let status = probe_response.status();
        let body = probe_response.text().unwrap_or_else(|_| "<unreadable response body>".to_string());
        return Err(format!("central server file probe failed: HTTP {status}: {body}"));
    }
    let probe = probe_response.json::<FileProbeResponse>().map_err(|error| error.to_string())?;

    for missing in &probe.missing_files {
        let payload_slice = package
            .file_payload_slice_by_blake3(&missing.payload_blake3)
            .map_err(|error| format!("server requested unknown missing file {}: {error}", missing.payload_blake3))?;
        let upload_path = format!("/v1/files/{}/upload", missing.payload_blake3);
        // Use the configured registry origin for file uploads. Older registry
        // builds returned absolute upload URLs based on their bind address,
        // which leaked http://127.0.0.1:48443 to remote clients. Missing-file
        // uploads are always handled by this registry API path, so the client
        // builds the URL from the configured server instead of trusting the
        // returned absolute value.
        let upload_url = format!("{}{}", base.trim_end_matches('/'), upload_path);
        let mut upload_request = add_publisher_identity_headers(
            client
                .post(&upload_url)
                .header("content-type", "application/octet-stream")
                .body(payload_slice.to_vec()),
            publisher_id,
            publisher_display_name,
            publisher_public_key,
            publisher_certificate,
        );
        if let Some(token) = bearer_token.filter(|value| !value.trim().is_empty()) {
            upload_request = upload_request.bearer_auth(token);
        }
        let upload_response = upload_request
            .send()
            .map_err(|error| describe_http_send_error("Registry missing-file upload", error))?;
        if !upload_response.status().is_success() {
            let status = upload_response.status();
            let body = upload_response.text().unwrap_or_else(|_| "<unreadable response body>".to_string());
            return Err(format!("central server file upload failed for {}: HTTP {status}: {body}", missing.payload_blake3));
        }
    }

    let register = RegisterExtractedPackageRequest {
        package_hash_blake3: package_hash,
        package_size,
        original_filename: filename,
        description: marketplace.description.clone().unwrap_or_else(|| package.metadata.description.clone()),
        marketplace,
        metadata: package.metadata.clone(),
        files: inventory,
        exact_rebuild: ExactRebuildDataForServer {
            mcdf_offset: package.mcdf_offset,
            version: package.version,
            json_len: package.json_len,
            payload_start: package.payload_start,
            payload_end: package.payload_end,
            prefix_hex: bytes_to_hex(&package.prefix_bytes),
            header_hex: bytes_to_hex(&package.header_bytes),
            trailer_hex: bytes_to_hex(&package.trailer_bytes),
            container_encoding: package.container_encoding.clone(),
        },
        decoded_uploaded_blake3: package.decoded_container_blake3.clone(),
        container_encoding: package.container_encoding.clone(),
    };

    let mut register_request = add_publisher_identity_headers(
        client
            .post(format!("{base}/v1/packages/register-extracted-async"))
            .json(&register),
        publisher_id,
        publisher_display_name,
        publisher_public_key,
        publisher_certificate,
    );
    if let Some(token) = bearer_token.filter(|value| !value.trim().is_empty()) {
        register_request = register_request.bearer_auth(token);
    }
    let response = register_request
        .send()
        .map_err(|error| describe_http_send_error("Registry package registration", error))?;
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_else(|_| "<unreadable response body>".to_string());
        return Err(format!("central server extracted package registration failed: HTTP {status}: {body}"));
    }
    let job = response.json::<JobCreateResponse>().map_err(|error| error.to_string())?;
    let mut result = wait_for_archive_job(&client, &base, &job.status_url, bearer_token)?;
    result.notes.insert(0, format!(
        "Client mapped {} internal files in memory, skipped {} known files, uploaded only {} missing file slices, then waited for server-side publishing job {}.",
        package.files.len(),
        probe.known_files.len(),
        probe.missing_files.len(),
        job.job_id
    ));
    Ok(result)
}

fn upload_full_mcdf_to_central_server(
    server_url: &str,
    bearer_token: Option<&str>,
    publisher_id: Option<&str>,
    publisher_display_name: Option<&str>,
    publisher_public_key: Option<&str>,
    publisher_certificate: Option<&str>,
    filename: String,
    bytes: Vec<u8>,
    marketplace: PackageMarketplaceMetadata,
) -> Result<CentralUploadResponse, String> {
    let client = archive_http_client()?;
    let base = normalize_archive_server_url(server_url)?;

    // The compatibility upload path sends metadata through an HTTP header because the
    // request body is the raw MCDF package. Preview images are represented as hex bytes
    // inside the metadata object, which can make that header too large for reqwest/HTTP
    // and surface as an unhelpful "builder error". Keep the opaque-package fallback
    // publishable by omitting preview bytes from the header. Parsed MCDF uploads still
    // send preview metadata in the JSON register request.
    let mut header_marketplace = marketplace.clone();
    let omitted_preview_from_header = header_marketplace.preview_image.is_some();
    header_marketplace.preview_image = None;
    let metadata_header = serde_json::to_string(&header_marketplace)
        .map_err(|error| format!("Preview/marketplace metadata could not be prepared: {error}"))?;

    let mut builder = client
        .post(format!("{base}/v1/packages/upload-async"))
        .header("content-type", "application/octet-stream")
        .header("x-mcdf-filename", filename);

    if header_value_is_safe(&metadata_header) && metadata_header.len() <= 6 * 1024 {
        builder = builder
            .header("x-mcdf-marketplace-metadata", metadata_header.clone())
            .header("x-mcdf-manager-metadata", metadata_header);
    } else {
        let metadata_hex = bytes_to_hex(metadata_header.as_bytes());
        builder = builder
            .header("x-mcdf-marketplace-metadata-hex", metadata_hex.clone())
            .header("x-mcdf-manager-metadata-hex", metadata_hex);
    }

    let mut request = add_publisher_identity_headers(
        builder.body(bytes),
        publisher_id,
        publisher_display_name,
        publisher_public_key,
        publisher_certificate,
    );

    if let Some(token) = bearer_token.filter(|value| !value.trim().is_empty()) {
        request = request.bearer_auth(token);
    }

    let response = request
        .send()
        .map_err(|error| describe_http_send_error("Compatibility MCDF upload request", error))?;
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_else(|_| "<unreadable response body>".to_string());
        return Err(format!("central server upload failed: HTTP {status}: {body}"));
    }
    let job = response.json::<JobCreateResponse>().map_err(|error| error.to_string())?;
    let mut result = wait_for_archive_job(&client, &base, &job.status_url, bearer_token)?;
    if omitted_preview_from_header {
        result.notes.insert(0, "Compatibility upload omitted the preview image from the metadata header to avoid oversized HTTP headers. Publish through the parsed MCDF path to include the preview image.".to_string());
    }
    Ok(result)
}

fn file_display_metadata(paths: &[String], size_bytes: u64) -> FileDisplayMetadata {
    let primary = paths.first().cloned().unwrap_or_else(|| "unknown".to_string());
    let display_name = primary.rsplit('/').next().unwrap_or(primary.as_str()).to_string();
    let extension = display_name.rsplit('.').next().filter(|value| *value != display_name).unwrap_or("bin").to_ascii_lowercase();
    let (component_kind, preview_supported, render_status) = match extension.as_str() {
        "tex" | "atex" => ("texture", true, "texture_preview_later"),
        "mdl" => ("model", false, "model_metadata_only"),
        "mtrl" => ("material", false, "material_metadata_only"),
        "eid" | "sklb" | "pbd" | "pdb" => ("skeleton_or_rig", false, "metadata_only"),
        "pap" | "tmb" | "avfx" => ("animation_or_effect", false, "metadata_only"),
        _ => ("binary", false, "metadata_only"),
    };
    FileDisplayMetadata {
        primary_game_path: primary,
        display_name,
        extension,
        component_kind: component_kind.to_string(),
        size_bytes,
        preview_supported,
        render_status: render_status.to_string(),
        metadata_notes: vec!["Client-side normalized metadata derived from MCDF path, extension, length, and BLAKE3 identity.".to_string()],
    }
}

fn guess_media_type_from_paths(paths: &[String]) -> String {
    let extension = paths
        .iter()
        .filter_map(|path| path.rsplit('.').next())
        .next()
        .unwrap_or("")
        .to_ascii_lowercase();
    match extension.as_str() {
        "mdl" => "application/vnd.ffxiv.model".to_string(),
        "mtrl" => "application/vnd.ffxiv.material".to_string(),
        "tex" | "atex" => "image/vnd.ffxiv.texture".to_string(),
        "eid" => "application/vnd.ffxiv.eid".to_string(),
        "sklb" => "application/vnd.ffxiv.skeleton".to_string(),
        _ => "application/octet-stream".to_string(),
    }
}

fn bytes_to_hex(bytes: &[u8]) -> String {
    let mut output = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        use std::fmt::Write as _;
        let _ = write!(&mut output, "{byte:02x}");
    }
    output
}



#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteMcdfScanResult {
    pub source_url: String,
    pub original_filename: String,
    pub title: String,
    pub description: String,
    pub package_hash_blake3: String,
    pub package_size: u64,
    pub file_count: usize,
    pub total_file_bytes: u64,
    pub component_kinds: Vec<String>,
    pub notes: Vec<String>,
}

fn infer_component_kind_from_path(path: &str) -> String {
    let lower = path.to_ascii_lowercase();
    if lower.ends_with(".tex") || lower.ends_with(".atex") {
        "texture".to_string()
    } else if lower.ends_with(".mtrl") {
        "material".to_string()
    } else if lower.ends_with(".mdl") {
        "model".to_string()
    } else if lower.ends_with(".sklb") {
        "skeleton".to_string()
    } else if lower.ends_with(".pap") || lower.ends_with(".tmb") {
        "animation".to_string()
    } else {
        "other".to_string()
    }
}

fn remote_filename_from_url(url: &str) -> Option<String> {
    let without_query = url.split('?').next().unwrap_or(url);
    let name = without_query.rsplit('/').next()?.trim();
    if name.is_empty() { None } else { Some(name.to_string()) }
}

fn google_drive_file_id(input: &str) -> Option<String> {
    let trimmed = input.trim();
    if let Some(marker) = trimmed.find("/file/d/") {
        let rest = &trimmed[marker + "/file/d/".len()..];
        let id = rest.split(['/', '?', '&']).next().unwrap_or_default().trim();
        if !id.is_empty() {
            return Some(id.to_string());
        }
    }
    if let Some(marker) = trimmed.find("id=") {
        let rest = &trimmed[marker + "id=".len()..];
        let id = rest.split(['&', '#']).next().unwrap_or_default().trim();
        if !id.is_empty() {
            return Some(id.to_string());
        }
    }
    None
}

fn remote_download_candidates(input: &str) -> Vec<String> {
    let trimmed = input.trim();
    if let Some(id) = google_drive_file_id(trimmed) {
        return vec![
            // Newer Drive downloads often use the usercontent host. confirm=t bypasses the
            // virus-scan interstitial for large public files when the share permission allows it.
            format!("https://drive.usercontent.google.com/download?id={id}&export=download&confirm=t"),
            format!("https://drive.google.com/uc?export=download&confirm=t&id={id}"),
            format!("https://drive.google.com/uc?export=download&id={id}"),
        ];
    }
    vec![trimmed.to_string()]
}

fn looks_like_mcdf(bytes: &[u8]) -> bool {
    bytes.starts_with(b"MCDF")
}

fn download_remote_mcdf_bytes(source_url: &str) -> Result<(Vec<u8>, Vec<String>), String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(120))
        .redirect(reqwest::redirect::Policy::limited(10))
        .user_agent("MCDF-Manager/0.1 remote-metadata-scan")
        .build()
        .map_err(|error| error.to_string())?;
    let mut notes = Vec::new();
    let mut last_error = String::new();
    for candidate in remote_download_candidates(source_url) {
        notes.push(format!("Tried temporary remote download candidate: {candidate}"));
        match client.get(&candidate).send() {
            Ok(response) => {
                let status = response.status();
                if !status.is_success() {
                    last_error = format!("HTTP {status} from {candidate}");
                    continue;
                }
                let bytes = response.bytes().map_err(|error| error.to_string())?;
                if looks_like_mcdf(&bytes) {
                    notes.push("Remote download produced an MCDF payload.".to_string());
                    return Ok((bytes.to_vec(), notes));
                }
                let prefix = String::from_utf8_lossy(&bytes[..bytes.len().min(96)]);
                last_error = if prefix.trim_start().starts_with("<!DOCTYPE") || prefix.trim_start().starts_with("<html") {
                    "The remote link returned an HTML page instead of MCDF bytes. For Google Drive, make sure the file is shared as anyone-with-link and use the /file/d/<id>/view URL.".to_string()
                } else {
                    format!("Remote link did not return MCDF bytes; first bytes were: {prefix:?}")
                };
            }
            Err(error) => {
                last_error = error.to_string();
            }
        }
    }
    Err(format!("Failed to download a valid remote MCDF for temporary scan: {last_error}"))
}


#[command]
pub fn download_remote_mcdf_to_file(
    source_url: String,
    output_path: String,
    expected_package_hash: Option<String>,
) -> Result<ArchiveDownloadResult, String> {
    let source_url = source_url.trim();
    if source_url.is_empty() {
        return Err("Remote MCDF URL is required".to_string());
    }
    let (bytes, _download_notes) = download_remote_mcdf_bytes(source_url)?;
    let package_hash = blake3::hash(&bytes).to_hex().to_string();
    if let Some(expected) = expected_package_hash.as_ref().map(|value| value.trim().to_ascii_lowercase()).filter(|value| !value.is_empty()) {
        if package_hash != expected {
            return Err(format!(
                "downloaded package hash mismatch: expected {}, got {}",
                expected,
                package_hash
            ));
        }
    }
    let output = PathBuf::from(&output_path);
    if let Some(parent) = output.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent).map_err(|error| format!("Failed to create download folder: {error}"))?;
        }
    }
    fs::write(&output, &bytes).map_err(|error| format!("Failed to save downloaded MCDF: {error}"))?;
    Ok(ArchiveDownloadResult {
        output_path,
        bytes_written: bytes.len() as u64,
        package_hash_blake3: package_hash,
        rebuilt_package_hash_blake3: None,
        package_hash_verified: true,
        download_note: Some("Downloaded package matches the requested archive package hash.".to_string()),
    })
}

#[command]
pub fn scan_remote_mcdf_metadata(url: String) -> Result<RemoteMcdfScanResult, String> {
    let source_url = url.trim();
    if source_url.is_empty() {
        return Err("Remote MCDF URL is required".to_string());
    }
    let (bytes, download_notes) = download_remote_mcdf_bytes(source_url)?;
    let package_hash = blake3::hash(&bytes).to_hex().to_string();
    let original_filename = remote_filename_from_url(source_url).unwrap_or_else(|| format!("remote-{}.mcdf", &package_hash[..12]));
    let temp_path = local_cache::app_home()?.join("remote-scan-temp").join(&original_filename);
    if let Some(parent) = temp_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&temp_path, &bytes).map_err(|e| e.to_string())?;
    let scan_result = (|| -> Result<RemoteMcdfScanResult, String> {
        let metadata = scan_mcdf(temp_path.to_string_lossy().to_string())?;
        let files = inspect_mcdf_files(temp_path.to_string_lossy().to_string())?;
        let mut kinds: Vec<String> = files
            .iter()
            .flat_map(|file| file.game_paths.iter().take(1))
            .map(|path| infer_component_kind_from_path(path))
            .collect();
        kinds.sort();
        kinds.dedup();
        kinds.truncate(8);
        Ok(RemoteMcdfScanResult {
            source_url: source_url.to_string(),
            original_filename: original_filename.clone(),
            title: original_filename.trim_end_matches(".mcdf").to_string(),
            description: metadata.description,
            package_hash_blake3: package_hash.clone(),
            package_size: bytes.len() as u64,
            file_count: files.len(),
            total_file_bytes: files.iter().map(|file| file.length as u64).sum(),
            component_kinds: kinds,
            notes: {
                let mut notes = download_notes.clone();
                notes.push("Remote MCDF was downloaded to a temporary scan file, parsed for metadata, and then removed from local temp storage.".to_string());
                notes
            },
        })
    })();
    let _ = fs::remove_file(&temp_path);
    scan_result
}


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McdfAnalyzeResult {
    pub metadata: MareCharaFileData,
    pub files: Vec<ExtractedFileInfo>,
}

#[command]
pub fn analyze_mcdf(path: String) -> Result<McdfAnalyzeResult, String> {
    let file = File::open(&path).map_err(|e| e.to_string())?;
    let mut reader = BufReader::new(file);
    let package = MCDFParser::parse_package(&mut reader).map_err(|e| format!("Failed to parse MCDF: {e}"))?;
    Ok(McdfAnalyzeResult { metadata: package.metadata, files: package.files })
}

#[command]
pub fn scan_mcdf(path: String) -> Result<MareCharaFileData, String> {
    let file = File::open(&path).map_err(|e| e.to_string())?;
    let mut reader = BufReader::new(file);
    let package = MCDFParser::parse_package(&mut reader).map_err(|e| format!("Failed to parse MCDF: {e}"))?;
    Ok(package.metadata)
}

#[command]
pub fn inspect_mcdf_files(path: String) -> Result<Vec<ExtractedFileInfo>, String> {
    let file = File::open(&path).map_err(|e| e.to_string())?;
    let mut reader = BufReader::new(file);
    let package = MCDFParser::parse_package(&mut reader).map_err(|e| format!("Failed to parse MCDF: {e}"))?;
    Ok(package.files)
}

#[command]
pub fn create_local_manifest(
    path: String,
    title: Option<String>,
    description: Option<String>,
    chunk_size: Option<u64>,
) -> Result<ManifestBuildResult, String> {
    let chunk_size = chunk_size.map(|v| v as usize);
    vault_manifest::create_local_manifest(PathBuf::from(path).as_path(), title, description, chunk_size)
}

#[command]
pub fn read_manifest(path: String) -> Result<VaultManifest, String> {
    vault_manifest::read_manifest(PathBuf::from(path).as_path())
}


#[command]
pub fn inspect_manifest_status(path: String) -> Result<ManifestStatus, String> {
    vault_manifest::inspect_manifest_status(PathBuf::from(path).as_path())
}

#[command]
pub fn rebuild_from_manifest(
    manifest_path: String,
    output_path: Option<String>,
) -> Result<RebuildResult, String> {
    vault_manifest::rebuild_from_manifest(
        PathBuf::from(manifest_path).as_path(),
        output_path.map(PathBuf::from),
    )
}

#[command]
pub fn list_online_locations() -> Result<Vec<OnlineLocation>, String> {
    online_locations::list_online_locations()
}

#[command]
pub fn add_online_location(
    name: String,
    url: String,
    source_type: OnlineLocationType,
    google_api_key: Option<String>,
) -> Result<OnlineLocation, String> {
    online_locations::add_online_location(name, url, source_type, google_api_key)
}

#[command]
pub fn remove_online_location(id: String) -> Result<Vec<OnlineLocation>, String> {
    online_locations::remove_online_location(id)
}

#[command]
pub fn scan_online_locations() -> Result<Vec<OnlineLocationScanResult>, String> {
    online_locations::scan_online_locations()
}

#[command]
pub fn scan_online_location(id: String) -> Result<OnlineLocationScanResult, String> {
    online_locations::scan_online_location(id)
}

#[command]
pub fn create_manifest_from_online_entry(
    request: OnlineManifestBuildRequest,
) -> Result<ManifestBuildResult, String> {
    online_locations::create_manifest_from_online_entry(request)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheClearResult {
    pub cache_dir: String,
    pub removed_dirs: Vec<String>,
    pub notes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExchangePackageCacheInspection {
    pub package_hash_blake3: String,
    pub file_count: usize,
    pub cached_count: usize,
    pub missing_count: usize,
    pub cached_bytes: u64,
    pub total_bytes: u64,
    pub gap_percent: f64,
    pub cache_dir: String,
    pub notes: Vec<String>,
}

#[command]
pub fn get_cache_dir() -> Result<String, String> {
    Ok(local_cache::exchange_cache_dir()?.to_string_lossy().to_string())
}

#[command]
pub fn clear_download_cache() -> Result<CacheClearResult, String> {
    let settings = local_cache::storage_settings()?;
    let cache_dir = local_cache::exchange_cache_dir()?;
    let mut removed_dirs = Vec::new();
    let mut notes = Vec::new();
    for name in ["file-parts", "manifests", "remote-scan-temp", "temporary-synced-packages", "synced-packages"] {
        let path = cache_dir.join(name);
        if path.exists() {
            std::fs::remove_dir_all(&path).map_err(|error| format!("failed to clear {name}: {error}"))?;
            removed_dirs.push(path.to_string_lossy().to_string());
        }
        std::fs::create_dir_all(&path).map_err(|error| error.to_string())?;
    }
    notes.push("Exchange cache and temporary synced packages cleared. Library entries, settings, client auth, and favorites were not removed. Entries that depended on temporary synced MCDF files will show sync needed again.".to_string());
    notes.push(format!("Configured downloads folder is {}.", settings.downloads_dir));
    Ok(CacheClearResult { cache_dir: cache_dir.to_string_lossy().to_string(), removed_dirs, notes })
}

#[command]
pub fn inspect_exchange_package_cache(index_url: String, package_manifest_path: String) -> Result<ExchangePackageCacheInspection, String> {
    let record = fetch_public_package_by_manifest(&index_url, &package_manifest_path)?;
    let mut cached_count = 0usize;
    let mut missing_count = 0usize;
    let mut cached_bytes = 0u64;
    let mut total_bytes = 0u64;
    for file in &record.files {
        total_bytes = total_bytes.saturating_add(file.length as u64);
        if file.payload_blake3.trim().is_empty() {
            missing_count += 1;
            continue;
        }
        let path = local_cache::blob_path(&file.payload_blake3)?;
        if path.exists() {
            cached_count += 1;
            cached_bytes = cached_bytes.saturating_add(file.length as u64);
        } else {
            missing_count += 1;
        }
    }
    let gap_percent = if record.files.is_empty() { 0.0 } else { (missing_count as f64 / record.files.len() as f64) * 100.0 };
    Ok(ExchangePackageCacheInspection {
        package_hash_blake3: record.package_hash_blake3,
        file_count: record.files.len(),
        cached_count,
        missing_count,
        cached_bytes,
        total_bytes,
        gap_percent,
        cache_dir: local_cache::blob_dir()?.to_string_lossy().to_string(),
        notes: vec!["Cache inspection is local only. It does not contact the archive server or Git index beyond reading the selected package record.".to_string()],
    })
}

#[command]
pub fn clear_exchange_package_cache(index_url: String, package_manifest_path: String) -> Result<CacheClearResult, String> {
    let record = fetch_public_package_by_manifest(&index_url, &package_manifest_path)?;
    let mut removed_dirs = Vec::new();
    let mut notes = Vec::new();
    for file in &record.files {
        if file.payload_blake3.trim().is_empty() { continue; }
        let path = local_cache::blob_path(&file.payload_blake3)?;
        if path.exists() {
            std::fs::remove_file(&path).map_err(|error| format!("failed to remove cached blob {}: {error}", file.payload_blake3))?;
            removed_dirs.push(path.to_string_lossy().to_string());
        }
    }
    notes.push(format!("Removed {} cached file parts for {}.", removed_dirs.len(), record.package_hash_blake3));
    Ok(CacheClearResult { cache_dir: local_cache::blob_dir()?.to_string_lossy().to_string(), removed_dirs, notes })
}

#[command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
