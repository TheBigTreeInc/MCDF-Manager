use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageSettings {
    pub schema_version: u32,
    pub initialized: bool,
    pub settings_file: String,
    pub app_home_dir: String,
    pub library_dir: String,
    pub exchange_cache_dir: String,
    pub downloads_dir: String,
    #[serde(default)]
    pub admin_token: Option<String>,
    pub notes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct StorageSettingsUpdate {
    pub library_dir: Option<String>,
    pub exchange_cache_dir: Option<String>,
    pub downloads_dir: Option<String>,
    pub initialized: Option<bool>,
    pub admin_token: Option<String>,
}

fn user_home() -> Result<PathBuf, String> {
    let home = std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .ok_or_else(|| "Unable to determine user home directory".to_string())?;
    Ok(PathBuf::from(home))
}

pub fn app_home() -> Result<PathBuf, String> {
    if let Ok(value) = std::env::var("MCDF_MARKETPLACE_HOME") {
        let path = PathBuf::from(value);
        fs::create_dir_all(&path).map_err(|e| e.to_string())?;
        return Ok(path);
    }
    let path = user_home()?.join(".mcdf-marketplace");
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    Ok(path)
}

fn storage_settings_path() -> Result<PathBuf, String> {
    Ok(app_home()?.join("storage-settings.json"))
}

fn default_storage_settings(initialized: bool) -> Result<StorageSettings, String> {
    let app_home_dir = app_home()?;
    Ok(StorageSettings {
        schema_version: 1,
        initialized,
        settings_file: storage_settings_path()?.to_string_lossy().to_string(),
        app_home_dir: app_home_dir.to_string_lossy().to_string(),
        library_dir: app_home_dir.join("library").to_string_lossy().to_string(),
        exchange_cache_dir: app_home_dir.join("exchange-cache").to_string_lossy().to_string(),
        downloads_dir: app_home_dir.join("downloads").to_string_lossy().to_string(),
        admin_token: None,
        notes: vec!["Storage folders are local to this machine. Existing folders can be imported from Settings or first boot setup.".to_string()],
    })
}

fn normalize_dir(value: Option<String>, fallback: PathBuf) -> PathBuf {
    value
        .map(|path| path.trim().to_string())
        .filter(|path| !path.is_empty())
        .map(PathBuf::from)
        .unwrap_or(fallback)
}

pub fn storage_settings() -> Result<StorageSettings, String> {
    let settings_path = storage_settings_path()?;
    let mut settings = if settings_path.exists() {
        let text = fs::read_to_string(&settings_path).map_err(|e| e.to_string())?;
        serde_json::from_str::<StorageSettings>(&text).unwrap_or(default_storage_settings(false)?)
    } else {
        default_storage_settings(false)?
    };
    settings.settings_file = settings_path.to_string_lossy().to_string();
    settings.app_home_dir = app_home()?.to_string_lossy().to_string();
    ensure_storage_dirs(&settings)?;
    Ok(settings)
}

pub fn save_storage_settings(update: StorageSettingsUpdate) -> Result<StorageSettings, String> {
    let app_home_dir = app_home()?;
    let current = storage_settings().unwrap_or(default_storage_settings(false)?);
    let mut next = StorageSettings {
        schema_version: 1,
        initialized: update.initialized.unwrap_or(true),
        settings_file: storage_settings_path()?.to_string_lossy().to_string(),
        app_home_dir: app_home_dir.to_string_lossy().to_string(),
        library_dir: normalize_dir(update.library_dir, PathBuf::from(current.library_dir)).to_string_lossy().to_string(),
        exchange_cache_dir: normalize_dir(update.exchange_cache_dir, PathBuf::from(current.exchange_cache_dir)).to_string_lossy().to_string(),
        downloads_dir: normalize_dir(update.downloads_dir, PathBuf::from(current.downloads_dir)).to_string_lossy().to_string(),
        admin_token: update.admin_token.or(current.admin_token),
        notes: vec!["Storage folders saved. MCDF Manager will use these folders for library metadata, Exchange cache, and rebuilt downloads.".to_string()],
    };
    ensure_storage_dirs(&next)?;
    let text = serde_json::to_string_pretty(&next).map_err(|e| e.to_string())?;
    fs::write(storage_settings_path()?, text).map_err(|e| e.to_string())?;
    next.settings_file = storage_settings_path()?.to_string_lossy().to_string();
    Ok(next)
}

pub fn ensure_storage_dirs(settings: &StorageSettings) -> Result<(), String> {
    fs::create_dir_all(&settings.library_dir).map_err(|e| e.to_string())?;
    fs::create_dir_all(&settings.exchange_cache_dir).map_err(|e| e.to_string())?;
    fs::create_dir_all(&settings.downloads_dir).map_err(|e| e.to_string())?;
    fs::create_dir_all(PathBuf::from(&settings.exchange_cache_dir).join("file-parts")).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn library_dir() -> Result<PathBuf, String> {
    let settings = storage_settings()?;
    let path = PathBuf::from(settings.library_dir);
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    Ok(path)
}

pub fn exchange_cache_dir() -> Result<PathBuf, String> {
    let settings = storage_settings()?;
    let path = PathBuf::from(settings.exchange_cache_dir);
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    Ok(path)
}

pub fn blob_dir() -> Result<PathBuf, String> {
    let path = exchange_cache_dir()?.join("file-parts");
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    Ok(path)
}

pub fn manifest_dir() -> Result<PathBuf, String> {
    let path = exchange_cache_dir()?.join("manifests");
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    Ok(path)
}

pub fn downloads_dir() -> Result<PathBuf, String> {
    let settings = storage_settings()?;
    let path = PathBuf::from(settings.downloads_dir);
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    Ok(path)
}

pub fn blob_path(hash: &str) -> Result<PathBuf, String> {
    if hash.len() < 2 || !hash.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(format!("Invalid blob hash: {hash}"));
    }
    let prefix = &hash[0..2];
    let dir = blob_dir()?.join(prefix);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(hash))
}
