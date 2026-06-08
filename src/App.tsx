import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type MouseEvent,
  type FormEvent,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open as openDialog, save } from "@tauri-apps/plugin-dialog";

type Tab =
  | "marketplace"
  | "published"
  | "library"
  | "prepare"
  | "inspect"
  | "settings"
  | "admin";
type OperationKind = "upload" | "download" | "scan" | "build" | "sync";
type OperationStatus = "running" | "done" | "failed";
type McdfIconName =
  | "access-requests"
  | "block-hash"
  | "blocklist"
  | "moderation-queue"
  | "public-index"
  | "publisher-certificate"
  | "registry-server"
  | "unblock"
  | "user-creator"
  | "admin"
  | "analyze"
  | "exchange"
  | "inspect"
  | "library"
  | "settings"
  | "star-decoration"
  | "add-to-library"
  | "admin-remove"
  | "adult-marker"
  | "delete-listing"
  | "edit-listing"
  | "favorite-empty"
  | "favorite-filled"
  | "follow-creator"
  | "following-creator"
  | "in-library"
  | "not-following"
  | "report-listing"
  | "animation"
  | "hash-chunk"
  | "material"
  | "mcdf-package"
  | "metadata"
  | "model"
  | "pose"
  | "skeleton"
  | "texture"
  | "unknown"
  | "add"
  | "cancel"
  | "close"
  | "maximize"
  | "minimize"
  | "notifications"
  | "refresh"
  | "restore"
  | "save"
  | "sync"
  | "transfers"
  | "add-from-folder"
  | "add-from-link"
  | "download"
  | "export"
  | "folder"
  | "import"
  | "open-location"
  | "publish"
  | "remove-local"
  | "share-code"
  | "crop"
  | "empty-placeholder"
  | "move-down"
  | "move-up"
  | "move"
  | "replace-cover"
  | "reset-framing"
  | "zoom-in"
  | "zoom-out"
  | "adult"
  | "connected"
  | "disconnected"
  | "error"
  | "loading"
  | "local-only"
  | "public"
  | "restricted"
  | "success"
  | "warning";

function SvgIcon({
  name,
  className = "",
  title,
}: {
  name: McdfIconName;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      className={`mcdf-icon mcdf-icon--fantasy-glamour ${className}`}
      viewBox="0 0 24 24"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      <use href={`/icons/sprite.svg#${name}`} />
    </svg>
  );
}


type OperationStage = {
  percent: number;
  label: string;
  detail?: string;
};

type Operation = {
  id: string;
  kind: OperationKind;
  label: string;
  status: OperationStatus;
  startedAt: number;
  endedAt?: number;
  bytesDone?: number;
  bytesTotal?: number;
  message?: string;
  stage?: OperationStage;
};

type FileEntry = { game_paths: string[]; length: number; hash: string };
type MCDFInfo = {
  description: string;
  glamourer_data: string;
  customize_plus_data: string;
  manipulation_data: string;
  files: FileEntry[];
};
type ExtractedFileInfo = {
  index: number;
  game_paths: string[];
  length: number;
  hash: string;
  offset: number;
  blake3: string;
};
type McdfAnalyzeResult = {
  metadata: MCDFInfo;
  files: ExtractedFileInfo[];
};
type AnalyzedFileInfo = ExtractedFileInfo & {
  online_status?: string;
  central_status?: ComponentCentralStatus;
  notes?: string[];
};
type AnalyzeProgress = {
  percent: number;
  title: string;
  detail: string;
  known?: number;
  missing?: number;
  total?: number;
};
type FileProbeAvailability = {
  payload_blake3: string;
  length: number;
  game_paths: string[];
  upload_url?: string | null;
  direct_blob_url?: string | null;
  oci_ref?: string | null;
  oci_digest?: string | null;
};
type FileProbeResponse = {
  known_files: FileProbeAvailability[];
  missing_files: FileProbeAvailability[];
};
type ComponentCentralStatus =
  | "unknown"
  | "present"
  | "missing"
  | "queued"
  | "external_only";
type ComponentAvailability = {
  index: number;
  game_paths: string[];
  length: number;
  mcdf_hash: string;
  payload_blake3: string;
  central_status: ComponentCentralStatus;
  online_status: string;
  notes: string[];
};
type CentralServerHealth = {
  status: string;
  public_url: string;
  storage_mode: string;
  ghcr_configured: boolean;
  uploads_require_auth: boolean;
  uploads_require_registered_user?: boolean | null;
  admin_token_configured?: boolean | null;
  service_port?: number | null;
  hosted_auth_mode?: string | null;
  ca_id?: string | null;
  client_certificates_supported?: boolean | null;
  git_available?: boolean | null;
  ssh_available?: boolean | null;
  public_index_sync_ready?: boolean | null;
  private_state_sync_ready?: boolean | null;
  server_version?: string | null;
};

type ArchiveConfigResponse = {
  schema_version: number;
  service_name: string;
  api_version: string;
  generated_at: string;
  server: {
    public_url?: string;
    service_port?: number;
    parser_revision?: number;
    hosted_auth_mode?: string;
  };
  uploads: {
    enabled?: boolean;
    requires_token?: boolean;
    requires_registered_user?: boolean;
    admin_token_accepted?: boolean;
    auth_model?: string;
    max_upload_mb?: number;
    preferred_flow?: string;
    endpoints?: Record<string, string>;
  };
  storage: {
    mode?: string;
    direct_downloads?: boolean;
    ghcr_owner?: string | null;
    file_parts_ref?: string | null;
    package_manifests_ref?: string | null;
  };
  public_index: {
    enabled?: boolean;
    repo?: string;
    branch?: string;
    latest_url?: string | null;
    local_dir?: string | null;
  };
  catalog: { endpoint?: string; local_database_dir?: string };
  identity: {
    publisher_registration?: string;
    client_keys_supported?: boolean;
    current_local_owner_id?: string;
    current_publisher_id?: string;
    identity_endpoint?: string;
    registration_endpoint?: string;
    notes?: string[];
    certificate_authority?: {
      enabled?: boolean;
      ca_id?: string;
      ca_name?: string;
      ca_public_key?: string;
      ca_status_endpoint?: string;
      client_certificate_endpoint?: string;
      notes?: string[];
    };
  };
  notes: string[];
};

type PublicIndexDiagnosticCheck = { name: string; ok: boolean; detail: string };
type PublicIndexDiagnosticsResponse = {
  enabled: boolean;
  repo: string;
  branch: string;
  index_dir?: string | null;
  public_dir?: string | null;
  git_available: boolean;
  git_version?: string | null;
  credential_helper?: string | null;
  credential_manager_version?: string | null;
  token_auth_configured: boolean;
  token_auth_source?: string | null;
  ssh_auth_configured: boolean;
  ssh_key_file?: string | null;
  ssh_key_exists: boolean;
  auth_method: string;
  worktree_exists: boolean;
  worktree_initialized: boolean;
  origin_url?: string | null;
  current_branch?: string | null;
  head?: string | null;
  dirty: boolean;
  latest_index_exists: boolean;
  package_count: number;
  file_metadata_count: number;
  checks: PublicIndexDiagnosticCheck[];
  notes: string[];
};

type PublicIndexPackageSummary = {
  package_hash_blake3: string;
  share_id?: string;
  share_code?: string;
  original_filename: string;
  title?: string;
  description: string;
  tags?: string[];
  preview_image_available?: boolean;
  preview_image_path?: string | null;
  preview_crop?: PreviewCrop | null;
  is_adult?: boolean;
  visibility?: string | null;
  character_use_consent?: CharacterUseConsent | null;
  owner_display_name: string;
  owner_public_id: string;
  file_count: number;
  total_file_bytes: number;
  component_kinds: string[];
  package_manifest_path: string;
  download_manifest_path: string;
  updated_at: string;
};

type IndexSshKeyResult = {
  ssh_dir: string;
  private_key_file: string;
  public_key_file: string;
  public_key?: string | null;
  created: boolean;
  notes: string[];
};

type IndexSshTestResult = {
  ssh_key_file: string;
  remote: string;
  ok: boolean;
  exit_code?: number | null;
  stdout: string;
  stderr: string;
  notes: string[];
};

type GenerateAdminTokenResponse = {
  generated_at: string;
  token: string;
  token_file?: string | null;
  label?: string | null;
  notes?: string[];
};

type PublicIndexLatest = {
  schema_version: number;
  generated_at: string;
  package_count: number;
  packages: PublicIndexPackageSummary[];
};

type PublisherIdentityRecord = {
  schema_version: number;
  publisher_id: string;
  username?: string | null;
  display_name: string;
  public_key?: string | null;
  certificate?: string | null;
  status: string;
  source: string;
  created_at: string;
  updated_at: string;
  notes: string[];
};

type ClientAuthExportPackage = {
  schema_version: number;
  package_kind: "mcdf-client-auth";
  exported_at: string;
  archive_host?: string | null;
  archive_endpoint?: string | null;
  publisher_id: string;
  username?: string | null;
  display_name: string;
  public_key: string;
  private_key: string;
  certificate: string;
  ca_id?: string | null;
  notes: string[];
};

type PublicPackageRecord = {
  schema_version: number;
  generated_at: string;
  package_hash_blake3: string;
  share_id?: string;
  share_code?: string;
  original_filename: string;
  title?: string;
  description: string;
  tags?: string[];
  preview_image_available?: boolean;
  preview_image_path?: string | null;
  preview_crop?: PreviewCrop | null;
  is_adult?: boolean;
  visibility?: string | null;
  character_use_consent?: CharacterUseConsent | null;
  owner: { display_name?: string; public_id?: string };
  parser_revision: number;
  parser_status: string;
  rebuild_strategy: string;
  container_encoding: string;
  validation: {
    decoded_content_identical?: boolean;
    file_payloads_hash_verified?: boolean;
    file_payload_count?: number;
  };
  file_count: number;
  total_file_bytes: number;
  files: Array<{
    index?: number;
    payload_blake3?: string;
    length?: number;
    game_paths?: string[];
    component_kind?: string;
    display_name?: string;
    ghcr_ref?: string | null;
    ghcr_digest?: string | null;
  }>;
  ghcr_manifest_ref?: string | null;
};

type ArchiveDownloadResult = {
  output_path: string;
  bytes_written: number;
  package_hash_blake3: string;
  rebuilt_package_hash_blake3?: string | null;
  package_hash_verified?: boolean;
  download_note?: string | null;
};

type ExportLocalMcdfResult = {
  source_path: string;
  output_path: string;
  bytes_written: number;
};

type ExportInternalMcdfFileResult = {
  source_path: string;
  output_path: string;
  index: number;
  payload_blake3: string;
  bytes_written: number;
};

type CacheClearResult = {
  cache_dir: string;
  removed_dirs: string[];
  notes: string[];
};

type StorageSettingsResponse = {
  schema_version: number;
  initialized: boolean;
  settings_file: string;
  app_home_dir: string;
  library_dir: string;
  exchange_cache_dir: string;
  downloads_dir: string;
  auto_import_dirs: string[];
  auto_import_recursive: boolean;
  admin_token?: string | null;
  notes: string[];
};

type StorageSettingsUpdateRequest = {
  settings_file?: string | null;
  library_dir?: string | null;
  exchange_cache_dir?: string | null;
  downloads_dir?: string | null;
  auto_import_dirs?: string[] | null;
  auto_import_recursive?: boolean | null;
  initialized?: boolean | null;
  admin_token?: string | null;
};

type StorageUsageItem = {
  label: string;
  path: string;
  bytes: number;
  files: number;
  directories: number;
  error?: string | null;
};

type StorageUsageResponse = {
  total_bytes: number;
  items: StorageUsageItem[];
};

type AutoImportCandidate = {
  local_path: string;
  original_filename: string;
  title: string;
  description: string;
  package_hash_blake3: string;
  file_count: number;
  total_file_bytes: number;
  component_kinds: string[];
  file_manifest: LocalFileManifestEntry[];
  notes: string[];
};

type AutoImportFolderResult = {
  folder: string;
  scanned_file_count: number;
  imported_count: number;
  entries: AutoImportCandidate[];
  notes: string[];
};

type ExchangePackageCacheInspection = {
  package_hash_blake3: string;
  file_count: number;
  cached_count: number;
  missing_count: number;
  cached_bytes: number;
  total_bytes: number;
  gap_percent: number;
  cache_dir: string;
  notes: string[];
};

type CentralUploadResponse = {
  package_hash_blake3: string;
  package_size: number;
  file_count: number;
  archived_file_count: number;
  deduplicated_file_count: number;
  manifest_url: string;
  download_url: string;
  storage_mode: string;
  ownership?: {
    owner_user_id?: string;
    owner_display_name?: string;
    owner_source?: string;
    visibility?: string;
  } | null;
  validation?: {
    decoded_content_identical?: boolean;
    file_payloads_hash_verified?: boolean;
    outer_byte_identical?: boolean;
  } | null;
  notes: string[];
};

type AccessRequestNotification = {
  id: string;
  package_hash_blake3?: string | null;
  package_title?: string | null;
  owner_public_id?: string | null;
  owner_display_name?: string | null;
  requester_display_name: string;
  requester_id?: string | null;
  requested_at: string;
  updated_at?: string | null;
  status: "pending" | "approved" | "denied";
  note?: string | null;
  decision_note?: string | null;
};

type AccessRequestListResponse = {
  schema_version: number;
  generated_at: string;
  request_count: number;
  requests: AccessRequestNotification[];
  notes: string[];
};

type ReportRecord = {
  id: string;
  package_hash_blake3: string;
  package_title?: string | null;
  reporter_display_name: string;
  reason: string;
  note?: string | null;
  status: "open" | "reviewed" | "removed" | "dismissed";
  created_at: string;
  updated_at?: string | null;
};
type ReportListResponse = {
  schema_version: number;
  generated_at: string;
  report_count: number;
  reports: ReportRecord[];
  notes: string[];
};

type ExchangeEditDraft = {
  title: string;
  description: string;
  tags: string;
  visibility: string;
  isAdult: boolean;
  previewImagePath: string;
  previewImageName: string;
  previewCrop: PreviewCrop;
  characterUseConsent: CharacterUseConsent;
};

type ExchangeOwnerMutationResponse = {
  package_hash_blake3: string;
  title: string;
  description: string;
  tags: string[];
  is_adult: boolean;
  visibility: string;
  owner_public_id: string;
  owner_display_name: string;
  preview_image_path?: string | null;
  preview_crop?: PreviewCrop | null;
  removed: boolean;
  index_rendered: boolean;
  index_pushed: boolean;
  notes: string[];
};
type UserPermissionRecord = {
  publisher_id: string;
  username?: string | null;
  display_name: string;
  public_key?: string | null;
  certificate?: string | null;
  certificate_revoked?: boolean;
  certificate_revoked_at?: string | null;
  can_connect: boolean;
  can_upload: boolean;
  is_admin: boolean;
  status: string;
  updated_at?: string | null;
};

type AdminServerSettings = {
  schema_version: number;
  upload_mode: "public" | "registered" | string;
  require_upload_token: boolean;
  public_index_enabled: boolean;
  public_index_include_private: boolean;
  updated_at: string;
  restart_required: boolean;
  notes?: string[];
};
type UserPermissionListResponse = {
  user_count: number;
  users: UserPermissionRecord[];
  notes: string[];
};

type PublicPublisherIndex = {
  schema_version: number;
  generated_at: string;
  publisher_count: number;
  publishers: PublisherIdentityRecord[];
};

type ModerationBlockEntry = {
  schema_version: number;
  target_type: string;
  hash_blake3: string;
  reason: string;
  category: string;
  source_package_hash?: string | null;
  created_at: string;
  created_by: string;
};

type ModerationBlocklistResponse = {
  schema_version: number;
  generated_at: string;
  package_block_count: number;
  file_block_count: number;
  entries: ModerationBlockEntry[];
  notes: string[];
};

type LocalFileManifestEntry = {
  index: number;
  game_paths: string[];
  length: number;
  payload_blake3: string;
};
type LocalSharingStatus = "allowed" | "blocked";
type LocalSharingClassification =
  | "allowed"
  | "restricted"
  | "blocked_by_policy"
  | "potentially_illegal";
type LocalModerationMatch = {
  target_type: "package" | "file";
  hash_blake3: string;
  category: string;
  reason: string;
  classification: LocalSharingClassification;
  file_path?: string | null;
  file_index?: number | null;
  file_length?: number | null;
  created_at?: string | null;
};
type LocalSharingPolicy = {
  status: LocalSharingStatus;
  classification: LocalSharingClassification;
  label: string;
  summary: string;
  checked_at?: string | null;
  matches: LocalModerationMatch[];
};

const ACCESS_NOTIFICATIONS_KEY = "mcdf.serverAccess.notifications.v1";
const ADMIN_TOKEN_KEY = "mcdf.archive.adminToken";
const ADMIN_TOKEN_KIND_KEY = "mcdf.archive.adminToken.kind";
const UPLOAD_TOKEN_KEY = "mcdf.archive.uploadActionToken";
const LEGACY_UPLOAD_TOKEN_KEY = "mcdf.archive.uploadToken";
const EULA_VERSION = "2026-06-02-v1";
const EULA_ACCEPTED_KEY = "mcdf.eula.acceptedVersion";
const PUBLISHING_RULES_VERSION = "2026-06-02.1";
const PUBLISHING_RULES_CONTENT_ID = "publishing-rules-2026-06-02.1";
const PUBLISHING_RULES_ACCEPTED_KEY = "mcdf.publishingRules.acceptedContentId";
function hasAcceptedEula(): boolean {
  return localStorage.getItem(EULA_ACCEPTED_KEY) === EULA_VERSION;
}
function acceptEula(): void {
  localStorage.setItem(EULA_ACCEPTED_KEY, EULA_VERSION);
  window.dispatchEvent(new Event("mcdf-eula-accepted"));
}
function hasAcceptedPublishingRules(): boolean {
  return (
    localStorage.getItem(PUBLISHING_RULES_ACCEPTED_KEY) ===
    PUBLISHING_RULES_CONTENT_ID
  );
}
function acceptPublishingRules(): void {
  localStorage.setItem(
    PUBLISHING_RULES_ACCEPTED_KEY,
    PUBLISHING_RULES_CONTENT_ID,
  );
  window.dispatchEvent(new Event("mcdf-publishing-rules-accepted"));
}
function storedAdminToken(): string {
  const token = (localStorage.getItem(ADMIN_TOKEN_KEY) || "").trim();
  const kind = localStorage.getItem(ADMIN_TOKEN_KIND_KEY) || "";
  return token && kind === "admin" ? token : "";
}
function clearLocalAdminToken(): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_TOKEN_KIND_KEY);
  window.dispatchEvent(new Event("mcdf-admin-token-changed"));
}
async function validateAdminToken(value: string): Promise<boolean> {
  const token = value.trim();
  if (!token) return false;
  try {
    await invoke<AdminServerSettings>("fetch_admin_server_settings", {
      serverUrl: configuredArchiveHost(),
      bearerToken: token,
    });
    return true;
  } catch {
    return false;
  }
}
function storedUploadToken(): string {
  const explicitUploadToken = (localStorage.getItem(UPLOAD_TOKEN_KEY) || "").trim();
  if (explicitUploadToken) return explicitUploadToken;
  const legacyUploadToken = (localStorage.getItem(LEGACY_UPLOAD_TOKEN_KEY) || "").trim();
  if (legacyUploadToken) return legacyUploadToken;
  const unclassifiedToken = (localStorage.getItem(ADMIN_TOKEN_KEY) || "").trim();
  const kind = localStorage.getItem(ADMIN_TOKEN_KIND_KEY) || "";
  // Older builds stored upload tokens in the admin-token slot, which made the
  // Admin pane appear for normal uploaders. Treat unclassified legacy values as
  // upload tokens until they are explicitly saved from Settings as admin tokens.
  return unclassifiedToken && kind !== "admin" ? unclassifiedToken : "";
}
function archiveActionToken(): string | null {
  // Upload/publish flows should prefer the upload token. A stale or invalid
  // admin token must not shadow a valid uploader token and make normal
  // registry actions fail with 401. Admin-only panes still use storedAdminToken().
  const token = (storedUploadToken() || storedAdminToken()).trim();
  return token || null;
}
async function loadAdminTokenFromConfig(): Promise<string> {
  try {
    const settings = await invoke<StorageSettingsResponse>(
      "get_storage_settings",
    );
    const token = (settings.admin_token || "").trim();
    const tokenMarkedAdmin = localStorage.getItem(ADMIN_TOKEN_KIND_KEY) === "admin";
    const candidate = tokenMarkedAdmin ? token || storedAdminToken() : storedAdminToken();
    if (candidate && await validateAdminToken(candidate)) {
      localStorage.setItem(ADMIN_TOKEN_KEY, candidate);
      localStorage.setItem(ADMIN_TOKEN_KIND_KEY, "admin");
      window.dispatchEvent(new Event("mcdf-admin-token-changed"));
      return candidate;
    }
    if (candidate) {
      clearLocalAdminToken();
      saveUploadToken(candidate);
    }
    return "";
  } catch {
    const token = storedAdminToken();
    if (token && await validateAdminToken(token)) return token;
    if (token) {
      clearLocalAdminToken();
      saveUploadToken(token);
    }
    return "";
  }
}
async function saveAdminToken(value: string): Promise<void> {
  const token = value.trim();
  if (token) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    localStorage.setItem(ADMIN_TOKEN_KIND_KEY, "admin");
  } else {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KIND_KEY);
  }
  try {
    await invoke<StorageSettingsResponse>("save_storage_settings", {
      update: { admin_token: token },
    });
  } catch (error) {
    console.warn("admin token config save failed", error);
  }
  window.dispatchEvent(new Event("mcdf-admin-token-changed"));
}
function saveUploadToken(value: string): void {
  const token = value.trim();
  if (token) {
    localStorage.setItem(UPLOAD_TOKEN_KEY, token);
    localStorage.setItem(LEGACY_UPLOAD_TOKEN_KEY, token);
    if (localStorage.getItem(ADMIN_TOKEN_KIND_KEY) !== "admin") {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      localStorage.removeItem(ADMIN_TOKEN_KIND_KEY);
    }
  } else {
    localStorage.removeItem(UPLOAD_TOKEN_KEY);
    localStorage.removeItem(LEGACY_UPLOAD_TOKEN_KEY);
  }
  window.dispatchEvent(new Event("mcdf-admin-token-changed"));
  window.dispatchEvent(new Event("mcdf-upload-token-changed"));
}
function readAccessNotifications(): AccessRequestNotification[] {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(ACCESS_NOTIFICATIONS_KEY) || "[]",
    );
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function writeAccessNotifications(requests: AccessRequestNotification[]) {
  localStorage.setItem(ACCESS_NOTIFICATIONS_KEY, JSON.stringify(requests));
}

type LocalLibrarySettings = {
  libraryViewMode: BrowserDisplayMode;
  exchangeViewMode: BrowserDisplayMode;
  adultContentMode: AdultContentMode;
  dateDisplayMode: DateDisplayMode;
  libraryFolderTags: string[];
};
const LOCAL_LIBRARY_SETTINGS_KEY = "mcdf.localLibrary.settings.v1";
function normalizeLibraryFolderTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const normalized = value
    .map((tag) => String(tag).trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set<string>(normalized)).slice(0, 32);
}
function readLibrarySettings(): LocalLibrarySettings {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(LOCAL_LIBRARY_SETTINGS_KEY) || "{}",
    );
    return {
      libraryViewMode: parsed.libraryViewMode === "cards" ? "cards" : "list",
      exchangeViewMode: parsed.exchangeViewMode === "list" ? "list" : "cards",
      adultContentMode: parsed.adultContentMode === "show" ? "show" : "hide",
      dateDisplayMode: ["dmy", "ymd", "mdy", "iso"].includes(
        parsed.dateDisplayMode,
      )
        ? parsed.dateDisplayMode
        : "dmy",
      libraryFolderTags: normalizeLibraryFolderTags(parsed.libraryFolderTags),
    };
  } catch {
    return {
      libraryViewMode: "list",
      exchangeViewMode: "cards",
      adultContentMode: "hide",
      dateDisplayMode: "dmy",
      libraryFolderTags: [],
    };
  }
}
function writeLibrarySettings(settings: LocalLibrarySettings) {
  localStorage.setItem(LOCAL_LIBRARY_SETTINGS_KEY, JSON.stringify(settings));
}


type ClientDebugSettings = {
  fakeExchangeEnabled: boolean;
  fakeExchangeCount: number;
  fakeLibraryEnabled: boolean;
  fakeLibraryCount: number;
};
const CLIENT_DEBUG_SETTINGS_KEY = "mcdf.debug.clientSettings.v1";
const CLIENT_DEBUG_SETTINGS_EVENT = "mcdf-debug-settings-changed";

function clampDebugCount(value: unknown): number {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return 200;
  return Math.max(0, Math.min(1000, Math.round(numberValue)));
}

function readClientDebugSettings(): ClientDebugSettings {
  try {
    const parsed = JSON.parse(localStorage.getItem(CLIENT_DEBUG_SETTINGS_KEY) || "{}");
    return {
      fakeExchangeEnabled: Boolean(parsed.fakeExchangeEnabled),
      fakeExchangeCount: clampDebugCount(parsed.fakeExchangeCount ?? 200),
      fakeLibraryEnabled: Boolean(parsed.fakeLibraryEnabled),
      fakeLibraryCount: clampDebugCount(parsed.fakeLibraryCount ?? 200),
    };
  } catch {
    return {
      fakeExchangeEnabled: false,
      fakeExchangeCount: 200,
      fakeLibraryEnabled: false,
      fakeLibraryCount: 200,
    };
  }
}

function writeClientDebugSettings(settings: ClientDebugSettings) {
  const normalized = {
    fakeExchangeEnabled: Boolean(settings.fakeExchangeEnabled),
    fakeExchangeCount: clampDebugCount(settings.fakeExchangeCount),
    fakeLibraryEnabled: Boolean(settings.fakeLibraryEnabled),
    fakeLibraryCount: clampDebugCount(settings.fakeLibraryCount),
  };
  localStorage.setItem(CLIENT_DEBUG_SETTINGS_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event(CLIENT_DEBUG_SETTINGS_EVENT));
}

function fakeHash(seed: number): string {
  const chars = "0123456789abcdef";
  let value = "";
  for (let i = 0; i < 64; i += 1) value += chars[(seed * 17 + i * 11 + Math.floor(i / 3)) % chars.length];
  return value;
}

function fakePreviewDataUri(index: number, title: string): string {
  const hue = (index * 37) % 360;
  const accent = `hsl(${hue}, 78%, 68%)`;
  const accent2 = `hsl(${(hue + 72) % 360}, 82%, 58%)`;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 840">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#160d2f"/>
          <stop offset="0.5" stop-color="${accent}" stop-opacity="0.56"/>
          <stop offset="1" stop-color="#0b0718"/>
        </linearGradient>
        <radialGradient id="r" cx="50%" cy="32%" r="55%">
          <stop offset="0" stop-color="#fff1ff" stop-opacity="0.72"/>
          <stop offset="0.45" stop-color="${accent2}" stop-opacity="0.42"/>
          <stop offset="1" stop-color="#0b0718" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="600" height="840" fill="url(#g)"/>
      <rect width="600" height="840" fill="url(#r)"/>
      <circle cx="300" cy="252" r="104" fill="#fff7ff" opacity="0.16"/>
      <path d="M210 520 C238 390 362 390 390 520 L420 760 H180 Z" fill="#12091f" opacity="0.58"/>
      <path d="M180 670 C250 628 350 628 420 670" fill="none" stroke="#fff1ff" stroke-width="10" opacity="0.28"/>
      <text x="300" y="94" text-anchor="middle" font-family="Georgia,serif" font-size="42" fill="#fff8ff">MCDF</text>
      <text x="300" y="780" text-anchor="middle" font-family="Arial,sans-serif" font-size="26" fill="#fff8ff">${title.replace(/[<&]/g, "")}</text>
    </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function generateFakeExchangePackages(count: number): PublicIndexPackageSummary[] {
  const tags = ["glamour", "dark", "elegant", "event", "aura", "miqo", "viera", "pose", "sparkle", "archive"];
  const kinds = [["model", "texture", "material"], ["texture", "skeleton"], ["animation", "pose", "metadata"], ["model", "material", "skeleton"]];
  return Array.from({ length: clampDebugCount(count) }, (_, index) => {
    const n = index + 1;
    const hash = fakeHash(1000 + n);
    const title = `Debug Exchange Look ${String(n).padStart(3, "0")}`;
    return {
      package_hash_blake3: hash,
      share_id: `debug-${n}`,
      share_code: `debug.exchange:${hash.slice(0, 16)}`,
      original_filename: `debug-exchange-look-${String(n).padStart(3, "0")}.mcdf`,
      title,
      description: `Fake Exchange listing ${n} for layout, filtering, table, detail-pane, and card stress testing.`,
      tags: [tags[index % tags.length], tags[(index + 3) % tags.length], `set-${(index % 8) + 1}`],
      preview_image_available: true,
      preview_image_path: fakePreviewDataUri(index, title),
      preview_crop: { x: ((index % 5) - 2) * 4, y: ((index % 7) - 3) * 3, scale: 1.05 + (index % 6) * 0.04 },
      is_adult: index % 11 === 0,
      visibility: "public",
      owner_display_name: `Debug Creator ${(index % 14) + 1}`,
      owner_public_id: `debug-creator-${(index % 14) + 1}`,
      file_count: 8 + (index % 43),
      total_file_bytes: 4_000_000 + index * 187_531,
      component_kinds: kinds[index % kinds.length],
      package_manifest_path: `debug://exchange/${hash}.json`,
      download_manifest_path: `debug://exchange/${hash}/download.json`,
      updated_at: new Date(Date.now() - index * 3600_000).toISOString(),
    };
  });
}

function fakePackageRecordFromSummary(pkg: PublicIndexPackageSummary): PublicPackageRecord {
  return {
    schema_version: 1,
    generated_at: pkg.updated_at || new Date().toISOString(),
    package_hash_blake3: pkg.package_hash_blake3,
    share_id: pkg.share_id,
    share_code: pkg.share_code,
    original_filename: pkg.original_filename,
    title: pkg.title,
    description: pkg.description,
    tags: pkg.tags || [],
    preview_image_available: pkg.preview_image_available,
    preview_image_path: pkg.preview_image_path || null,
    preview_crop: pkg.preview_crop || null,
    is_adult: pkg.is_adult,
    visibility: pkg.visibility,
    owner: { display_name: pkg.owner_display_name, public_id: pkg.owner_public_id },
    parser_revision: 0,
    parser_status: "debug fake data",
    rebuild_strategy: "debug",
    container_encoding: "debug",
    validation: { decoded_content_identical: true, file_payloads_hash_verified: true, file_payload_count: pkg.file_count },
    file_count: pkg.file_count,
    total_file_bytes: pkg.total_file_bytes,
    files: Array.from({ length: Math.min(pkg.file_count, 18) }, (_, index) => ({
      index,
      payload_blake3: fakeHash(index + 5000),
      length: 32_000 + index * 8192,
      game_paths: [`chara/debug/${pkg.package_hash_blake3.slice(0, 8)}/file-${index}.bin`],
      component_kind: pkg.component_kinds[index % Math.max(1, pkg.component_kinds.length)] || "unknown",
      display_name: `Debug component ${index + 1}`,
      ghcr_ref: null,
      ghcr_digest: null,
    })),
  };
}

function generateFakeLibraryEntries(count: number): LocalMcdfEntry[] {
  const tags = ["local", "favorite", "draft", "event", "creator", "variant", "archive", "debug"];
  return Array.from({ length: clampDebugCount(count) }, (_, index) => {
    const n = index + 1;
    const title = `Debug Library Entry ${String(n).padStart(3, "0")}`;
    return {
      id: `debug-library-${n}`,
      local_path: "",
      source_type: "indexed",
      source_url: null,
      source_label: "Debug fake local entry",
      source_owner_public_id: null,
      source_owner_display_name: null,
      source_package_hash_blake3: null,
      remote_annotation: "Fake local Library entry for UI stress testing. It is not saved to your real Library.",
      missing_registry_percent: null,
      original_filename: `debug-library-entry-${String(n).padStart(3, "0")}.mcdf`,
      title,
      description: `Fake Library entry ${n} with varied tags and component counts for layout testing.`,
      tags: [tags[index % tags.length], tags[(index + 2) % tags.length], `batch-${(index % 10) + 1}`],
      preview_image_path: fakePreviewDataUri(index + 300, title),
      preview_crop: { x: ((index % 6) - 3) * 3, y: ((index % 8) - 4) * 2, scale: 1.08 + (index % 5) * 0.05 },
      is_adult: index % 13 === 0,
      visibility: "public",
      package_hash_blake3: fakeHash(7000 + n),
      file_count: 6 + (index % 36),
      total_file_bytes: 2_500_000 + index * 91_337,
      component_kinds: ["model", "texture", index % 3 === 0 ? "animation" : "material"],
      file_manifest: [],
      sharing_policy: null,
      storage_state: "offline",
      last_checked_at: new Date(Date.now() - index * 7200_000).toISOString(),
      last_published_at: null,
      manifest_url: null,
      download_url: null,
      notes: ["Debug fake data. Disable it from Admin → Debug settings."],
    };
  });
}

const STORAGE_SETUP_ACK_KEY = "mcdf.storageSetup.ack.v1";
function storageSetupAcknowledged(): boolean {
  return localStorage.getItem(STORAGE_SETUP_ACK_KEY) === "yes";
}
function acknowledgeStorageSetup() {
  localStorage.setItem(STORAGE_SETUP_ACK_KEY, "yes");
}
function isAdultByTags(tags?: unknown): boolean {
  return stringArray(tags).some((tag) =>
    ["18+", "nsfw", "adult", "explicit"].includes(tag.toLowerCase()),
  );
}
function entryIsAdult(
  entry: Pick<LocalMcdfEntry, "is_adult" | "tags">,
): boolean {
  return Boolean(entry.is_adult || isAdultByTags(entry.tags));
}
function packageIsAdult(
  pkg:
    | Pick<PublicIndexPackageSummary, "is_adult" | "tags">
    | Pick<PublicPackageRecord, "is_adult" | "tags">,
): boolean {
  return Boolean(
    (pkg as { is_adult?: boolean; tags?: string[] }).is_adult ||
    isAdultByTags((pkg as { tags?: string[] }).tags),
  );
}


type ImportedPreviewImage = {
  source_path: string;
  cached_path: string;
  bytes: number;
  blake3: string;
};

async function cachePreviewImageForLibrary(path: string): Promise<string> {
  const imported = await invoke<ImportedPreviewImage>("import_preview_image", {
    sourcePath: path,
  });
  return imported.cached_path || path;
}

function displayImageSrc(image?: string | null): string | null {
  if (!image) return null;
  const trimmed = image.trim();
  if (!trimmed) return null;
  if (/^(https?:|data:|blob:|asset:|tauri:)/i.test(trimmed)) return trimmed;
  return convertFileSrc(trimmed);
}

const DEFAULT_PREVIEW_CROP: PreviewCrop = { x: 50, y: 50, scale: 1 };

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function normalizePreviewCrop(crop?: Partial<PreviewCrop> | null): PreviewCrop {
  return {
    x: clampNumber(Number(crop?.x ?? DEFAULT_PREVIEW_CROP.x), 0, 100),
    y: clampNumber(Number(crop?.y ?? DEFAULT_PREVIEW_CROP.y), 0, 100),
    scale: clampNumber(Number(crop?.scale ?? DEFAULT_PREVIEW_CROP.scale), 1, 2.5),
  };
}

function previewImageStyle(crop?: Partial<PreviewCrop> | null): CSSProperties {
  const next = normalizePreviewCrop(crop);
  return {
    objectPosition: `${next.x}% ${next.y}%`,
    transform: `scale(${next.scale})`,
  };
}

function nudgePreviewCrop(
  crop: PreviewCrop,
  delta: Partial<Pick<PreviewCrop, "x" | "y" | "scale">>,
): PreviewCrop {
  const current = normalizePreviewCrop(crop);
  return normalizePreviewCrop({
    ...current,
    x: current.x + (delta.x ?? 0),
    y: current.y + (delta.y ?? 0),
    scale: current.scale + (delta.scale ?? 0),
  });
}

function PreviewFramingModal({
  image,
  title,
  crop,
  onApply,
  onClose,
  onChooseImage,
}: {
  image: string;
  title: string;
  crop: PreviewCrop;
  onApply: (crop: PreviewCrop) => void;
  onClose: () => void;
  onChooseImage?: () => void;
}) {
  const [workingCrop, setWorkingCrop] = useState<PreviewCrop>(() =>
    normalizePreviewCrop(crop),
  );
  const [isDraggingFrame, setIsDraggingFrame] = useState(false);
  const dragStartRef = useRef<{
    pointerId: number;
    clientX: number;
    clientY: number;
    crop: PreviewCrop;
  } | null>(null);

  useEffect(() => {
    setWorkingCrop(normalizePreviewCrop(crop));
    dragStartRef.current = null;
    setIsDraggingFrame(false);
  }, [crop.x, crop.y, crop.scale, image]);

  const startPreviewDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      crop: normalizePreviewCrop(workingCrop),
    };
    setIsDraggingFrame(true);
  };

  const movePreviewDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStartRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const deltaX = event.clientX - drag.clientX;
    const deltaY = event.clientY - drag.clientY;
    const dragScale = 0.55 / Math.max(1, drag.crop.scale);
    setWorkingCrop(
      normalizePreviewCrop({
        ...drag.crop,
        x: drag.crop.x - deltaX * dragScale,
        y: drag.crop.y - deltaY * dragScale,
      }),
    );
  };

  const finishPreviewDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStartRef.current;
    if (drag?.pointerId === event.pointerId) {
      dragStartRef.current = null;
      setIsDraggingFrame(false);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }
  };

  return (
    <div
      className="preview-framing-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        className="preview-framing-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Frame preview image"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="panel-title-row refined-modal-head">
          <div>
            <div className="eyebrow">Preview image</div>
            <h2>Frame picture</h2>
          </div>
          <button
            type="button"
            className="modal-icon-close"
            onClick={onClose}
            aria-label="Close"
          >
            <SvgIcon name="close" />
          </button>
        </div>
        <div className="preview-framing-body">
          <div
            className={`preview-framing-stage${isDraggingFrame ? " is-dragging" : ""}`}
            onPointerDown={startPreviewDrag}
            onPointerMove={movePreviewDrag}
            onPointerUp={finishPreviewDrag}
            onPointerCancel={finishPreviewDrag}
            onWheel={(event) => {
              event.preventDefault();
              const zoomStep = event.deltaY < 0 ? 0.08 : -0.08;
              setWorkingCrop((current) => nudgePreviewCrop(current, { scale: zoomStep }));
            }}
          >
            <img
              src={displayImageSrc(image) || undefined}
              alt={title}
              draggable={false}
              style={previewImageStyle(workingCrop)}
            />
            <div className="preview-frame-wheel-indicator" aria-hidden="true">
              <SvgIcon name="move" />
            </div>
            <div className="preview-frame-nudge-pad" aria-label="Move preview image">
              <button
                type="button"
                className="preview-frame-nudge preview-frame-nudge-up"
                onClick={() => setWorkingCrop((current) => nudgePreviewCrop(current, { y: -4 }))}
                aria-label="Move picture up"
              >
                <SvgIcon name="move-up" />
              </button>
              <button
                type="button"
                className="preview-frame-nudge preview-frame-nudge-left"
                onClick={() => setWorkingCrop((current) => nudgePreviewCrop(current, { x: -4 }))}
                aria-label="Move picture left"
              >
                <SvgIcon name="move" />
              </button>
              <button
                type="button"
                className="preview-frame-nudge preview-frame-nudge-right"
                onClick={() => setWorkingCrop((current) => nudgePreviewCrop(current, { x: 4 }))}
                aria-label="Move picture right"
              >
                <SvgIcon name="move" />
              </button>
              <button
                type="button"
                className="preview-frame-nudge preview-frame-nudge-down"
                onClick={() => setWorkingCrop((current) => nudgePreviewCrop(current, { y: 4 }))}
                aria-label="Move picture down"
              >
                <SvgIcon name="move-down" />
              </button>
            </div>
          </div>
        </div>
        <div className="hero-actions preview-framing-actions">
          {onChooseImage && (
            <GhostButton onClick={onChooseImage}>Choose different picture</GhostButton>
          )}
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={() => onApply(normalizePreviewCrop(workingCrop))}>
            Apply picture frame
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

type RemoteMcdfScanResult = {
  source_url: string;
  original_filename: string;
  title: string;
  description: string;
  package_hash_blake3: string;
  package_size: number;
  file_count: number;
  total_file_bytes: number;
  component_kinds: string[];
  notes: string[];
};
type LocalMcdfSourceType =
  | "local_file"
  | "google_drive"
  | "direct_url"
  | "indexed";
type LocalMcdfStorageState =
  | "offline"
  | "server"
  | "online"
  | "subscribed"
  | "removed"
  | "failed";
type McdfVisibility = "public" | "locked" | "private";
type CharacterUseConsentThemeId =
  | "comedy"
  | "action"
  | "adventure"
  | "drama"
  | "romance"
  | "horror"
  | "fantasy"
  | "sci_fi"
  | "thriller"
  | "erotic"
  | "slice_of_life"
  | "dark_themes";
type CharacterUseConsent = {
  schema_version: number;
  allowed_theme_ids: CharacterUseConsentThemeId[];
  theme_labels: string[];
  soft_enforcement: boolean;
  /** Deprecated legacy rating fields. Kept only to read older entries safely. */
  rating?: string | null;
  rating_label?: string | null;
};
const CHARACTER_USE_CONSENT_THEMES: Array<{
  id: CharacterUseConsentThemeId;
  label: string;
  description: string;
}> = [
  { id: "comedy", label: "Comedy", description: "Light-hearted, funny, or playful scenes." },
  { id: "action", label: "Action", description: "Combat, stunts, chase scenes, and dynamic poses." },
  { id: "adventure", label: "Adventure", description: "Exploration, quests, travel, and heroic moments." },
  { id: "drama", label: "Drama", description: "Emotional, serious, or story-heavy scenes." },
  { id: "romance", label: "Romance", description: "Affectionate, romantic, or couple-focused scenes." },
  { id: "horror", label: "Horror", description: "Scary, unsettling, monster, or survival scenes." },
  { id: "fantasy", label: "Fantasy", description: "Magic, myth, glamour, and high-fantasy scenes." },
  { id: "sci_fi", label: "Sci-fi", description: "Futuristic, tech, cosmic, or cyber scenes." },
  { id: "thriller", label: "Thriller", description: "Tense, mysterious, dangerous, or suspenseful scenes." },
  { id: "erotic", label: "Erotic", description: "Sensual or erotic use is acceptable." },
  { id: "slice_of_life", label: "Slice of life", description: "Casual, social, domestic, or everyday scenes." },
  { id: "dark_themes", label: "Dark themes", description: "Villain, tragedy, occult, or morally dark scenes." },
];
const CHARACTER_USE_CONSENT_THEME_IDS = CHARACTER_USE_CONSENT_THEMES.map(
  (theme) => theme.id,
);
const CHARACTER_USE_CONSENT_THEME_LABELS = Object.fromEntries(
  CHARACTER_USE_CONSENT_THEMES.map((theme) => [theme.id, theme.label]),
) as Record<CharacterUseConsentThemeId, string>;
function defaultCharacterUseConsent(): CharacterUseConsent {
  return {
    schema_version: 2,
    allowed_theme_ids: [...CHARACTER_USE_CONSENT_THEME_IDS],
    theme_labels: CHARACTER_USE_CONSENT_THEMES.map((theme) => theme.label),
    soft_enforcement: true,
  };
}
type PreviewCrop = { x: number; y: number; scale: number };
type BrowserDisplayMode = "list" | "cards";
type AdultContentMode = "hide" | "show";
type DateDisplayMode = "dmy" | "ymd" | "mdy" | "iso";
type LocalMcdfEntry = {
  id: string;
  local_path: string;
  source_type?: LocalMcdfSourceType;
  source_url?: string | null;
  source_label?: string | null;
  source_owner_public_id?: string | null;
  source_owner_display_name?: string | null;
  source_package_hash_blake3?: string | null;
  remote_annotation?: string | null;
  missing_registry_percent?: number | null;
  original_filename: string;
  title: string;
  description: string;
  tags: string[];
  preview_image_path?: string | null;
  preview_crop?: PreviewCrop | null;
  is_adult?: boolean;
  visibility?: McdfVisibility;
  character_use_consent?: CharacterUseConsent | null;
  package_hash_blake3?: string | null;
  file_count: number;
  total_file_bytes: number;
  component_kinds: string[];
  file_manifest?: LocalFileManifestEntry[];
  sharing_policy?: LocalSharingPolicy | null;
  storage_state: LocalMcdfStorageState;
  last_checked_at?: string | null;
  last_published_at?: string | null;
  manifest_url?: string | null;
  download_url?: string | null;
  notes: string[];
};

type McdfAddDraft = {
  path: string;
  fileName: string;
  info: MCDFInfo;
  files: ExtractedFileInfo[];
  title: string;
  description: string;
  tags: string;
  previewPath: string | null;
  previewCrop: PreviewCrop;
  isAdult: boolean;
  visibility: McdfVisibility;
  characterUseConsent?: CharacterUseConsent;
  sourceType?: LocalMcdfSourceType;
  sourceUrl?: string | null;
  sourceLabel?: string | null;
  remoteAnnotation?: string | null;
  packageHash?: string | null;
  fileCount?: number;
  totalBytes?: number;
  componentKinds?: string[];
  notes?: string[];
};

type FileLike = AnalyzedFileInfo | ComponentAvailability;

type PanelProps = {
  addOperation: (op: Omit<Operation, "id" | "startedAt" | "status">) => string;
  finishOperation: (id: string, patch: Partial<Operation>) => void;
  updateOperation: (id: string, patch: Partial<Operation>) => void;
};

const navSections: Array<{
  title: string;
  items: Array<{ id: Tab; label: string; icon: McdfIconName; hint: string }>;
}> = [
  {
    title: "INDEX",
    items: [
      {
        id: "library",
        label: "Library",
        icon: "library",
        hint: "Local and subscribed entries",
      },
      {
        id: "published",
        label: "The Eorzea Exchange",
        icon: "exchange",
        hint: "Search the registry",
      },
    ],
  },
  {
    title: "Advanced",
    items: [{ id: "prepare", label: "Analyze", icon: "analyze", hint: "" }],
  },
  {
    title: "System",
    items: [
      {
        id: "settings",
        label: "Settings",
        icon: "settings",
        hint: "Cache and build info",
      },
      {
        id: "admin",
        label: "Admin",
        icon: "admin",
        hint: "Moderation and ownership",
      },
    ],
  },
];

const MCDF_REGISTRY_URL = "http://mcdf.thebigtree.life:48443";
const PUBLIC_INDEX_LATEST_URL =
  "https://raw.githubusercontent.com/obscure-crescent/moon-sparkles/main/public/indexes/latest.json";
const DEFAULT_ARCHIVE_HOST = MCDF_REGISTRY_URL;
const SHARED_ARCHIVE_HOST = MCDF_REGISTRY_URL;

type ConnectivityState = "checking" | "online" | "offline" | "degraded";

type ConnectivityStatus = {
  state: ConnectivityState;
  label: string;
  detail: string;
  checkedAt?: string;
};

function configuredArchiveHost(): string {
  return MCDF_REGISTRY_URL;
}

function displayNameToUsername(value: string): string {
  return (
    (value || "publisher")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "publisher"
  );
}

function formatDate(
  value?: string | null,
  mode: DateDisplayMode = readLibrarySettings().dateDisplayMode,
): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  if (mode === "iso") return parsed.toISOString().slice(0, 10);
  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = String(parsed.getFullYear());
  if (mode === "ymd") return `${year}-${month}-${day}`;
  if (mode === "mdy") return `${month}-${day}-${year}`;
  return `${day}-${month}-${year}`;
}

function formatBytes(value?: number): string {
  if (value === undefined || !Number.isFinite(value)) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}
function shortHash(value?: string | null): string {
  if (!value) return "—";
  return value.length <= 18
    ? value
    : `${value.slice(0, 10)}…${value.slice(-8)}`;
}
function hasStoredClientAuth(): boolean {
  return Boolean(
    localStorage.getItem("mcdf.publisher.privateKey.pkcs8") &&
    localStorage.getItem("mcdf.publisher.publicKey.spki") &&
    localStorage.getItem("mcdf.publisher.certificate"),
  );
}
function storedPublisherDisplayName(): string {
  return (
    localStorage.getItem("mcdf.publisher.displayName") ||
    localStorage.getItem("mcdf.publisher.username") ||
    "Not Registered"
  );
}
function storedPublisherPublicId(): string {
  return displayNameToUsername(
    localStorage.getItem("mcdf.publisher.username") ||
      localStorage.getItem("mcdf.publisher.displayName") ||
      "",
  );
}
function ownerIdentityKey(value?: string | null): string {
  const trimmed = (value || "").trim().toLowerCase();
  if (!trimmed) return "";
  return trimmed.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function currentPublisherOwnerKey(): string {
  return ownerIdentityKey(storedPublisherProofId()) || ownerIdentityKey(storedPublisherPublicId());
}
function storedPublisherPermissions(
  connected: boolean,
  authorized: boolean,
): string {
  if (!authorized) return "";
  const isAdmin = Boolean(storedAdminToken().trim());
  const isUploader = Boolean(storedUploadToken().trim());
  const role = isAdmin ? "Admin · uploader" : isUploader ? "Uploader" : "Publisher";
  return connected ? `${role} · connected` : `${role} · ready`;
}

function readPublicProfile() {
  return {
    displayName: localStorage.getItem("mcdf.publisher.displayName") || "",
    username: localStorage.getItem("mcdf.publisher.username") || "",
    flair: localStorage.getItem("mcdf.publisher.flair") || "",
    website: localStorage.getItem("mcdf.publisher.website") || "",
    image: localStorage.getItem("mcdf.publisher.profileImage") || "",
    registeredAt: localStorage.getItem("mcdf.publisher.registeredAt") || "",
    publicKey: localStorage.getItem("mcdf.publisher.publicKey.spki") || "",
    certificate: localStorage.getItem("mcdf.publisher.certificate") || "",
  };
}

function savePublicProfile(profile: ReturnType<typeof readPublicProfile>) {
  localStorage.setItem(
    "mcdf.publisher.displayName",
    profile.displayName.trim(),
  );
  localStorage.setItem(
    "mcdf.publisher.username",
    (
      profile.username.trim() ||
      displayNameToUsername(profile.displayName || "publisher")
    ).toLowerCase(),
  );
  localStorage.setItem("mcdf.publisher.flair", profile.flair.trim());
  localStorage.setItem("mcdf.publisher.website", profile.website.trim());
  localStorage.setItem("mcdf.publisher.profileImage", profile.image.trim());
  if (!profile.registeredAt && hasStoredClientAuth())
    localStorage.setItem(
      "mcdf.publisher.registeredAt",
      new Date().toISOString(),
    );
  window.dispatchEvent(new Event("mcdf-client-auth-changed"));
}

type StoredPublisherCertificate = {
  publisher_id?: unknown;
  username?: unknown;
  display_name?: unknown;
};

function parsePublisherIdFromCertificate(certificate: string | null): string | null {
  const value = certificate?.trim();
  if (!value) return null;
  const match = value.match(
    /-----BEGIN MCDF PUBLISHER CERTIFICATE-----([\s\S]*?)-----END MCDF PUBLISHER CERTIFICATE-----/,
  );
  const jsonText = (match ? match[1] : value).trim();
  try {
    const parsed = JSON.parse(jsonText) as StoredPublisherCertificate;
    const publisherId = String(parsed.publisher_id || "").trim();
    if (publisherId) return publisherId;
  } catch {
    const fallback = jsonText.match(/"publisher_id"\s*:\s*"([^"]+)"/);
    if (fallback?.[1]?.trim()) return fallback[1].trim();
  }
  return null;
}

function storedPublisherProofId(): string | null {
  const stored = localStorage.getItem("mcdf.publisher.publisherId")?.trim();
  if (stored) return stored;
  const certificatePublisherId = parsePublisherIdFromCertificate(
    localStorage.getItem("mcdf.publisher.certificate"),
  );
  if (certificatePublisherId) {
    localStorage.setItem("mcdf.publisher.publisherId", certificatePublisherId);
    return certificatePublisherId;
  }
  return (
    localStorage.getItem("mcdf.publisher.username") ||
    localStorage.getItem("mcdf.publisher.displayName") ||
    null
  );
}

function localPublisherAuthHeaders() {
  const publisherCertificate = localStorage.getItem("mcdf.publisher.certificate") || null;
  return {
    // Owner edit/delete must use the stable publisher id from the server-issued
    // certificate, not the editable profile username/display name. Otherwise a
    // harmless profile rename can make entries created by this client look like
    // they belong to another owner.
    publisherId: storedPublisherProofId(),
    publisherDisplayName:
      localStorage.getItem("mcdf.publisher.displayName") ||
      localStorage.getItem("mcdf.publisher.username") ||
      null,
    publisherPublicKey:
      localStorage.getItem("mcdf.publisher.publicKey.spki") || null,
    publisherCertificate,
  };
}
function serviceLockedMessage(connected: boolean): string | null {
  return connected
    ? null
    : "Connect to the archive server to use this server-side action.";
}
const CREATOR_SUBSCRIPTIONS_KEY = "mcdf.exchange.creatorSubscriptions.v1";
const PACKAGE_SUBSCRIPTIONS_KEY = "mcdf.exchange.packageSubscriptions.v1";
function readCreatorSubscriptions(): string[] {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(CREATOR_SUBSCRIPTIONS_KEY) || "[]",
    );
    return stringArray(parsed);
  } catch {
    return [];
  }
}
function writeCreatorSubscriptions(ids: string[]) {
  localStorage.setItem(CREATOR_SUBSCRIPTIONS_KEY, JSON.stringify(stringArray(ids)));
}
function readPackageSubscriptions(): string[] {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(PACKAGE_SUBSCRIPTIONS_KEY) || "[]",
    );
    return stringArray(parsed);
  } catch {
    return [];
  }
}
function writePackageSubscriptions(ids: string[]) {
  localStorage.setItem(PACKAGE_SUBSCRIPTIONS_KEY, JSON.stringify(stringArray(ids)));
}
type PackageSubscriptionSnapshot = {
  package_hash_blake3: string;
  subscribed_at: string;
  original_filename: string;
  title: string;
  description?: string;
  tags?: string[];
  preview_image_path?: string | null;
  preview_crop?: PreviewCrop | null;
  is_adult?: boolean;
  visibility?: McdfVisibility;
  character_use_consent?: CharacterUseConsent | null;
  owner_public_id?: string | null;
  owner_display_name?: string | null;
  file_count: number;
  total_file_bytes: number;
  component_kinds?: string[];
  package_manifest_path?: string | null;
  download_manifest_path?: string | null;
  updated_at?: string | null;
};
const PACKAGE_SUBSCRIPTION_SNAPSHOTS_KEY =
  "mcdf.exchange.packageSubscriptionSnapshots.v1";
function readPackageSubscriptionSnapshots(): Record<
  string,
  PackageSubscriptionSnapshot
> {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(PACKAGE_SUBSCRIPTION_SNAPSHOTS_KEY) || "{}",
    );
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.entries(parsed).reduce<Record<string, PackageSubscriptionSnapshot>>(
      (result, [hash, value]) => {
        const snapshot = normalizePackageSubscriptionSnapshot(value, hash);
        if (snapshot) result[snapshot.package_hash_blake3] = snapshot;
        return result;
      },
      {},
    );
  } catch {
    return {};
  }
}
function writePackageSubscriptionSnapshots(
  snapshots: Record<string, PackageSubscriptionSnapshot>,
) {
  localStorage.setItem(
    PACKAGE_SUBSCRIPTION_SNAPSHOTS_KEY,
    JSON.stringify(snapshots),
  );
}
function packageSnapshotFromIndex(
  pkg: PublicIndexPackageSummary | PublicPackageRecord,
): PackageSubscriptionSnapshot {
  const summary = pkg as Partial<PublicIndexPackageSummary>;
  const record = pkg as Partial<PublicPackageRecord>;
  const packageHash = safeString(pkg.package_hash_blake3);
  const originalFilename = safeString(pkg.original_filename || pkg.title, `${packageHash || "exchange"}.mcdf`);
  return {
    package_hash_blake3: packageHash,
    subscribed_at: new Date().toISOString(),
    original_filename: originalFilename,
    title: safeString(pkg.title || originalFilename, originalFilename),
    description: safeString(pkg.description),
    tags: stringArray(pkg.tags),
    preview_image_path: nullableString(pkg.preview_image_path),
    preview_crop: normalizePreviewCropValue(pkg.preview_crop),
    is_adult: Boolean(pkg.is_adult),
    visibility: normalizeMcdfVisibilityValue(pkg.visibility),
    character_use_consent: packageCharacterUseConsentValue(pkg),
    owner_public_id: nullableString(summary.owner_public_id || record.owner?.public_id),
    owner_display_name: nullableString(summary.owner_display_name || record.owner?.display_name),
    file_count: finiteNumber(pkg.file_count),
    total_file_bytes: finiteNumber(pkg.total_file_bytes),
    component_kinds: stringArray(summary.component_kinds),
    package_manifest_path: nullableString(summary.package_manifest_path),
    download_manifest_path: nullableString(summary.download_manifest_path),
    updated_at: nullableString(summary.updated_at),
  };
}
function normalizePackageSubscriptionSnapshot(
  value: unknown,
  fallbackHash?: string,
): PackageSubscriptionSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const snapshot = value as Partial<PackageSubscriptionSnapshot>;
  const packageHash = safeString(snapshot.package_hash_blake3 || fallbackHash);
  if (!packageHash) return null;
  const originalFilename = safeString(snapshot.original_filename || snapshot.title, `${packageHash.slice(0, 12)}.mcdf`);
  return {
    package_hash_blake3: packageHash,
    subscribed_at: safeString(snapshot.subscribed_at, new Date().toISOString()),
    original_filename: originalFilename,
    title: safeString(snapshot.title || originalFilename, originalFilename),
    description: safeString(snapshot.description),
    tags: stringArray(snapshot.tags),
    preview_image_path: nullableString(snapshot.preview_image_path),
    preview_crop: normalizePreviewCropValue(snapshot.preview_crop),
    is_adult: Boolean(snapshot.is_adult),
    visibility: normalizeMcdfVisibilityValue(snapshot.visibility),
    character_use_consent: normalizeCharacterUseConsentValue(snapshot.character_use_consent),
    owner_public_id: nullableString(snapshot.owner_public_id),
    owner_display_name: nullableString(snapshot.owner_display_name),
    file_count: finiteNumber(snapshot.file_count),
    total_file_bytes: finiteNumber(snapshot.total_file_bytes),
    component_kinds: stringArray(snapshot.component_kinds),
    package_manifest_path: nullableString(snapshot.package_manifest_path),
    download_manifest_path: nullableString(snapshot.download_manifest_path),
    updated_at: nullableString(snapshot.updated_at),
  };
}
function rememberPackageSubscriptionSnapshot(
  pkg: PublicIndexPackageSummary | PublicPackageRecord,
) {
  const snapshot = packageSnapshotFromIndex(pkg);
  if (!snapshot.package_hash_blake3) return;
  const snapshots = readPackageSubscriptionSnapshots();
  snapshots[snapshot.package_hash_blake3] = snapshot;
  writePackageSubscriptionSnapshots(snapshots);
}
function removePackageSubscriptionSnapshot(packageHash: string) {
  const snapshots = readPackageSubscriptionSnapshots();
  if (snapshots[packageHash]) {
    delete snapshots[packageHash];
    writePackageSubscriptionSnapshots(snapshots);
  }
}
type CreatorPackageIdentity = {
  owner_public_id?: string | null;
  owner_display_name?: string | null;
  owner?: { public_id?: string | null; display_name?: string | null } | null;
};
function creatorKeyFromPackage(pkg: CreatorPackageIdentity): string {
  return safeString(
    pkg.owner_public_id ||
      pkg.owner?.public_id ||
      pkg.owner_display_name ||
      pkg.owner?.display_name,
    "unknown",
  );
}
function creatorLabelFromPackage(pkg: CreatorPackageIdentity): string {
  return safeString(
    pkg.owner_display_name ||
      pkg.owner?.display_name ||
      pkg.owner_public_id ||
      pkg.owner?.public_id,
    "Unknown creator",
  );
}
const LOCAL_LIBRARY_STORAGE_KEY = "mcdf.localLibrary.entries.v1";
function readLocalMcdfLibrary(): LocalMcdfEntry[] {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(LOCAL_LIBRARY_STORAGE_KEY) || "[]",
    );
    return Array.isArray(parsed)
      ? parsed
          .map((entry) => normalizeLocalMcdfEntry(entry))
          .filter((entry): entry is LocalMcdfEntry => Boolean(entry))
      : [];
  } catch {
    return [];
  }
}
function writeLocalMcdfLibrary(entries: LocalMcdfEntry[]) {
  localStorage.setItem(LOCAL_LIBRARY_STORAGE_KEY, JSON.stringify(entries));
}
function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[;,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}
function safeString(value: unknown, fallback = ""): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}
function nullableString(value: unknown): string | null {
  const text = safeString(value);
  return text || null;
}
function finiteNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function normalizeLocalSourceType(value: unknown, fallback: LocalMcdfSourceType): LocalMcdfSourceType {
  return value === "local_file" || value === "google_drive" || value === "direct_url" || value === "indexed"
    ? value
    : fallback;
}
function normalizeLocalStorageState(value: unknown): LocalMcdfStorageState {
  return value === "offline" || value === "server" || value === "online" || value === "subscribed" || value === "removed" || value === "failed"
    ? value
    : "offline";
}
function normalizeMcdfVisibilityValue(value: unknown): McdfVisibility {
  return value === "locked" || value === "private" || value === "public" ? value : "public";
}
function normalizePreviewCropValue(value: unknown): PreviewCrop | null {
  if (!value || typeof value !== "object") return null;
  const crop = value as Partial<PreviewCrop>;
  return normalizePreviewCrop({
    x: finiteNumber(crop.x, 0),
    y: finiteNumber(crop.y, 0),
    scale: finiteNumber(crop.scale, 1),
  });
}
function normalizeConsentThemeIds(value: unknown): CharacterUseConsentThemeId[] {
  const rawIds = Array.isArray(value) ? value : [];
  const valid = new Set(CHARACTER_USE_CONSENT_THEME_IDS);
  const ids = rawIds
    .map((item) => String(item).trim().toLowerCase().replace(/[-\s]+/g, "_"))
    .filter((item): item is CharacterUseConsentThemeId =>
      valid.has(item as CharacterUseConsentThemeId),
    );
  return Array.from(new Set(ids));
}
function normalizeCharacterUseConsentValue(value: unknown): CharacterUseConsent {
  if (!value || typeof value !== "object") return defaultCharacterUseConsent();
  const raw = value as Partial<CharacterUseConsent> & {
    allowed_theme_ids?: unknown;
    themes?: unknown;
    rating?: unknown;
  };
  const hasExplicitThemes = Object.prototype.hasOwnProperty.call(raw, "allowed_theme_ids") ||
    Object.prototype.hasOwnProperty.call(raw, "themes");
  let allowedThemeIds = normalizeConsentThemeIds(raw.allowed_theme_ids || raw.themes);
  // Legacy rating-based consent did not name themes. Treat older entries as
  // the new default: all themes allowed unless explicit theme ids exist.
  if (!hasExplicitThemes && allowedThemeIds.length === 0) allowedThemeIds = [...CHARACTER_USE_CONSENT_THEME_IDS];
  return {
    schema_version: 2,
    allowed_theme_ids: allowedThemeIds,
    theme_labels: allowedThemeIds.map((id) => CHARACTER_USE_CONSENT_THEME_LABELS[id]),
    soft_enforcement: true,
  };
}

function packageCharacterUseConsentValue(value: unknown): CharacterUseConsent {
  if (!value || typeof value !== "object") return defaultCharacterUseConsent();
  return normalizeCharacterUseConsentValue(
    (value as { character_use_consent?: unknown }).character_use_consent,
  );
}

function consentSummary(consent: CharacterUseConsent | null | undefined): string {
  const normalized = normalizeCharacterUseConsentValue(consent);
  if (normalized.allowed_theme_ids.length === CHARACTER_USE_CONSENT_THEME_IDS.length) {
    return "All themes";
  }
  if (normalized.allowed_theme_ids.length === 0) return "No themes selected";
  const labels = normalized.theme_labels.slice(0, 3);
  const remaining = normalized.theme_labels.length - labels.length;
  return `${labels.join(", ")}${remaining > 0 ? ` +${remaining}` : ""}`;
}
function buildCharacterUseConsent(themeIds: CharacterUseConsentThemeId[]): CharacterUseConsent {
  const allowedThemeIds = normalizeConsentThemeIds(themeIds);
  return {
    schema_version: 2,
    allowed_theme_ids: allowedThemeIds,
    theme_labels: allowedThemeIds.map((id) => CHARACTER_USE_CONSENT_THEME_LABELS[id]),
    soft_enforcement: true,
  };
}
function normalizeSharingClassificationValue(
  value: unknown,
): LocalSharingClassification {
  return value === "restricted" ||
    value === "blocked_by_policy" ||
    value === "potentially_illegal" ||
    value === "allowed"
    ? value
    : "blocked_by_policy";
}
function normalizeModerationMatchValue(value: unknown): LocalModerationMatch | null {
  if (!value || typeof value !== "object") return null;
  const match = value as Partial<LocalModerationMatch>;
  const targetType = match.target_type === "package" ? "package" : "file";
  const hash = safeString(match.hash_blake3);
  if (!hash) return null;
  return {
    target_type: targetType,
    hash_blake3: hash,
    category: safeString(match.category),
    reason: safeString(match.reason, "Policy match"),
    classification: normalizeSharingClassificationValue(match.classification),
    file_path: nullableString(match.file_path),
    file_index:
      typeof match.file_index === "number" && Number.isFinite(match.file_index)
        ? match.file_index
        : null,
    file_length:
      typeof match.file_length === "number" && Number.isFinite(match.file_length)
        ? match.file_length
        : null,
    created_at: nullableString(match.created_at),
  };
}
function normalizeLocalSharingPolicyValue(value: unknown): LocalSharingPolicy | null {
  if (!value || typeof value !== "object") return null;
  const policy = value as Partial<LocalSharingPolicy>;
  const matches = Array.isArray(policy.matches)
    ? policy.matches
        .map((match) => normalizeModerationMatchValue(match))
        .filter((match): match is LocalModerationMatch => Boolean(match))
    : [];
  const status: LocalSharingStatus =
    policy.status === "blocked" || matches.length > 0 ? "blocked" : "allowed";
  if (status === "allowed") return null;
  const classification = normalizeSharingClassificationValue(policy.classification);
  return {
    status,
    classification,
    label: safeString(policy.label, sharingClassificationLabel(classification)),
    summary: safeString(
      policy.summary,
      matches.length
        ? "This entry matches a sharing policy rule."
        : "This entry is blocked by policy.",
    ),
    checked_at: nullableString(policy.checked_at),
    matches,
  };
}
function normalizeLocalMcdfEntry(value: unknown): LocalMcdfEntry | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as Partial<LocalMcdfEntry>;
  const id = safeString(entry.id || entry.package_hash_blake3 || entry.local_path);
  if (!id) return null;
  const localPath = safeString(entry.local_path);
  return {
    id,
    local_path: localPath,
    source_type: normalizeLocalSourceType(entry.source_type, localPath ? "local_file" : "indexed"),
    source_url: nullableString(entry.source_url),
    source_label: nullableString(entry.source_label),
    source_owner_public_id: nullableString(entry.source_owner_public_id),
    source_owner_display_name: nullableString(entry.source_owner_display_name),
    source_package_hash_blake3: nullableString(entry.source_package_hash_blake3),
    remote_annotation: nullableString(entry.remote_annotation),
    missing_registry_percent: typeof entry.missing_registry_percent === "number" ? entry.missing_registry_percent : null,
    original_filename: safeString(entry.original_filename || entry.title, "Untitled.mcdf"),
    title: safeString(entry.title || entry.original_filename, "Untitled MCDF"),
    description: safeString(entry.description),
    tags: stringArray(entry.tags),
    preview_image_path: nullableString(entry.preview_image_path),
    preview_crop: normalizePreviewCropValue(entry.preview_crop),
    is_adult: Boolean(entry.is_adult),
    visibility: normalizeMcdfVisibilityValue(entry.visibility),
    character_use_consent: normalizeCharacterUseConsentValue(entry.character_use_consent),
    package_hash_blake3: nullableString(entry.package_hash_blake3),
    file_count: finiteNumber(entry.file_count),
    total_file_bytes: finiteNumber(entry.total_file_bytes),
    component_kinds: stringArray(entry.component_kinds),
    file_manifest: Array.isArray(entry.file_manifest) ? entry.file_manifest : [],
    sharing_policy: normalizeLocalSharingPolicyValue(entry.sharing_policy),
    storage_state: normalizeLocalStorageState(entry.storage_state),
    last_checked_at: nullableString(entry.last_checked_at),
    last_published_at: nullableString(entry.last_published_at),
    manifest_url: nullableString(entry.manifest_url),
    download_url: nullableString(entry.download_url),
    notes: stringArray(entry.notes),
  };
}

function normalizePublicIndexPackageSummary(value: unknown): PublicIndexPackageSummary | null {
  if (!value || typeof value !== "object") return null;
  const pkg = value as Partial<PublicIndexPackageSummary>;
  const hash = safeString(pkg.package_hash_blake3);
  if (!hash) return null;
  const filename = safeString(pkg.original_filename || pkg.title, `${hash.slice(0, 12)}.mcdf`);
  return {
    package_hash_blake3: hash,
    share_id: safeString(pkg.share_id) || hash,
    share_code: safeString(pkg.share_code),
    original_filename: filename,
    title: safeString(pkg.title || filename, filename),
    description: safeString(pkg.description),
    tags: stringArray(pkg.tags),
    preview_image_available: Boolean(pkg.preview_image_available || pkg.preview_image_path),
    preview_image_path: nullableString(pkg.preview_image_path),
    preview_crop: normalizePreviewCropValue(pkg.preview_crop),
    is_adult: Boolean(pkg.is_adult),
    visibility: safeString(pkg.visibility, "public"),
    character_use_consent: normalizeCharacterUseConsentValue(pkg.character_use_consent),
    owner_display_name: safeString(pkg.owner_display_name, "Unknown creator"),
    owner_public_id: safeString(pkg.owner_public_id || pkg.owner_display_name, "unknown"),
    file_count: finiteNumber(pkg.file_count),
    total_file_bytes: finiteNumber(pkg.total_file_bytes),
    component_kinds: stringArray(pkg.component_kinds),
    package_manifest_path: safeString(pkg.package_manifest_path),
    download_manifest_path: safeString(pkg.download_manifest_path),
    updated_at: safeString(pkg.updated_at),
  };
}
function localEntryHasLocalFile(entry: LocalMcdfEntry | null | undefined): boolean {
  return Boolean(
    entry &&
      entry.local_path &&
      entry.storage_state !== "subscribed" &&
      entry.storage_state !== "removed",
  );
}
function localEntryId(path: string): string {
  return `local-${btoa(unescape(encodeURIComponent(path)))
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 32)}`;
}
function basename(path: string): string {
  return path.split(/[\\/]/).pop() || path;
}
function safeDownloadFilename(name: string): string {
  const trimmed = (name || "download.mcdf").replace(/\.mcdf$/i, "").trim();
  const safe = trimmed.replace(/[<>:"\/\\|?*\u0000-\u001F]+/g, "-").replace(/\s+/g, " ").slice(0, 96).trim();
  return `${safe || "download"}.mcdf`;
}
function stateLabel(state: LocalMcdfStorageState): string {
  if (state === "online") return "online";
  if (state === "server") return "not listed";
  if (state === "subscribed") return "sync needed";
  if (state === "removed") return "removed from Exchange";
  if (state === "failed") return "needs attention";
  return "on device";
}
function visibilityLabel(visibility?: McdfVisibility): string {
  if (visibility === "locked") return "locked";
  if (visibility === "private") return "private";
  return "public";
}
function visibilityClass(visibility?: McdfVisibility): string {
  if (visibility === "locked") return "status-warn";
  if (visibility === "private") return "status-bad";
  return "status-good";
}
function stateClass(state: LocalMcdfStorageState): string {
  if (state === "online") return "status-good";
  if (state === "server") return "status-warn";
  if (state === "subscribed") return "status-warn";
  if (state === "removed") return "status-bad";
  if (state === "failed") return "status-bad";
  return "status-neutral";
}
function kindsFromExtractedFiles(files: ExtractedFileInfo[]): string[] {
  return Array.from(
    new Set(files.map((file) => inferComponentKind(file)).filter(Boolean)),
  ).slice(0, 8);
}
function sourceLabel(entry: LocalMcdfEntry): string {
  if (entry.source_type === "google_drive") return "Google Drive source";
  if (entry.source_type === "direct_url") return "Remote source";
  if (entry.source_type === "indexed")
    return entry.storage_state === "removed"
      ? "Removed Exchange item"
      : entry.storage_state === "subscribed"
        ? "Subscribed Exchange item"
        : "Index-only source";
  return "Device file";
}
function compactSourceLabel(entry: LocalMcdfEntry): string {
  if (entry.source_type === "google_drive") return "Google Drive";
  if (entry.source_type === "direct_url") return "Remote";
  if (entry.source_type === "indexed") return "Index";
  return "Device";
}
function packageLabelsFromKinds(kinds?: unknown): string[] {
  return Array.from(new Set(stringArray(kinds))).slice(0, 8);
}
function fileManifestFromExtractedFiles(
  files: ExtractedFileInfo[],
): LocalFileManifestEntry[] {
  return files.map((file) => ({
    index: file.index,
    game_paths: file.game_paths || [],
    length: file.length,
    payload_blake3: file.blake3,
  }));
}
function sharingClassificationFromBlockCategory(
  category?: string | null,
): LocalSharingClassification {
  const value = (category || "").toLowerCase();
  if (/illegal|minor|age-ambiguous|malware|abuse|privacy|doxxing/.test(value))
    return "potentially_illegal";
  if (/copyright|paid|creator|proprietary|rights/.test(value))
    return "restricted";
  return "blocked_by_policy";
}
function sharingClassificationLabel(
  classification: LocalSharingClassification,
): string {
  if (classification === "potentially_illegal") return "Potentially illegal";
  if (classification === "restricted") return "Restricted";
  if (classification === "blocked_by_policy") return "Blocked by policy";
  return "Can share";
}
function sharingClassificationClass(
  classification: LocalSharingClassification,
): string {
  if (classification === "potentially_illegal") return "status-bad";
  if (classification === "blocked_by_policy") return "status-bad";
  if (classification === "restricted") return "status-warn";
  return "status-neutral";
}
function sharingPolicyClass(policy?: LocalSharingPolicy | null): string {
  return sharingClassificationClass(policy?.classification || "allowed");
}
function sharingPolicyLabel(
  entry: Pick<LocalMcdfEntry, "sharing_policy">,
): string {
  return entry.sharing_policy?.status === "blocked"
    ? "Disallowed"
    : "Can share";
}
function sharingPolicyDetailLabel(
  entry: Pick<LocalMcdfEntry, "sharing_policy">,
): string {
  return entry.sharing_policy?.label || "No sharing block";
}
function sharingReasonFile(
  entry: Pick<LocalMcdfEntry, "sharing_policy">,
): string {
  const match =
    entry.sharing_policy?.matches?.find(
      (item) => item.target_type === "file",
    ) || entry.sharing_policy?.matches?.[0];
  if (!entry.sharing_policy || entry.sharing_policy.status === "allowed")
    return "—";
  if (!match) return "Policy block";
  if (match.target_type === "package")
    return `Package ${shortHash(match.hash_blake3)}`;
  return `${match.file_path || "Unknown file"} · ${shortHash(match.hash_blake3)}`;
}
function sharingPolicyForEntry(
  entry: LocalMcdfEntry,
  blocklist: ModerationBlocklistResponse,
  checkedAt = new Date().toISOString(),
): LocalSharingPolicy {
  const packageBlocks = new Map<string, ModerationBlockEntry>();
  const fileBlocks = new Map<string, ModerationBlockEntry>();
  for (const block of blocklist.entries || []) {
    const target = (block.target_type || "").toLowerCase();
    if (target === "package") packageBlocks.set(block.hash_blake3, block);
    if (target === "file" || target === "layer")
      fileBlocks.set(block.hash_blake3, block);
  }
  const matches: LocalModerationMatch[] = [];
  if (
    entry.package_hash_blake3 &&
    packageBlocks.has(entry.package_hash_blake3)
  ) {
    const block = packageBlocks.get(entry.package_hash_blake3)!;
    const classification = sharingClassificationFromBlockCategory(
      block.category,
    );
    matches.push({
      target_type: "package",
      hash_blake3: block.hash_blake3,
      category: block.category,
      reason: block.reason,
      classification,
      file_path: null,
      file_index: null,
      file_length: null,
      created_at: block.created_at,
    });
  }
  for (const file of entry.file_manifest || []) {
    const block = fileBlocks.get(file.payload_blake3);
    if (!block) continue;
    const classification = sharingClassificationFromBlockCategory(
      block.category,
    );
    matches.push({
      target_type: "file",
      hash_blake3: block.hash_blake3,
      category: block.category,
      reason: block.reason,
      classification,
      file_path: file.game_paths?.[0] || null,
      file_index: file.index,
      file_length: file.length,
      created_at: block.created_at,
    });
  }
  if (matches.length === 0) {
    return {
      status: "allowed",
      classification: "allowed",
      label: "Can share",
      summary: "No moderation block matched the package or stored file hashes.",
      checked_at: checkedAt,
      matches: [],
    };
  }
  const strongest = matches.some(
    (match) => match.classification === "potentially_illegal",
  )
    ? "potentially_illegal"
    : matches.some((match) => match.classification === "blocked_by_policy")
      ? "blocked_by_policy"
      : "restricted";
  return {
    status: "blocked",
    classification: strongest,
    label: sharingClassificationLabel(strongest),
    summary: `${matches.length} moderation ${matches.length === 1 ? "match" : "matches"} block sharing or upload.`,
    checked_at: checkedAt,
    matches,
  };
}
function localEntryManualTags(entry: Pick<LocalMcdfEntry, "tags">): string[] {
  return Array.from(new Set(stringArray(entry.tags))).slice(0, 8);
}
function localEntrySystemLabels(
  entry: Pick<LocalMcdfEntry, "component_kinds" | "sharing_policy">,
): string[] {
  const labels = packageLabelsFromKinds(entry.component_kinds);
  if (entry.sharing_policy && entry.sharing_policy.classification !== "allowed")
    labels.unshift(entry.sharing_policy.label);
  return Array.from(new Set(labels)).slice(0, 10);
}
function exchangePackageTags(
  pkg:
    | Pick<PublicIndexPackageSummary, "tags">
    | Pick<PublicPackageRecord, "tags">,
): string[] {
  return Array.from(
    new Set(((pkg as { tags?: string[] }).tags || []).filter(Boolean)),
  ).slice(0, 8);
}
function exchangePackageLabels(
  pkg: Pick<PublicIndexPackageSummary, "component_kinds"> | PublicPackageRecord,
): string[] {
  if ("component_kinds" in pkg)
    return packageLabelsFromKinds(pkg.component_kinds);
  return packageLabelsFromKinds(
    Array.from(
      new Set(
        pkg.files
          .map((file) => file.component_kind || "Component")
          .filter(Boolean),
      ),
    ),
  );
}
function friendlyPublishNotes(entry: LocalMcdfEntry): string[] {
  if (entry.sharing_policy && entry.sharing_policy.status !== "allowed")
    return [`${entry.sharing_policy.label}: ${entry.sharing_policy.summary}`];
  if (entry.storage_state === "failed")
    return [
      "Publishing needs attention. Open the connection settings and try publishing again.",
    ];
  if (!entry.last_published_at && entry.notes.length === 0) return [];
  const notes = entry.notes.join(" ").toLowerCase();
  const result: string[] = [];
  if (entry.last_published_at)
    result.push(`Publish on: ${formatDate(entry.last_published_at)}.`);
  if (entry.storage_state === "online")
    result.push("Visible in The Eorzea Exchange public index.");
  if (entry.storage_state === "server")
    result.push(
      "Saved locally/server-side but not currently listed in The Eorzea Exchange.",
    );
  if (/index sync failed|sync failed|push failed/.test(notes))
    result.push(
      "The package was saved, but the public index did not update yet.",
    );
  if (/deduplicat|already|existing/.test(notes))
    result.push(
      "Some files were already known, so only missing parts needed handling.",
    );
  return Array.from(new Set(result)).slice(0, 4);
}
function sourceClass(entry: LocalMcdfEntry): string {
  if (entry.source_type === "local_file" || !entry.source_type)
    return "status-neutral";
  return "status-warn";
}
function isRemoteEntry(entry: LocalMcdfEntry): boolean {
  return Boolean(entry.source_url && entry.source_type !== "local_file");
}
function remoteSourceTypeFromUrl(url: string): LocalMcdfSourceType {
  return /drive\.google\.com/i.test(url) ? "google_drive" : "direct_url";
}

function notifyClientAuthChanged() {
  window.dispatchEvent(new Event("mcdf-client-auth-changed"));
}
function statusLabel(status?: string | null): string {
  if (status === "not_checked") return "not checked";
  if (status === "present") return "known";
  if (status === "missing") return "missing";
  if (status === "unknown") return "unknown";
  return (status || "not_checked").replace(/_/g, " ");
}
function filePrimaryPath(file: FileLike): string {
  return file.game_paths?.[0] || "unknown path";
}
function fileBlake3(file: FileLike): string {
  if ("payload_blake3" in file) return file.payload_blake3;
  return file.blake3;
}
function fileMcdfHash(file: FileLike): string {
  if ("mcdf_hash" in file) return file.mcdf_hash;
  return file.hash;
}
function fileOffset(file: FileLike): number | undefined {
  if ("offset" in file) return file.offset;
  return undefined;
}
function fileStatus(file: FileLike): string {
  if ("online_status" in file) return file.online_status ?? "not_checked";
  return "not_checked";
}
function fileNotes(file: FileLike): string[] {
  return "notes" in file ? (file.notes ?? []) : [];
}
function inferComponentKind(file: Pick<FileLike, "game_paths">): string {
  const joined = file.game_paths.join(" ").toLowerCase();
  if (
    joined.includes("animation") ||
    joined.endsWith(".pap") ||
    joined.endsWith(".tmb")
  )
    return "Animation";
  if (
    joined.endsWith(".tex") ||
    joined.endsWith(".atex") ||
    joined.includes("/texture/")
  )
    return "Texture";
  if (joined.endsWith(".mtrl") || joined.includes("/material/"))
    return "Material";
  if (joined.endsWith(".mdl") || joined.includes("/model/")) return "Model";
  if (joined.endsWith(".sklb") || joined.includes("skeleton"))
    return "Skeleton";
  if (joined.includes("tail")) return "Tail / Feature";
  if (joined.includes("hair")) return "Hair";
  if (joined.includes("face") || joined.includes("head")) return "Face";
  return "Other";
}

function iconForComponentKind(kind: string): McdfIconName {
  const normalized = kind.toLowerCase();
  if (normalized.includes("texture")) return "texture";
  if (normalized.includes("material")) return "material";
  if (normalized.includes("model")) return "model";
  if (normalized.includes("skeleton")) return "skeleton";
  if (normalized.includes("animation")) return "animation";
  if (normalized.includes("pose")) return "pose";
  if (normalized.includes("hash")) return "hash-chunk";
  if (normalized.includes("metadata")) return "metadata";
  if (normalized.includes("mcdf") || normalized.includes("package")) return "mcdf-package";
  return "unknown";
}

function probeComponentKind(file: ExtractedFileInfo): string {
  return (
    inferComponentKind(file)
      .toLowerCase()
      .replace(/\s*\/\s*/g, "_")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "binary"
  );
}
function guessMediaTypeFromPaths(paths: string[]): string {
  const joined = paths.join(" ").toLowerCase();
  if (joined.endsWith(".tex") || joined.endsWith(".atex"))
    return "application/x-ffxiv-texture";
  if (joined.endsWith(".mdl")) return "application/x-ffxiv-model";
  if (joined.endsWith(".mtrl")) return "application/x-ffxiv-material";
  if (joined.endsWith(".sklb")) return "application/x-ffxiv-skeleton";
  if (joined.endsWith(".pap") || joined.endsWith(".tmb"))
    return "application/x-ffxiv-animation";
  return "application/octet-stream";
}
function progressLabel(progress: AnalyzeProgress | null): string {
  if (!progress) return "Waiting for an MCDF file.";
  const counts = progress.total
    ? progress.known !== undefined || progress.missing !== undefined
      ? ` · ${progress.known ?? 0} known, ${progress.missing ?? 0} missing, ${progress.total} total`
      : ` · ${progress.total} hashes`
    : "";
  return `${progress.detail}${counts}`;
}
async function probeKnownFiles(
  files: ExtractedFileInfo[],
): Promise<FileProbeResponse | null> {
  const token = archiveActionToken();
  if (!token) return null;
  const publisher = localPublisherAuthHeaders();
  return await invoke<FileProbeResponse>("probe_mcdf_hash_manifest", {
    serverUrl: configuredArchiveHost(),
    bearerToken: token,
    publisherId: publisher.publisherId,
    publisherDisplayName: publisher.publisherDisplayName,
    publisherPublicKey: publisher.publisherPublicKey,
    publisherCertificate: publisher.publisherCertificate,
    files,
  });
}
function applyProbeStatus(
  files: ExtractedFileInfo[],
  probe: FileProbeResponse | null,
): AnalyzedFileInfo[] {
  if (!probe)
    return files.map((file) => ({
      ...file,
      online_status: "not_checked",
      central_status: "unknown",
      notes: [
        "Hash calculated locally. The registry has not been checked yet.",
      ],
    }));
  const known = new Set(probe.known_files.map((file) => file.payload_blake3));
  const missing = new Set(
    probe.missing_files.map((file) => file.payload_blake3),
  );
  return files.map((file) =>
    known.has(file.blake3)
      ? {
          ...file,
          online_status: "present",
          central_status: "present",
          notes: [
            "This BLAKE3 payload hash is already known by the archive server.",
          ],
        }
      : missing.has(file.blake3)
        ? {
            ...file,
            online_status: "missing",
            central_status: "missing",
            notes: [
              "This BLAKE3 payload hash is not present on the archive server yet.",
            ],
          }
        : {
            ...file,
            online_status: "unknown",
            central_status: "unknown",
            notes: [
              "The archive server did not return a status for this hash.",
            ],
          },
  );
}

function groupedFiles(files: FileLike[]): Array<{
  kind: string;
  files: FileLike[];
  bytes: number;
  online: number;
  missing: number;
  notChecked: number;
}> {
  const map = new Map<string, FileLike[]>();
  files.forEach((file) => {
    const kind = inferComponentKind(file);
    map.set(kind, [...(map.get(kind) ?? []), file]);
  });
  return Array.from(map.entries())
    .map(([kind, list]) => ({
      kind,
      files: list,
      bytes: list.reduce((sum, file) => sum + file.length, 0),
      online: list.filter((file) =>
        ["present", "cached", "online_available", "external_only"].includes(
          fileStatus(file),
        ),
      ).length,
      missing: list.filter((file) =>
        ["missing", "chunk_missing"].includes(fileStatus(file)),
      ).length,
      notChecked: list.filter((file) => fileStatus(file) === "not_checked")
        .length,
    }))
    .sort((a, b) => b.files.length - a.files.length);
}
function statusClass(status: string): string {
  if (
    ["present", "cached", "online_available", "external_only"].includes(status)
  )
    return "status-good";
  if (["queued", "unknown", "not_checked"].includes(status))
    return "status-warn";
  if (["missing", "chunk_missing"].includes(status)) return "status-bad";
  return "status-neutral";
}

function friendlyErrorSummary(error: string): string {
  const normalized = error.toLowerCase();
  if (normalized.includes("failed to download a valid remote mcdf")) {
    return "Remote MCDF source could not be downloaded.";
  }
  if (normalized.includes("invalid header") || normalized.includes("builder error")) {
    return "Request could not be built.";
  }
  if (normalized.includes("preview image") && normalized.includes("could not be prepared")) {
    return "Preview image could not be prepared.";
  }
  if (normalized.includes("failed to read preview image") || normalized.includes("preview image could not be read")) {
    return "Preview image could not be read.";
  }
  if (normalized.includes("preview image is too large")) {
    return "Preview image is too large.";
  }
  if (normalized.includes("preview image picker failed")) {
    return "Preview image picker could not open.";
  }
  if (normalized.includes("image") && normalized.includes("upload")) {
    return "Image upload failed.";
  }
  if (normalized.includes("rebuilt package hash mismatch")) {
    return "Exchange rebuild produced a different container hash.";
  }
  return error.split("\n")[0] || error;
}

function technicalReason(error: string): string {
  const normalized = error.toLowerCase();
  if (normalized.includes("failed to download a valid remote mcdf")) {
    return "The client tried to read an internet source as an MCDF file, but the source did not return valid MCDF bytes. For subscribed Exchange entries this usually means the client used a manifest path as if it were a direct MCDF URL; update to the build that routes subscribed entries through the Exchange manifest downloader.";
  }
  if (normalized.includes("invalid header") || normalized.includes("builder error")) {
    return "The local HTTP client rejected the request before it was sent. The most common cause is an invalid URL/header or oversized metadata.";
  }
  if (normalized.includes("preview image is too large")) {
    return "The selected preview image is above the client preview limit.";
  }
  if (normalized.includes("preview image could not be read") || normalized.includes("failed to read preview image")) {
    return "The selected preview path cannot be read by the app. The file may have moved, or the cached preview path may not exist.";
  }
  if (normalized.includes("rebuilt package hash mismatch")) {
    return "The Exchange rebuild reproduced verified component files, but the outer MCDF container bytes did not match the original package hash. Component rebuilds are not expected to be byte-for-byte identical to the uploaded MCDF container.";
  }
  if (normalized.includes("central server") || normalized.includes("registry")) {
    return "The request reached the registry flow and the registry returned an error or could not be contacted.";
  }
  return "The client reported an error but did not provide a more specific classification.";
}

function likelyFix(error: string): string {
  const normalized = error.toLowerCase();
  if (normalized.includes("failed to download a valid remote mcdf")) {
    return [
      "1. If this is a subscribed Exchange entry, use Sync source again after updating the client; it should use the Exchange manifest downloader, not a direct URL downloader.",
      "2. If this is a Google Drive/direct URL entry, open the link in a browser and confirm it downloads an .mcdf file instead of an HTML page.",
      "3. For Google Drive, make sure the file is shared as anyone-with-link and use the normal /file/d/<id>/view link.",
      "4. Use Download MCDF directly to test the source before publishing or exporting.",
    ].join("\n");
  }
  if (normalized.includes("invalid header") || normalized.includes("builder error")) {
    return [
      "1. Update the client and registry server to the latest build.",
      "2. Try the action again with the same preview image and publisher identity.",
      "3. If it still fails, remove the preview and retry once to separate metadata/header issues from package handling.",
      "4. Copy the raw details into the issue/report.",
    ].join("\n");
  }
  if (normalized.includes("preview image")) {
    return [
      "1. Choose a smaller PNG, JPG, WEBP, or GIF preview.",
      "2. Use Change picture so MCDF Manager copies the preview into its cache.",
      "3. Confirm the preview renders in the library before publishing.",
      "4. Try publishing without the preview to separate image preparation from MCDF upload.",
    ].join("\n");
  }
  if (normalized.includes("rebuilt package hash mismatch")) {
    return "Use the updated client. Component-based Exchange downloads should be accepted when all internal file hashes verify; exact original byte identity is only required for full archived-package downloads.";
  }
  return "Copy this error log and the current publish step into the issue/report so the failing layer can be identified.";
}

function buildErrorLog(error: string, summary: string): string {
  const sections: string[] = [];
  sections.push(`Summary\n${summary}`);
  sections.push(`Technical reason\n${technicalReason(error)}`);
  sections.push(`What to try\n${likelyFix(error)}`);
  sections.push(`Raw details\n${error}`);
  return sections.join("\n\n");
}

function publishDebugContext(entry: LocalMcdfEntry, details: {
  serverUrl: string;
  previewPath: string | null;
  hasBearerToken: boolean;
  hasPublisherCertificate: boolean;
  hasPublisherPublicKey: boolean;
  visibility: string;
}): string {
  return [
    "Publish context",
    `Entry: ${entry.title || entry.original_filename}`,
    `MCDF path: ${entry.local_path || "<not available>"}`,
    `Server URL: ${details.serverUrl || "<not set>"}`,
    `Visibility: ${details.visibility}`,
    `Preview path: ${details.previewPath || "<none>"}`,
    `Bearer token configured: ${details.hasBearerToken ? "yes" : "no"}`,
    `Publisher public key configured: ${details.hasPublisherPublicKey ? "yes" : "no"}`,
    `Publisher certificate configured: ${details.hasPublisherCertificate ? "yes" : "no"}`,
  ].join("\n");
}

function ConnectivityBadge({ status }: { status: ConnectivityStatus }) {
  if (status.state === "online") return null;
  return (
    <div
      className={`connectivity-badge connectivity-${status.state}`}
      title={status.detail}
      aria-label={`Service status: ${status.label}. ${status.detail}`}
    >
      <span className="connectivity-dot" />
      <span>{status.label}</span>
    </div>
  );
}

function ErrorBox({ error }: { error: string | null }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  if (!error) return null;
  const summary = friendlyErrorSummary(error);
  const errorLog = buildErrorLog(error, summary);
  return (
    <>
      <div className="alert alert-error error-summary-box">
        <span>{summary}</span>
        <button
          type="button"
          className="inline-details-link"
          onClick={() => setDetailsOpen(true)}
        >
          details
        </button>
      </div>
      {detailsOpen && (
        <div
          className="modal-backdrop error-detail-backdrop"
          role="presentation"
          onMouseDown={() => setDetailsOpen(false)}
        >
          <div
            className="modal-card error-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Error details"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="panel-title-row refined-modal-head error-detail-head">
              <div>
                <div className="eyebrow">Error details</div>
                <h2>{summary}</h2>
              </div>
              <button
                type="button"
                className="modal-icon-close"
                onClick={() => setDetailsOpen(false)}
                aria-label="Close error details"
              >
                <SvgIcon name="close" />
              </button>
            </div>
            <pre className="error-detail-text">{errorLog}</pre>
          </div>
        </div>
      )}
    </>
  );
}
function SuccessBox({ children }: { children: ReactNode }) {
  return <div className="alert alert-success">{children}</div>;
}
function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`glass-panel ${className}`}>{children}</section>;
}
function PrimaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button type="button" {...rest} className={`btn-primary ${className}`} />
  );
}
function GhostButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button type="button" {...rest} className={`btn-ghost ${className}`} />
  );
}
function IconButton({
  label,
  children,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      {...rest}
      aria-label={label}
      title={label}
      className={`icon-top-button ${className}`}
    >
      {children}
    </button>
  );
}
function Field(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input {...rest} className={`field ${className}`} />;
}

function safeLayerFilename(file: LocalFileManifestEntry): string {
  const firstPath = file.game_paths?.[0] || `layer-${file.index}`;
  const name = basename(firstPath).replace(/[<>:"/\\|?*]+/g, "_").trim();
  return name || `layer-${file.index}`;
}

function LayerInventoryModal({
  entry,
  onClose,
  onError,
  onMessage,
}: {
  entry: LocalMcdfEntry;
  onClose: () => void;
  onError: (message: string | null) => void;
  onMessage: (message: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [exportingKey, setExportingKey] = useState<string | null>(null);
  const [columnWidths, setColumnWidths] = useState({
    download: 54,
    type: 112,
    name: 190,
    path: 420,
    size: 96,
    hash: 116,
  });
  const files = entry.file_manifest || [];
  const gridStyle = {
    "--layer-download-width": `${columnWidths.download}px`,
    "--layer-type-width": `${columnWidths.type}px`,
    "--layer-name-width": `${columnWidths.name}px`,
    "--layer-path-width": `${columnWidths.path}px`,
    "--layer-size-width": `${columnWidths.size}px`,
    "--layer-hash-width": `${columnWidths.hash}px`,
  } as CSSProperties;
  const startResize = (column: keyof typeof columnWidths, event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = columnWidths[column];
    const minimums: Record<keyof typeof columnWidths, number> = {
      download: 44,
      type: 72,
      name: 110,
      path: 160,
      size: 74,
      hash: 86,
    };
    const maximums: Record<keyof typeof columnWidths, number> = {
      download: 80,
      type: 180,
      name: 360,
      path: 760,
      size: 150,
      hash: 220,
    };
    const onMove = (moveEvent: PointerEvent) => {
      const next = Math.max(minimums[column], Math.min(maximums[column], startWidth + moveEvent.clientX - startX));
      setColumnWidths((current) => ({ ...current, [column]: next }));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };
  const kinds = useMemo(
    () => Array.from(new Set(files.map((file) => inferComponentKind(file)).filter(Boolean))).sort(),
    [files],
  );
  const filtered = files.filter((file) => {
    const kind = inferComponentKind(file);
    const text = `${kind} ${file.game_paths.join(" ")} ${file.payload_blake3}`.toLowerCase();
    return (!kindFilter || kind === kindFilter) && (!query.trim() || text.includes(query.trim().toLowerCase()));
  });
  const exportFile = async (file: LocalFileManifestEntry) => {
    if (!localEntryHasLocalFile(entry)) {
      onError("This MCDF is not stored on this machine, so its internal layers cannot be exported yet.");
      return;
    }
    const defaultName = safeLayerFilename(file);
    const extension = defaultName.includes(".") ? defaultName.split(".").pop() || "bin" : "bin";
    const selected = await save({
      defaultPath: defaultName,
      filters: [{ name: "Layer file", extensions: [extension] }],
    });
    if (!selected || Array.isArray(selected)) return;
    const key = `${file.index}-${file.payload_blake3}`;
    setExportingKey(key);
    onError(null);
    try {
      const result = await invoke<ExportInternalMcdfFileResult>("export_internal_mcdf_file", {
        sourcePath: entry.local_path,
        outputPath: selected,
        fileIndex: file.index,
        payloadBlake3: file.payload_blake3,
      });
      onMessage(`Layer exported to ${result.output_path}`);
    } catch (error) {
      onError(String(error));
    } finally {
      setExportingKey(null);
    }
  };
  return (
    <div className="modal-backdrop layer-modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal-card layer-inventory-modal"
        role="dialog"
        aria-modal="true"
        aria-label="MCDF layers and files"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="layer-modal-head">
          <div className="layer-modal-title-block">
            <h2>{entry.title || entry.original_filename}</h2>
            <span>MCDF layers</span>
          </div>
          <IconButton label="Close layers" className="layer-modal-close" onClick={onClose}><SvgIcon name="close" /></IconButton>
        </div>
        <div className="layer-modal-summary">
          <span className="status-pill status-neutral">{files.length} files</span>
          <span className="status-pill status-neutral">{formatBytes(entry.total_file_bytes)}</span>
          {entry.package_hash_blake3 && <code>{shortHash(entry.package_hash_blake3)}</code>}
        </div>
        <div className="layer-modal-toolbar">
          <Field value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search path or hash…" />
          <select value={kindFilter} onChange={(event) => setKindFilter(event.target.value)}>
            <option value="">All layer types</option>
            {kinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
          </select>
        </div>
        {!localEntryHasLocalFile(entry) && (
          <div className="alert warning">
            This entry is not downloaded to this machine. Download the MCDF first to export individual layers.
          </div>
        )}
        <div className="layer-file-table" role="table" aria-label="Internal MCDF files">
          <div className="layer-file-row layer-file-head" role="row" style={gridStyle}>
            <span className="layer-file-actions layer-file-head-cell">Download</span>
            <span className="layer-file-head-cell">Type <button type="button" className="column-resizer" aria-label="Resize Type column" onPointerDown={(event) => startResize("type", event)} /></span>
            <span className="layer-file-head-cell">Name <button type="button" className="column-resizer" aria-label="Resize Name column" onPointerDown={(event) => startResize("name", event)} /></span>
            <span className="layer-file-head-cell">Path <button type="button" className="column-resizer" aria-label="Resize Path column" onPointerDown={(event) => startResize("path", event)} /></span>
            <span className="layer-file-head-cell">Size <button type="button" className="column-resizer" aria-label="Resize Size column" onPointerDown={(event) => startResize("size", event)} /></span>
            <span className="layer-file-head-cell">Hash <button type="button" className="column-resizer" aria-label="Resize Hash column" onPointerDown={(event) => startResize("hash", event)} /></span>
          </div>
          {filtered.length === 0 ? (
            <div className="empty-small layer-empty">No layers match this filter.</div>
          ) : filtered.map((file) => {
            const key = `${file.index}-${file.payload_blake3}`;
            const displayPath = file.game_paths.length ? file.game_paths.join(" · ") : `Layer ${file.index}`;
            const displayName = safeLayerFilename(file);
            return (
              <div className="layer-file-row" role="row" key={key} style={gridStyle}>
                <span className="layer-file-actions">
                  <IconButton
                    label={`Download ${displayName}`}
                    disabled={!localEntryHasLocalFile(entry) || Boolean(exportingKey)}
                    className="library-action-button layer-download-button"
                    onClick={() => void exportFile(file)}
                  >
                    {exportingKey === key ? <SvgIcon name="loading" /> : <SvgIcon name="export" />}
                  </IconButton>
                </span>
                <span className="layer-file-type" title={inferComponentKind(file)}><SvgIcon name={iconForComponentKind(inferComponentKind(file))} />{inferComponentKind(file)}</span>
                <span className="layer-file-name" title={displayName}>{displayName}</span>
                <span className="layer-file-path" title={displayPath}>{displayPath}</span>
                <span className="layer-file-size">{formatBytes(file.length)}</span>
                <code title={file.payload_blake3}>{shortHash(file.payload_blake3)}</code>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ActivityIndicator({ operations }: { operations: Operation[] }) {
  const active = operations.filter((op) => op.status === "running");
  const done = operations.filter((op) => op.status === "done").length;
  const failed = operations.filter((op) => op.status === "failed").length;
  const recent = operations.slice(0, 8);
  const totalSpeed = active.reduce((sum, op) => {
    const elapsed = (Date.now() - op.startedAt) / 1000;
    return op.bytesDone && elapsed > 0 ? sum + op.bytesDone / elapsed : sum;
  }, 0);
  return (
    <details className="activity">
      <summary className="activity-summary">
        <span className={active.length > 0 ? "pulse-dot" : "idle-dot"} />
        <span>
          {active.length > 0 ? `${active.length} active` : "transfers"}
        </span>
        <span className="activity-speed">
          {active.length > 0 ? formatBytes(totalSpeed) + "/s" : `${done} done`}
        </span>
      </summary>
      <div className="activity-popover">
        <div className="activity-head">
          <span>Uploads / downloads</span>
          <span>{failed > 0 ? `${failed} failed` : "idle"}</span>
        </div>
        {recent.length === 0 ? (
          <div className="empty-small">No operations yet.</div>
        ) : (
          recent.map((op) => {
            const elapsed = ((op.endedAt ?? Date.now()) - op.startedAt) / 1000;
            const speed =
              op.bytesDone && elapsed > 0
                ? `${formatBytes(op.bytesDone / elapsed)}/s`
                : "—";
            return (
              <div key={op.id} className="activity-row">
                <div className="activity-row-title">
                  <span>{op.label}</span>
                  <span className={`status-pill ${statusClass(op.status)}`}>
                    {op.status}
                  </span>
                </div>
                <div className="activity-row-meta">
                  <span>{op.kind}</span>
                  <span>
                    {op.stage
                      ? `${op.stage.percent}%`
                      : `${formatBytes(op.bytesDone)} ${op.bytesTotal ? `/ ${formatBytes(op.bytesTotal)}` : ""} · ${speed}`}
                  </span>
                </div>
                {op.stage && (
                  <div
                    className="activity-progress-track"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={op.stage.percent}
                    aria-label={op.stage.label}
                  >
                    <div
                      className="activity-progress-fill"
                      style={{
                        width: `${Math.max(0, Math.min(100, op.stage.percent))}%`,
                      }}
                    />
                  </div>
                )}
                {op.message && (
                  <div className="activity-message">{op.message}</div>
                )}
              </div>
            );
          })
        )}
      </div>
    </details>
  );
}

function ComponentSummary({ files }: { files: FileLike[] }) {
  const groups = groupedFiles(files);
  const totalBytes = files.reduce((sum, file) => sum + file.length, 0);
  return (
    <Panel>
      <div className="panel-title-row">
        <div>
          <div className="eyebrow">Component stack</div>
          <h2>Bundle contents</h2>
        </div>
        <span className="status-pill status-neutral">{files.length} files</span>
      </div>
      <div className="summary-metrics">
        <div>
          <strong>{groups.length}</strong>
          <span>groups</span>
        </div>
        <div>
          <strong>{formatBytes(totalBytes)}</strong>
          <span>payload</span>
        </div>
        <div>
          <strong>
            {files.filter((f) => fileStatus(f) !== "missing").length}
          </strong>
          <span>available/local</span>
        </div>
      </div>
      <div className="component-grid">
        {groups.length === 0 && (
          <div className="empty-small">No extracted files yet.</div>
        )}
        {groups.map((group) => (
          <div key={group.kind} className="component-card">
            <div className="component-icon"><SvgIcon name={iconForComponentKind(group.kind)} /></div>
            <div>
              <div className="component-name">{group.kind}</div>
              <div className="component-meta">
                {group.files.length} files · {formatBytes(group.bytes)}
              </div>
              {group.missing > 0 && (
                <div className="component-warning">{group.missing} missing</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ComponentTable({
  files,
  title = "Internal MCDF files",
}: {
  files: FileLike[];
  title?: string;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <Panel className="component-table-panel">
      <div className="panel-title-row">
        <div>
          <div className="eyebrow">Extracted package details</div>
          <h2>{title}</h2>
        </div>
        <span className="status-pill status-neutral">
          {files.length} entries
        </span>
      </div>
      <div className="component-table">
        {files.length === 0 && (
          <p className="empty-small">No internal files found.</p>
        )}
        {files.map((file) => {
          const status = fileStatus(file);
          const primaryPath = filePrimaryPath(file);
          return (
            <div key={file.index} className="file-row">
              <button
                className="file-row-main"
                onClick={() =>
                  setExpanded(expanded === file.index ? null : file.index)
                }
              >
                <span className="file-index">#{file.index + 1}</span>
                <span className="file-kind">{inferComponentKind(file)}</span>
                <span className="file-path" title={primaryPath}>
                  {primaryPath}
                </span>
                <span
                  className={`status-pill ${statusClass(status)}`}
                  title={
                    status === "not_checked"
                      ? "This file hash has not been checked against the MCDF registry yet."
                      : status === "present"
                        ? "This file hash exists in the MCDF registry."
                        : status === "missing"
                          ? "This file hash is not in the MCDF registry yet."
                          : "Registry returned this status for the file hash."
                  }
                >
                  {statusLabel(status)}
                </span>
                <span className="file-size">{formatBytes(file.length)}</span>
                <span className="file-expand">
                  {expanded === file.index ? "▾" : "▸"}
                </span>
              </button>
              {expanded === file.index && (
                <div className="file-row-details">
                  {file.game_paths.slice(1).map((path, index) => (
                    <div key={index}>also: {path}</div>
                  ))}
                  {fileOffset(file) !== undefined && (
                    <div>payload offset: {fileOffset(file)}</div>
                  )}
                  <div>MCDF file hash: {fileMcdfHash(file) || "—"}</div>
                  <div>BLAKE3 payload hash: {fileBlake3(file)}</div>
                  {"central_status" in file && (
                    <div>registry status: {statusLabel(fileStatus(file))}</div>
                  )}
                  {fileNotes(file).map((note, index) => (
                    <div key={index}>note: {note}</div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function AnalyzeProgressBar({
  progress,
}: {
  progress: AnalyzeProgress | null;
}) {
  if (!progress) return null;
  const safePercent = Math.max(0, Math.min(100, progress.percent));
  return (
    <div className="analyze-progress-card" role="status" aria-live="polite">
      <div className="analyze-progress-head">
        <span>{progress.title}</span>
        <strong>{safePercent}%</strong>
      </div>
      <div
        className="analyze-progress-track"
        aria-label={progress.title}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safePercent}
        role="progressbar"
      >
        <div
          className="analyze-progress-fill"
          style={{ width: `${safePercent}%` }}
        />
        <span>{progressLabel(progress)}</span>
      </div>
    </div>
  );
}

function PreparePanel({
  addOperation,
  updateOperation,
  finishOperation,
  autoOpenSignal = 0,
}: PanelProps & { autoOpenSignal?: number }) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [info, setInfo] = useState<MCDFInfo | null>(null);
  const [files, setFiles] = useState<AnalyzedFileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<AnalyzeProgress | null>(null);
  const lastAutoOpenSignal = useRef<number>(0);

  const setStage = (
    opId: string,
    percent: number,
    title: string,
    detail: string,
    counts?: Pick<AnalyzeProgress, "known" | "missing" | "total">,
  ) => {
    const next = { percent, title, detail, ...counts };
    setProgress(next);
    updateOperation(opId, {
      stage: { percent, label: title, detail },
      message: progressLabel(next),
      bytesDone: counts?.known,
      bytesTotal: counts?.total,
    });
  };

  const chooseFile = async () => {
    const selected = await openDialog({
      multiple: false,
      filters: [{ name: "MCDF", extensions: ["mcdf"] }],
    });
    if (!selected) return;
    const opId = addOperation({
      kind: "scan",
      label: "Analyze MCDF locally",
      stage: {
        percent: 2,
        label: "Opening file",
        detail: "Waiting for selected file.",
      },
      message: "Opening selected MCDF file",
    });
    setLoading(true);
    setError(null);
    setInfo(null);
    setFiles([]);
    setSelectedPath(selected as string);
    setStage(
      opId,
      8,
      "Opening file",
      "Reading package bytes…",
    );
    try {
      setStage(
        opId,
        18,
        "Opening package header",
        "Parsing package header…",
      );
      const analyzed = await invoke<McdfAnalyzeResult>("analyze_mcdf", {
        path: selected,
      });
      const mcdf = analyzed.metadata;
      const fileInfos = analyzed.files;
      setInfo(mcdf);
      setStage(
        opId,
        34,
        "Inspecting contents",
        "Listing internal files…",
      );
      const totalBytes = fileInfos.reduce((sum, file) => sum + file.length, 0);
      setFiles(
        fileInfos.map((file) => ({
          ...file,
          online_status: "not_checked",
          central_status: "unknown",
          notes: ["Local hash calculated; registry check has not run yet."],
        })),
      );
      setStage(
        opId,
        58,
        "Hashing parts",
        `Hashing ${fileInfos.length} internal files…`,
        { total: fileInfos.length },
      );

      const checkedFiles = applyProbeStatus(fileInfos, null);
      setFiles(checkedFiles);

      const finalMessage = `${fileInfos.length} files analyzed locally · ${fileInfos.length} BLAKE3 payload hashes ready for a later server check`;
      finishOperation(opId, {
        status: "done",
        bytesDone: totalBytes,
        bytesTotal: totalBytes,
        message: finalMessage,
        stage: {
          percent: 100,
          label: "Local analysis complete",
          detail: finalMessage,
        },
      });
      setProgress(null);
    } catch (e) {
      setInfo(null);
      setFiles([]);
      const message = String(e);
      finishOperation(opId, {
        status: "failed",
        message,
        stage: {
          percent: progress?.percent ?? 0,
          label: "Analysis failed",
          detail: message,
        },
      });
      setProgress({
        percent: progress?.percent ?? 0,
        title: "Analysis failed",
        detail: message,
      });
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      autoOpenSignal <= 0 ||
      lastAutoOpenSignal.current === autoOpenSignal ||
      loading
    )
      return;
    lastAutoOpenSignal.current = autoOpenSignal;
    chooseFile();
  }, [autoOpenSignal]);

  const checkServerAvailability = async () => {
    if (!files.length) return;
    const token = archiveActionToken();
    if (!token) {
      setError(
        "Add an archive/admin token in Settings before checking online availability.",
      );
      return;
    }
    const localFiles = files.map(
      ({
        online_status: _onlineStatus,
        central_status: _centralStatus,
        notes: _notes,
        ...file
      }) => file,
    );
    const opId = addOperation({
      kind: "scan",
      label: "Check BLAKE3 hashes online",
      stage: {
        percent: 5,
        label: "Preparing hash manifest",
        detail: "Preparing local hash list…",
      },
      message: "Preparing hash manifest",
    });
    setLoading(true);
    setError(null);
    try {
      setStage(
        opId,
        35,
        "Sending hash manifest",
        "Checking registry status…",
        { known: 0, missing: 0, total: localFiles.length },
      );
      const probe = await probeKnownFiles(localFiles);
      const checkedFiles = applyProbeStatus(localFiles, probe);
      const known = probe?.known_files.length ?? 0;
      const missing = probe?.missing_files.length ?? 0;
      setFiles(checkedFiles);
      const message = `${localFiles.length} hashes checked · ${known} already online · ${missing} missing online`;
      finishOperation(opId, {
        status: "done",
        message,
        stage: {
          percent: 100,
          label: "Registry check complete",
          detail: message,
        },
      });
      setProgress(null);
    } catch (e) {
      const message = String(e);
      setError(
        `Local analysis remains available. Online availability check failed: ${message}`,
      );
      setProgress(null);
      finishOperation(opId, {
        status: "failed",
        message,
        stage: { percent: 100, label: "Server check failed", detail: message },
      });
    } finally {
      setLoading(false);
    }
  };

  const importAnalyzedMcdf = () => {
    if (!selectedPath || !info || files.length === 0) return;
    const current = readLocalMcdfLibrary();
    const existing = current.find((entry) => entry.local_path === selectedPath);
    const fileName = basename(selectedPath);
    const localFiles = files.map(
      ({
        online_status: _onlineStatus,
        central_status: _centralStatus,
        notes: _notes,
        ...file
      }) => file,
    );
    const entry: LocalMcdfEntry = {
      id: existing?.id || localEntryId(selectedPath),
      local_path: selectedPath,
      source_type: "local_file",
      source_url: null,
      source_label: "Device file",
      remote_annotation: null,
      missing_registry_percent: null,
      original_filename: fileName,
      title: existing?.title || fileName.replace(/\.mcdf$/i, ""),
      description: existing?.description || info.description || "",
      tags: existing?.tags || [],
      preview_image_path: existing?.preview_image_path || null,
      preview_crop: existing?.preview_crop || null,
      is_adult: existing?.is_adult || false,
      visibility: existing?.visibility || "public",
      package_hash_blake3: existing?.package_hash_blake3 || null,
      file_count: localFiles.length,
      total_file_bytes: localFiles.reduce((sum, file) => sum + file.length, 0),
      component_kinds: kindsFromExtractedFiles(localFiles),
      file_manifest: fileManifestFromExtractedFiles(localFiles),
      sharing_policy: existing?.sharing_policy || null,
      storage_state: existing?.storage_state || "offline",
      last_checked_at: new Date().toISOString(),
      last_published_at: existing?.last_published_at || null,
      manifest_url: existing?.manifest_url || null,
      download_url: existing?.download_url || null,
      notes: [
        "Imported from Analyze MCDF. The entry stays local until you publish it.",
        ...(info.description
          ? ["MCDF description was imported into the local entry."]
          : []),
      ],
    };
    writeLocalMcdfLibrary([
      entry,
      ...current.filter((item) => item.id !== entry.id),
    ]);
    window.dispatchEvent(
      new CustomEvent("mcdf-local-library-changed", {
        detail: { selectedId: entry.id },
      }),
    );
    setError(null);
    setProgress({
      percent: 100,
      title: "Imported to library",
      detail: `${entry.title} was added to MCDF Manager.`,
    });
    window.setTimeout(() => setProgress(null), 1800);
  };

  const componentGroups = groupedFiles(files);
  const totalBytes = files.reduce((sum, file) => sum + file.length, 0);
  const knownOnline = files.filter(
    (file) => file.online_status === "present",
  ).length;
  const missingOnline = files.filter(
    (file) => file.online_status === "missing",
  ).length;
  const notChecked = files.filter(
    (file) => file.online_status === "not_checked",
  ).length;
  const registryChecked = files.length > 0 && notChecked === 0;

  return (
    <div className="analyzer-screen analyzer-results-only">
      <div className="main-stack">
        <div className="analyzer-action-bar always-visible">
          <div className="analyzer-current-file">
            <span>MCDF</span>
            <strong title={selectedPath || "No file selected yet"}>
              {selectedPath ? basename(selectedPath) : "No file selected"}
            </strong>
          </div>
          <div className="hero-actions">
            <PrimaryButton onClick={chooseFile} disabled={loading}>
              {loading
                ? "Working…"
                : files.length > 0
                  ? "Analyze another…"
                  : "Choose MCDF…"}
            </PrimaryButton>
            <GhostButton
              onClick={importAnalyzedMcdf}
              disabled={loading || !selectedPath || !info || files.length === 0}
              title="Add this analyzed MCDF to the local library without publishing it."
            >
              Import to library
            </GhostButton>
            {files.length > 0 && (
              <GhostButton
                onClick={checkServerAvailability}
                disabled={loading || !archiveActionToken()}
                title={
                  archiveActionToken()
                    ? "Send only the BLAKE3 hash manifest to the archive server."
                    : "Add an archive/admin token in Settings before checking registry hashes."
                }
              >
                Check registry hashes
              </GhostButton>
            )}
          </div>
        </div>
        <AnalyzeProgressBar progress={progress} />
        <ErrorBox error={error} />
        {!selectedPath && !loading && !progress && (
          <div className="analyzer-empty-note">
            Choose an MCDF from the action bar. The file picker also opens
            automatically when this page is selected.
          </div>
        )}
        {info && (
          <Panel className="analysis-result-panel analysis-metadata-panel">
            <div className="panel-title-row">
              <div>
                <div className="eyebrow">Metadata</div>
                <h2>Package notes</h2>
              </div>
              <span className="status-pill status-good">loaded</span>
            </div>
            {info.description ? (
              <p className="metadata-description">{info.description}</p>
            ) : (
              <p className="empty-small">
                No written description was stored inside this MCDF.
              </p>
            )}
            <div
              className="metadata-presence-row"
              aria-label="Detected MCDF metadata sections"
            >
              {info.glamourer_data && (
                <span
                  className="status-pill status-good"
                  title="Glamourer data exists in this MCDF."
                >
                  Glamourer
                </span>
              )}
              {info.customize_plus_data && (
                <span
                  className="status-pill status-good"
                  title="Customize+ data exists in this MCDF."
                >
                  Customize+
                </span>
              )}
              {info.manipulation_data && (
                <span
                  className="status-pill status-good"
                  title="Manipulation data exists in this MCDF."
                >
                  Manipulation
                </span>
              )}
              {!info.glamourer_data &&
                !info.customize_plus_data &&
                !info.manipulation_data && (
                  <span
                    className="status-pill status-neutral"
                    title="No recognized metadata sections were found. Internal files are still listed below."
                  >
                    No recognized character metadata
                  </span>
                )}
            </div>
          </Panel>
        )}
        {files.length > 0 && (
          <Panel className="analysis-result-panel">
            <div className="panel-title-row">
              <div>
                <div className="eyebrow">Component groups</div>
                <h2>{files.length} internal files</h2>
              </div>
              <span className="status-pill status-neutral">
                {formatBytes(totalBytes)}
              </span>
            </div>
            <div className="analysis-status-strip">
              <span title="BLAKE3 payload hashes calculated from this local MCDF.">
                <strong>{files.length}</strong> local hashes
              </span>
              {registryChecked ? (
                <span title="Hashes already known by the MCDF registry.">
                  <strong>{knownOnline}</strong> known in registry
                </span>
              ) : (
                <span title="Use Check registry hashes to compare local file hashes with the MCDF registry.">
                  registry not checked
                </span>
              )}
              {registryChecked && (
                <span title="Hashes not present in the MCDF registry after the check.">
                  <strong>{missingOnline}</strong> missing in registry
                </span>
              )}
            </div>
            <div className="component-grid">
              {componentGroups.map((group) => (
                <div key={group.kind} className="component-card">
                  <strong>{group.kind}</strong>
                  <span>
                    {group.files.length} files · {formatBytes(group.bytes)}
                  </span>
                  <small
                    title={
                      registryChecked
                        ? "Registry counts for this component group."
                        : "Use Check registry hashes to compare this group with the MCDF registry."
                    }
                  >
                    {registryChecked
                      ? `${group.online} known · ${group.missing} missing`
                      : "registry not checked"}
                  </small>
                </div>
              ))}
            </div>
          </Panel>
        )}
        {files.length > 0 && (
          <ComponentTable files={files} title="Internal file inventory" />
        )}
      </div>
    </div>
  );
}

function AddMcdfEntryModal({
  open,
  onClose,
  addOperation,
  updateOperation,
  finishOperation,
}: { open: boolean; onClose: () => void } & PanelProps) {
  const [step, setStep] = useState<"choose" | "details">("choose");
  const [draft, setDraft] = useState<McdfAddDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<AnalyzeProgress | null>(null);
  const [remoteUrl, setRemoteUrl] = useState("");
  const [remotePreviewUrl, setRemotePreviewUrl] = useState("");
  const [sharedImportText, setSharedImportText] = useState("");
  const [sharedImportTag, setSharedImportTag] = useState("");
  const [previewImporting, setPreviewImporting] = useState(false);
  const [draftPreviewImageFailed, setDraftPreviewImageFailed] = useState(false);
  const [draftFramingOpen, setDraftFramingOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep("choose");
    setDraft(null);
    setLoading(false);
    setError(null);
    setProgress(null);
    setRemoteUrl("");
    setRemotePreviewUrl("");
    setSharedImportText("");
    setSharedImportTag("");
    setPreviewImporting(false);
    setDraftPreviewImageFailed(false);
    setDraftFramingOpen(false);
    setImportModalOpen(false);
  }, [open]);

  useEffect(() => {
    setDraftPreviewImageFailed(false);
  }, [draft?.previewPath]);

  if (!open) return null;

  const setStage = (
    opId: string,
    percent: number,
    title: string,
    detail: string,
  ) => {
    const next = { percent, title, detail };
    setProgress(next);
    updateOperation(opId, {
      stage: { percent, label: title, detail },
      message: progressLabel(next),
    });
  };

  const chooseLocalMcdf = async () => {
    const opId = addOperation({
      kind: "scan",
      label: "Add MCDF to library",
      stage: {
        percent: 2,
        label: "Opening file",
        detail: "Waiting for the selected MCDF.",
      },
      message: "Opening selected MCDF",
    });
    setLoading(true);
    setError(null);
    setProgress({
      percent: 2,
      title: "Opening file",
      detail: "Waiting for the selected MCDF.",
    });
    try {
      const selected = await openDialog({
        multiple: false,
        filters: [{ name: "MCDF", extensions: ["mcdf"] }],
      });
      if (!selected || Array.isArray(selected)) {
        finishOperation(opId, {
          status: "done",
          message: "No MCDF selected",
          stage: {
            percent: 100,
            label: "Cancelled",
            detail: "No file was selected.",
          },
        });
        setProgress(null);
        return;
      }
      setStage(
        opId,
        18,
        "Reading MCDF",
        "Reading the character metadata from the selected file.",
      );
      const info = await invoke<MCDFInfo>("scan_mcdf", { path: selected });
      setStage(
        opId,
        42,
        "Inspecting package",
        "Collecting a lightweight inventory for labels and file counts.",
      );
      const files = await invoke<ExtractedFileInfo[]>("inspect_mcdf_files", {
        path: selected,
      });
      setStage(
        opId,
        82,
        "Preparing library entry",
        "Creating editable details before it is added locally.",
      );
      const fileName = basename(selected);
      setDraft({
        path: selected,
        fileName,
        info,
        files,
        title: fileName.replace(/\.mcdf$/i, ""),
        description: info.description || "",
        tags: "",
        previewPath: null,
        previewCrop: DEFAULT_PREVIEW_CROP,
        isAdult: false,
        visibility: "public",
      });
      setStep("details");
      const message = `${files.length} internal files found. Review the library details before adding.`;
      setStage(opId, 100, "Ready to add", message);
      finishOperation(opId, {
        status: "done",
        message,
        stage: { percent: 100, label: "Ready to add", detail: message },
      });
    } catch (e) {
      const message = String(e);
      setError(message);
      setProgress({
        percent: progress?.percent ?? 0,
        title: "Could not read MCDF",
        detail: message,
      });
      finishOperation(opId, {
        status: "failed",
        message,
        stage: {
          percent: progress?.percent ?? 0,
          label: "Could not read MCDF",
          detail: message,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const chooseRemoteMcdf = async () => {
    const trimmedUrl = remoteUrl.trim();
    if (!trimmedUrl) {
      setError("Paste a Google Drive or direct MCDF link first.");
      return;
    }
    const opId = addOperation({
      kind: "scan",
      label: "Add remote MCDF to library",
      stage: {
        percent: 5,
        label: "Checking link",
        detail: "Preparing to read the remote MCDF metadata.",
      },
      message: "Checking remote MCDF link",
    });
    setLoading(true);
    setError(null);
    setProgress({
      percent: 5,
      title: "Checking link",
      detail: "Preparing to read the remote MCDF metadata.",
    });
    try {
      setStage(
        opId,
        22,
        "Reading remote MCDF",
        "Downloading just enough metadata to prepare a local library entry.",
      );
      const scanned = await invoke<RemoteMcdfScanResult>(
        "scan_remote_mcdf_metadata",
        { url: trimmedUrl },
      );
      const sourceType = remoteSourceTypeFromUrl(trimmedUrl);
      setDraft({
        path: "",
        fileName:
          scanned.original_filename || scanned.title || "Remote MCDF.mcdf",
        info: {
          description: scanned.description || "",
          glamourer_data: "",
          customize_plus_data: "",
          manipulation_data: "",
          files: [],
        },
        files: [],
        title:
          scanned.title ||
          (scanned.original_filename || "Remote MCDF").replace(/\.mcdf$/i, ""),
        description: scanned.description || "",
        tags: "",
        previewPath: remotePreviewUrl.trim() || null,
        previewCrop: DEFAULT_PREVIEW_CROP,
        isAdult: false,
        visibility: "public",
        sourceType,
        sourceUrl: trimmedUrl,
        sourceLabel:
          sourceType === "google_drive" ? "Google Drive" : "Direct link",
        remoteAnnotation:
          "Remote entry. The MCDF is not stored locally until you download it.",
        packageHash: scanned.package_hash_blake3,
        fileCount: scanned.file_count,
        totalBytes: scanned.total_file_bytes || scanned.package_size,
        componentKinds: scanned.component_kinds,
        notes: [
          ...scanned.notes,
          "Added from a remote source. No files were uploaded.",
        ],
      });
      setImportModalOpen(false);
      setStep("details");
      const message = `${scanned.file_count} files found. Review the entry before adding it.`;
      setStage(opId, 100, "Ready to add", message);
      finishOperation(opId, {
        status: "done",
        message,
        stage: { percent: 100, label: "Ready to add", detail: message },
      });
    } catch (e) {
      const message = String(e);
      setError(message);
      setProgress({
        percent: progress?.percent ?? 0,
        title: "Could not read remote MCDF",
        detail: message,
      });
      finishOperation(opId, {
        status: "failed",
        message,
        stage: {
          percent: progress?.percent ?? 0,
          label: "Could not read remote MCDF",
          detail: message,
        },
      });
    } finally {
      setLoading(false);
    }
  };


  const publicIndexBaseUrl = "https://raw.githubusercontent.com/obscure-crescent/moon-sparkles/main/public";
  const latestIndexUrl = `${publicIndexBaseUrl}/indexes/latest.json`;
  const publicAssetUrl = (path?: string | null): string | null => {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    return `${publicIndexBaseUrl}/${path.replace(/^\/+/, "")}`;
  };
  const shareIdFromInput = (input: string): string | null => {
    const value = input.trim();
    if (!value) return null;
    const hostMatch = value.match(/(?:^|\s)mcdf\.thebigtree\.life:([a-z0-9-]{8,128})(?:\s|$)/i);
    if (hostMatch) return hostMatch[1].toLowerCase();
    const urlMatch = value.match(/(?:\/|=)([a-f0-9]{32,128})(?:\.json)?(?:[?#].*)?$/i);
    if (urlMatch) return urlMatch[1].toLowerCase();
    const hashOnly = value.match(/^[a-f0-9]{32,128}$/i);
    return hashOnly ? value.toLowerCase() : null;
  };
  const entryFromPublicPackage = (pkg: PublicIndexPackageSummary | PublicPackageRecord, extraTag?: string): LocalMcdfEntry => {
    const normalized = "owner" in pkg ? null : normalizePublicIndexPackageSummary(pkg);
    const hash = safeString(pkg.package_hash_blake3 || normalized?.package_hash_blake3);
    if (!hash) throw new Error("The shared entry is missing a package hash and cannot be added to the Library.");
    const tags = Array.from(new Set([...stringArray(pkg.tags), ...(extraTag ? [extraTag] : [])]));
    const componentKinds = "component_kinds" in pkg ? stringArray(pkg.component_kinds) : [];
    return {
      id: `shared-${hash.slice(0, 24)}`,
      local_path: "",
      source_type: "indexed",
      source_url: publicAssetUrl((pkg as PublicIndexPackageSummary).download_manifest_path || (pkg as PublicIndexPackageSummary).package_manifest_path) || null,
      source_label: "Shared MCDF",
      source_owner_public_id: (pkg as PublicIndexPackageSummary).owner_public_id || (pkg as PublicPackageRecord).owner?.public_id || null,
      source_owner_display_name: (pkg as PublicIndexPackageSummary).owner_display_name || (pkg as PublicPackageRecord).owner?.display_name || null,
      source_package_hash_blake3: hash,
      remote_annotation: "Imported from an MCDF Manager share code. Download the MCDF when you want a local copy.",
      missing_registry_percent: null,
      original_filename: safeString(pkg.original_filename || pkg.title, `${pkg.package_hash_blake3.slice(0, 12)}.mcdf`),
      title: safeString(pkg.title || pkg.original_filename, "Untitled MCDF"),
      description: safeString(pkg.description),
      tags,
      preview_image_path: publicAssetUrl(pkg.preview_image_path),
      preview_crop: normalizePreviewCropValue(pkg.preview_crop),
      is_adult: Boolean(pkg.is_adult),
      visibility: normalizeMcdfVisibilityValue(pkg.visibility),
      character_use_consent: packageCharacterUseConsentValue(pkg),
      package_hash_blake3: hash,
      file_count: finiteNumber(pkg.file_count),
      total_file_bytes: finiteNumber(pkg.total_file_bytes),
      component_kinds: componentKinds,
      file_manifest: "files" in pkg && Array.isArray(pkg.files) ? pkg.files.map((file) => ({
        index: finiteNumber(file.index),
        game_paths: stringArray(file.game_paths),
        length: finiteNumber(file.length),
        payload_blake3: safeString(file.payload_blake3),
      })) : [],
      sharing_policy: null,
      storage_state: "subscribed",
      last_checked_at: new Date().toISOString(),
      last_published_at: null,
      manifest_url: publicAssetUrl((pkg as PublicIndexPackageSummary).package_manifest_path) || null,
      download_url: publicAssetUrl((pkg as PublicIndexPackageSummary).download_manifest_path) || null,
      notes: ["Imported from an MCDF Manager share reference."],
    };
  };
  const importSharedEntries = async () => {
    const inputs = sharedImportText
      .split(/[\n,]+/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (!inputs.length) {
      setError("Paste one or more MCDF Manager share codes first.");
      return;
    }
    const opId = addOperation({
      kind: "download",
      label: "Import shared MCDF entries",
      stage: { percent: 5, label: "Reading share codes", detail: "Resolving shared Exchange entries." },
      message: "Importing shared MCDF entries",
    });
    setLoading(true);
    setError(null);
    try {
      const latest = await fetch(latestIndexUrl).then((response) => {
        if (!response.ok) throw new Error(`Public index lookup failed: HTTP ${response.status}`);
        return response.json() as Promise<PublicIndexLatest>;
      });
      const tag = sharedImportTag.trim().replace(/^#/, "");
      const imported: LocalMcdfEntry[] = [];
      const missing: string[] = [];
      for (const raw of inputs) {
        let pkg: PublicIndexPackageSummary | null = null;
        if (/^https?:\/\//i.test(raw) && raw.toLowerCase().endsWith(".json")) {
          try {
            const record = await fetch(raw).then((response) => {
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              return response.json() as Promise<PublicPackageRecord>;
            });
            imported.push(entryFromPublicPackage(record, tag));
            continue;
          } catch {
            // Fall back to share-id lookup below.
          }
        }
        const shareId = shareIdFromInput(raw);
        if (shareId) {
          const normalizedPackages = (Array.isArray(latest.packages) ? latest.packages : [])
            .map((candidate) => normalizePublicIndexPackageSummary(candidate))
            .filter((candidate): candidate is PublicIndexPackageSummary => Boolean(candidate));
          pkg = normalizedPackages.find((candidate) =>
            candidate.package_hash_blake3.toLowerCase() === shareId ||
            candidate.share_id?.toLowerCase() === shareId ||
            candidate.share_code?.toLowerCase() === raw.toLowerCase(),
          ) || null;
        }
        if (pkg) imported.push(entryFromPublicPackage(pkg, tag));
        else missing.push(raw);
      }
      if (!imported.length) {
        throw new Error(`No shared entries were found for: ${missing.join(", ")}`);
      }
      const current = readLocalMcdfLibrary();
      const byId = new Map(current.map((entry) => [entry.id, entry]));
      imported.forEach((entry) => byId.set(entry.id, { ...byId.get(entry.id), ...entry }));
      writeLocalMcdfLibrary(Array.from(byId.values()));
      window.dispatchEvent(new CustomEvent("mcdf-local-library-changed"));
      const message = `Imported ${imported.length} shared entr${imported.length === 1 ? "y" : "ies"}${missing.length ? ` · ${missing.length} not found` : ""}.`;
      finishOperation(opId, { status: "done", message, stage: { percent: 100, label: "Shared entries imported", detail: message } });
      onClose();
    } catch (e) {
      const message = String(e);
      setError(message);
      finishOperation(opId, { status: "failed", message, stage: { percent: 100, label: "Shared import failed", detail: message } });
    } finally {
      setLoading(false);
    }
  };

  const chooseDraftPreview = async () => {
    try {
      const selected = await openDialog({
        multiple: false,
        filters: [
          {
            name: "Preview image",
            extensions: ["png", "jpg", "jpeg", "webp", "gif"],
          },
        ],
      });
      if (!selected || Array.isArray(selected)) return;
      setPreviewImporting(true);
      setError(null);
      const cached = await cachePreviewImageForLibrary(selected);
      setDraft((current) =>
        current
          ? { ...current, previewPath: cached, previewCrop: DEFAULT_PREVIEW_CROP }
          : current,
      );
      setDraftPreviewImageFailed(false);
      setDraftFramingOpen(true);
    } catch (e) {
      setError(`Preview image picker failed: ${String(e)}`);
    } finally {
      setPreviewImporting(false);
    }
  };

  const previewLooksCacheReady = (previewPath?: string | null): boolean => {
    if (!previewPath) return true;
    const normalized = previewPath.replace(/\\/g, "/").toLowerCase();
    return normalized.includes("/previews/") || /^(https?:|data:|blob:|asset:|tauri:)/i.test(previewPath.trim());
  };

  const prepareDraftPreviewPath = async (previewPath?: string | null): Promise<string | null> => {
    if (!previewPath?.trim()) return null;
    const trimmed = previewPath.trim();
    if (/^(https?:|data:|blob:|asset:|tauri:)/i.test(trimmed)) return trimmed;
    if (previewLooksCacheReady(trimmed)) return trimmed;
    return cachePreviewImageForLibrary(trimmed);
  };

  const addDraftToLibrary = async () => {
    if (!draft) return;
    setLoading(true);
    setError(null);
    try {
      const finalPreviewPath = await prepareDraftPreviewPath(draft.previewPath);
      const current = readLocalMcdfLibrary();
      const isRemote = Boolean(
        draft.sourceType && draft.sourceType !== "local_file",
      );
      const existing = isRemote
        ? current.find(
            (entry) =>
              (draft.packageHash &&
                entry.package_hash_blake3 === draft.packageHash) ||
              entry.source_url === draft.sourceUrl,
          )
        : current.find((entry) => entry.local_path === draft.path);
      const now = new Date().toISOString();
      const entryId =
        existing?.id ||
        (isRemote && draft.packageHash
          ? `remote-${draft.packageHash.slice(0, 24)}`
          : localEntryId(draft.path));
      const componentKinds =
        draft.componentKinds || kindsFromExtractedFiles(draft.files);
      const entry: LocalMcdfEntry = {
        id: entryId,
        local_path: isRemote ? "" : draft.path,
        source_type: draft.sourceType || "local_file",
        source_url: draft.sourceUrl || null,
        source_label: draft.sourceLabel || "Device file",
        remote_annotation: draft.remoteAnnotation || null,
        missing_registry_percent: null,
        original_filename: draft.fileName,
        title: draft.title.trim() || draft.fileName.replace(/\.mcdf$/i, ""),
        description: draft.description.trim(),
        tags: tagsFromText(draft.tags),
        preview_image_path: finalPreviewPath,
        preview_crop: draft.previewPath ? normalizePreviewCrop(draft.previewCrop) : null,
        is_adult: draft.isAdult,
        visibility: draft.visibility,
        character_use_consent: draft.characterUseConsent || defaultCharacterUseConsent(),
        package_hash_blake3:
          draft.packageHash || existing?.package_hash_blake3 || null,
        file_count: draft.fileCount ?? draft.files.length,
        total_file_bytes:
          draft.totalBytes ??
          draft.files.reduce((sum, file) => sum + file.length, 0),
        component_kinds: componentKinds,
        file_manifest:
          draft.files.length > 0
            ? fileManifestFromExtractedFiles(draft.files)
            : existing?.file_manifest || [],
        sharing_policy: existing?.sharing_policy || null,
        storage_state: existing?.storage_state || "offline",
        last_checked_at: now,
        last_published_at: existing?.last_published_at || null,
        manifest_url: existing?.manifest_url || null,
        download_url: existing?.download_url || null,
        notes: draft.notes || [
          "Added as a local MCDF. Registration is not required and no files were uploaded.",
          "Package inspection was only used to prepare local labels, counts, and editable library details.",
          ...(draft.info.description
            ? ["MCDF description was copied into the local entry."]
            : []),
        ],
      };
      writeLocalMcdfLibrary([
        entry,
        ...current.filter((item) => item.id !== entry.id),
      ]);
      window.dispatchEvent(
        new CustomEvent("mcdf-local-library-changed", {
          detail: { selectedId: entry.id },
        }),
      );
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="modal-card add-entry-modal refined-add-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Add MCDF entry"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="panel-title-row refined-modal-head">
          <div>
            <div className="eyebrow">Add entry</div>
            <h2>Add MCDF</h2>
          </div>
          <button
            type="button"
            className="modal-icon-close"
            onClick={onClose}
            aria-label="Close"
          >
            <SvgIcon name="close" />
          </button>
        </div>
        {step === "choose" ? (
          <div className="add-entry-choice-panel add-entry-intake-grid">
            <div className="local-import-dropzone">
              <div className="eyebrow">Device file</div>
              <h3>Add an MCDF from this computer</h3>
              <p className="empty-small">
                Choose a local package to inspect, frame, tag, and keep in your Library.
              </p>
              <PrimaryButton
                disabled={loading}
                title="Adds this MCDF to the local library. Registration is not required."
                onClick={chooseLocalMcdf}
              >
                {loading ? "Reading MCDF…" : "Choose MCDF…"}
              </PrimaryButton>
            </div>
            <div className="online-import-panel online-import-panel-compact">
              <div className="eyebrow">Internet source</div>
              <h3>Import from another place</h3>
              <p className="empty-small">
                Use Google Drive, a direct MCDF URL, or an MCDF Manager share code.
              </p>
              <PrimaryButton
                disabled={loading}
                onClick={() => setImportModalOpen(true)}
              >
                Import
              </PrimaryButton>
            </div>
            <div className="add-entry-progress-row">
              <AnalyzeProgressBar progress={progress} />
              <ErrorBox error={error} />
            </div>
          </div>
        ) : draft ? (
          <div className="add-entry-review-grid">
            <div className="add-preview-column">
              <button
                type="button"
                className="entry-detail-preview entry-detail-preview-button add-preview-picker"
                disabled={loading || previewImporting}
                onClick={() =>
                  draft.previewPath ? setDraftFramingOpen(true) : chooseDraftPreview()
                }
                title={draft.previewPath ? "Frame this preview image" : "Choose a preview image"}
              >
                {draft.previewPath && !draftPreviewImageFailed ? (
                  <img
                    src={displayImageSrc(draft.previewPath) || undefined}
                    alt={draft.title || draft.fileName}
                    style={previewImageStyle(draft.previewCrop)}
                    onError={() => setDraftPreviewImageFailed(true)}
                  />
                ) : (
                  <div className="preview-placeholder large"><SvgIcon name="empty-placeholder" /></div>
                )}
                <span className="preview-edit-chip">
                  {previewImporting ? "Saving picture…" : draft.previewPath ? "Frame picture" : "Add picture"}
                </span>
              </button>
            </div>
            <div className="add-entry-review-form">
              <label>
                <span>Display name</span>
                <Field
                  value={draft.title}
                  onChange={(event) =>
                    setDraft({ ...draft, title: event.target.value })
                  }
                  placeholder="Character or MCDF name"
                />
              </label>
              <label>
                <span>Description</span>
                <textarea
                  value={draft.description}
                  onChange={(event) =>
                    setDraft({ ...draft, description: event.target.value })
                  }
                  placeholder="Short description for your library"
                  rows={4}
                />
              </label>
              <label>
                <span>Tags</span>
                <Field
                  value={draft.tags}
                  onChange={(event) =>
                    setDraft({ ...draft, tags: event.target.value })
                  }
                  placeholder="Optional tags, comma separated"
                />
              </label>
              <div className="add-entry-detected-card">
                <div className="add-entry-detected-head">
                  <span>Detected information</span>
                  <small>Read from the selected MCDF</small>
                </div>
                <table className="add-entry-detected-table">
                  <tbody>
                    <tr>
                      <th>Files</th>
                      <td>{draft.fileCount ?? draft.files.length}</td>
                    </tr>
                    <tr>
                      <th>Size</th>
                      <td>
                        {formatBytes(
                          draft.totalBytes ??
                            draft.files.reduce((sum, file) => sum + file.length, 0),
                        )}
                      </td>
                    </tr>
                    <tr>
                      <th>Types</th>
                      <td>
                        {(
                          draft.componentKinds ||
                          kindsFromExtractedFiles(draft.files)
                        )
                          .slice(0, 8)
                          .join(", ") || "MCDF package"}
                      </td>
                    </tr>
                    {draft.info.description && (
                      <tr>
                        <th>Description</th>
                        <td>Available in package metadata</td>
                      </tr>
                    )}
                    {draft.packageHash && (
                      <tr>
                        <th>Package hash</th>
                        <td className="hash-cell">{shortHash(draft.packageHash)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <label className="adult-toggle-field">
                <input
                  type="checkbox"
                  checked={draft.isAdult}
                  onChange={(event) =>
                    setDraft({ ...draft, isAdult: event.target.checked })
                  }
                />
                <span className="adult-toggle-copy">
                  <strong>18+</strong>
                  <small>Mark this entry as adult content before adding it to the library.</small>
                </span>
              </label>
              <div className="hero-actions">
                <GhostButton
                  disabled={loading}
                  onClick={() => setStep("choose")}
                >
                  Back
                </GhostButton>
                <PrimaryButton disabled={loading || previewImporting} onClick={addDraftToLibrary}>
                  {loading ? "Adding…" : previewImporting ? "Saving picture…" : "Add to Library"}
                </PrimaryButton>
              </div>
            </div>
          </div>
        ) : null}
        {importModalOpen && (
          <div
            className="import-source-modal-overlay"
            role="presentation"
            onMouseDown={() => setImportModalOpen(false)}
          >
            <div
              className="modal-card import-source-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Import MCDF source"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="panel-title-row refined-modal-head">
                <div>
                  <div className="eyebrow">Import</div>
                  <h2>Import MCDF</h2>
                </div>
                <button
                  type="button"
                  className="modal-icon-close"
                  onClick={() => setImportModalOpen(false)}
                  aria-label="Close import options"
                >
                  <SvgIcon name="close" />
                </button>
              </div>
              <div className="online-import-modal-grid">
                <div className="online-import-group">
                  <h3>Google Drive or direct MCDF link</h3>
                  <Field
                    value={remoteUrl}
                    onChange={(e) => setRemoteUrl(e.target.value)}
                    placeholder="Google Drive or direct MCDF URL"
                  />
                  <Field
                    value={remotePreviewUrl}
                    onChange={(e) => setRemotePreviewUrl(e.target.value)}
                    placeholder="Preview image URL, optional"
                  />
                  <GhostButton
                    disabled={loading || !remoteUrl.trim()}
                    onClick={() => void chooseRemoteMcdf()}
                  >
                    {loading ? "Reading link…" : "Read link"}
                  </GhostButton>
                </div>
                <div className="online-import-group">
                  <h3>Share code or bulk import</h3>
                  <textarea
                    value={sharedImportText}
                    onChange={(e) => setSharedImportText(e.target.value)}
                    placeholder="mcdf.thebigtree.life:23147ff9...&#10;Paste one or more share codes, one per line"
                    rows={4}
                  />
                  <Field
                    value={sharedImportTag}
                    onChange={(e) => setSharedImportTag(e.target.value)}
                    placeholder="Optional tag for all imported entries"
                  />
                  <GhostButton
                    disabled={loading || !sharedImportText.trim()}
                    onClick={() => void importSharedEntries()}
                  >
                    {loading ? "Importing…" : "Import shared entries"}
                  </GhostButton>
                </div>
              </div>
            </div>
          </div>
        )}
        {draftFramingOpen && draft?.previewPath && (
          <PreviewFramingModal
            image={draft.previewPath}
            title={draft.title || draft.fileName}
            crop={normalizePreviewCrop(draft.previewCrop)}
            onClose={() => setDraftFramingOpen(false)}
            onChooseImage={chooseDraftPreview}
            onApply={(previewCrop) => {
              setDraft((current) =>
                current ? { ...current, previewCrop } : current,
              );
              setDraftFramingOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

function OnlineLibraryPanel({
  addOperation,
  finishOperation,
}: PanelProps & { sharedArchiveConnected?: boolean }) {
  const [entries, setEntries] = useState<LocalMcdfEntry[]>(() =>
    readLocalMcdfLibrary(),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [publicIndex, setPublicIndex] = useState<PublicIndexLatest | null>(
    null,
  );
  const [indexUrl] = useState(
    PUBLIC_INDEX_LATEST_URL,
  );
  const [serverUrl] = useState(configuredArchiveHost());
  const [serverToken] = useState(archiveActionToken() || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [autoImportMessage, setAutoImportMessage] = useState<string | null>(null);
  const [publishTitle, setPublishTitle] = useState("");
  const [publishDescription, setPublishDescription] = useState("");
  const [publishTags, setPublishTags] = useState("");
  const [publishPreviewPath, setPublishPreviewPath] = useState<string | null>(
    null,
  );
  const [entryFramingOpen, setEntryFramingOpen] = useState(false);
  const [layersEntry, setLayersEntry] = useState<LocalMcdfEntry | null>(null);
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryFilter, setLibraryFilter] = useState<
    | "all"
    | "local"
    | "remote"
    | "offline"
    | "server"
    | "online"
    | "subscribed"
    | "removed"
    | "failed"
    | "adult"
    | "blocked"
    | "restricted"
    | "potentially_illegal"
  >("all");
  const [libraryTagFilter, setLibraryTagFilter] = useState("");
  const [libraryFolderFilter, setLibraryFolderFilter] = useState("");
  const [librarySettings, setLibrarySettings] = useState<LocalLibrarySettings>(
    () => readLibrarySettings(),
  );
  const [publishIsAdult, setPublishIsAdult] = useState(false);
  const [publishVisibility, setPublishVisibility] =
    useState<McdfVisibility>("public");
  const [publishConsentThemeIds, setPublishConsentThemeIds] =
    useState<CharacterUseConsentThemeId[]>(() => [...CHARACTER_USE_CONSENT_THEME_IDS]);
  const [publishingRulesAccepted, setPublishingRulesAccepted] = useState(
    hasAcceptedPublishingRules(),
  );
  const [publishingRulesOpen, setPublishingRulesOpen] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState("");
  const [remotePreviewUrl, setRemotePreviewUrl] = useState("");
  const [sharedImportText, setSharedImportText] = useState("");
  const [sharedImportTag, setSharedImportTag] = useState("");
  const [previewImporting, setPreviewImporting] = useState(false);
  const [creatorSubscriptions, setCreatorSubscriptions] = useState<string[]>(
    () => readCreatorSubscriptions(),
  );
  const [packageSubscriptions, setPackageSubscriptions] = useState<string[]>(
    () => readPackageSubscriptions(),
  );
  const [packageSubscriptionSnapshots, setPackageSubscriptionSnapshots] =
    useState<Record<string, PackageSubscriptionSnapshot>>(() =>
      readPackageSubscriptionSnapshots(),
    );
  const [debugSettings, setDebugSettings] = useState<ClientDebugSettings>(() =>
    readClientDebugSettings(),
  );
  useEffect(() => {
    const syncPublishingRules = () =>
      setPublishingRulesAccepted(hasAcceptedPublishingRules());
    window.addEventListener(
      "mcdf-publishing-rules-accepted",
      syncPublishingRules,
    );
    window.addEventListener("storage", syncPublishingRules);
    return () => {
      window.removeEventListener(
        "mcdf-publishing-rules-accepted",
        syncPublishingRules,
      );
      window.removeEventListener("storage", syncPublishingRules);
    };
  }, []);

  const storedEntryHashes = new Set(
    entries
      .map((entry) => entry.package_hash_blake3)
      .filter(Boolean) as string[],
  );
  const publicPackages = (Array.isArray(publicIndex?.packages) ? publicIndex.packages : [])
    .map((pkg) => normalizePublicIndexPackageSummary(pkg))
    .filter((pkg): pkg is PublicIndexPackageSummary => Boolean(pkg));
  const publicPackagesByHash = new Map<string, PublicIndexPackageSummary>(
    publicPackages.map((pkg) => [pkg.package_hash_blake3, pkg]),
  );
  const publicIndexAssetUrl = (path?: string | null): string | null => {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    const base = indexUrl.replace(/\/indexes\/latest\.json(?:\?.*)?$/i, "");
    return `${base}/${path.replace(/^\/+/, "")}`;
  };
  const activeSubscribedPackages = publicPackages
    .filter(
      (pkg) =>
        (packageSubscriptions.includes(pkg.package_hash_blake3) ||
          creatorSubscriptions.includes(creatorKeyFromPackage(pkg))) &&
        !storedEntryHashes.has(pkg.package_hash_blake3),
    )
    .map((pkg) => ({
      pkg,
      removed: false,
      snapshot: packageSubscriptionSnapshots[pkg.package_hash_blake3],
    }));
  const removedSubscribedPackages = packageSubscriptions
    .filter(
      (hash) =>
        !storedEntryHashes.has(hash) &&
        !publicPackagesByHash.has(hash) &&
        packageSubscriptionSnapshots[hash],
    )
    .map((hash) => ({
      pkg: normalizePackageSubscriptionSnapshot(packageSubscriptionSnapshots[hash], hash),
      removed: true,
      snapshot: normalizePackageSubscriptionSnapshot(packageSubscriptionSnapshots[hash], hash),
    }))
    .filter((item): item is { pkg: PackageSubscriptionSnapshot; removed: true; snapshot: PackageSubscriptionSnapshot } => Boolean(item.pkg));
  const subscribedIndexEntries: LocalMcdfEntry[] = [
    ...activeSubscribedPackages,
    ...removedSubscribedPackages,
  ].map(({ pkg, removed }) => {
    const summary = pkg as PublicIndexPackageSummary;
    return {
      id: `${removed ? "removed" : "subscribed"}-${pkg.package_hash_blake3.slice(0, 24)}`,
      local_path: "",
      source_type: "indexed" as LocalMcdfSourceType,
      // Exchange subscriptions are backed by static package manifests, not direct
      // remote MCDF URLs. Keep source_url empty so generic URL code never tries to
      // download the manifest path as if it were an MCDF file.
      source_url: null,
      source_label: removed
        ? "Removed Exchange item"
        : packageSubscriptions.includes(pkg.package_hash_blake3)
          ? "Subscribed MCDF"
          : "Subscribed creator",
      source_owner_public_id: summary.owner_public_id || null,
      source_owner_display_name: summary.owner_display_name || null,
      source_package_hash_blake3: pkg.package_hash_blake3,
      remote_annotation: removed
        ? "This online MCDF was removed from The Eorzea Exchange after you subscribed to it. It remains here as a local subscription record so you can see what changed."
        : packageSubscriptions.includes(pkg.package_hash_blake3)
          ? "This online MCDF was added to My Library locally. It has not been downloaded to this machine yet."
          : "This item is from a subscribed creator in The Eorzea Exchange. It is listed in My Library so you can track it, but it has not been downloaded to this machine yet.",
      missing_registry_percent: null,
      original_filename: safeString(pkg.original_filename || pkg.title, `${pkg.package_hash_blake3.slice(0, 12)}.mcdf`),
      title: safeString(pkg.title || pkg.original_filename, "Untitled MCDF"),
      description: pkg.description || "",
      tags: stringArray(pkg.tags),
      preview_image_path: publicIndexAssetUrl(pkg.preview_image_path) || pkg.preview_image_path || null,
      preview_crop: normalizePreviewCropValue(pkg.preview_crop),
      is_adult: Boolean(pkg.is_adult),
      visibility: normalizeMcdfVisibilityValue(pkg.visibility),
      character_use_consent: packageCharacterUseConsentValue(pkg),
      package_hash_blake3: pkg.package_hash_blake3,
      file_count: finiteNumber(pkg.file_count),
      total_file_bytes: finiteNumber(pkg.total_file_bytes),
      component_kinds: stringArray(summary.component_kinds),
      file_manifest: [],
      sharing_policy: null,
      storage_state: (removed
        ? "removed"
        : "subscribed") as LocalMcdfStorageState,
      last_checked_at: nullableString(pkg.updated_at),
      last_published_at: nullableString(pkg.updated_at),
      manifest_url: removed ? null : pkg.package_manifest_path,
      download_url: removed ? null : pkg.download_manifest_path,
      notes: [
        removed
          ? "This subscribed Exchange item has been removed and can no longer be downloaded from the public index."
          : packageSubscriptions.includes(pkg.package_hash_blake3)
            ? "Subscribed Exchange item. Not downloaded yet."
            : "Subscribed creator item. Not downloaded yet.",
      ],
    };
  });
  const debugLibraryEntries = useMemo(
    () =>
      debugSettings.fakeLibraryEnabled
        ? generateFakeLibraryEntries(debugSettings.fakeLibraryCount)
        : [],
    [debugSettings.fakeLibraryEnabled, debugSettings.fakeLibraryCount],
  );
  const combinedEntries = [...debugLibraryEntries, ...subscribedIndexEntries, ...entries];
  const selectedEntry =
    combinedEntries.find((entry) => entry.id === selectedId) ?? null;
  const entryHasLocalFile = (
    entry: LocalMcdfEntry | null | undefined,
  ): boolean =>
    Boolean(
      entry &&
      (entry.source_type === "local_file" || !entry.source_type) &&
      entry.local_path &&
      entry.storage_state !== "subscribed" &&
      entry.storage_state !== "removed",
    );
  const entryListedPublicly = (
    entry: LocalMcdfEntry | null | undefined,
  ): boolean =>
    Boolean(
      entry?.package_hash_blake3 &&
      publicPackagesByHash.has(entry.package_hash_blake3) &&
      entry.storage_state === "online" &&
      (entry.visibility || "public") === "public",
    );
  const entryHasPublicExchangeRecord = (
    entry: LocalMcdfEntry | null | undefined,
  ): boolean =>
    Boolean(
      entry?.package_hash_blake3 &&
      publicPackagesByHash.has(entry.package_hash_blake3) &&
      entry.storage_state !== "removed" &&
      (entry.visibility || "public") === "public",
    );
  const exchangeOwnerForEntry = (entry: LocalMcdfEntry): { publicId: string; displayName: string } | null => {
    const publicRecord = entry.package_hash_blake3
      ? publicPackagesByHash.get(entry.package_hash_blake3)
      : null;
    const publicId =
      publicRecord?.owner_public_id ||
      entry.source_owner_public_id ||
      "";
    const displayName =
      publicRecord?.owner_display_name ||
      entry.source_owner_display_name ||
      publicId;
    return publicId ? { publicId, displayName } : null;
  };
  const entryReshareBlockReason = (entry: LocalMcdfEntry): string | null => {
    const owner = exchangeOwnerForEntry(entry);
    if (!owner) return null;
    const ownerKey = ownerIdentityKey(owner.publicId);
    const currentKey = currentPublisherOwnerKey();
    if (!ownerKey || !currentKey || ownerKey === currentKey) return null;
    return `This package is already an Exchange entry by ${owner.displayName || owner.publicId}. You can download, sync, and export it for personal use, but only the original owner can publish or re-share it on The Eorzea Exchange.`;
  };
  const entryUsesLocalOnlyMetadata = (entry: LocalMcdfEntry): boolean =>
    entry.storage_state === "subscribed" || Boolean(entryReshareBlockReason(entry));
  const librarySharingLabel = (entry: LocalMcdfEntry): string => {
    if (entry.sharing_policy?.status === "blocked") return "Disallowed";
    if (entryReshareBlockReason(entry)) return "Personal use";
    return "Can share";
  };
  const librarySharingClass = (entry: LocalMcdfEntry): string => {
    if (entry.sharing_policy?.status === "blocked") return "no loud";
    if (entryReshareBlockReason(entry)) return "partial";
    return "yes quiet";
  };
  const shareIdForEntry = (entry: LocalMcdfEntry): string | null => {
    const pkg = entry.package_hash_blake3
      ? publicPackagesByHash.get(entry.package_hash_blake3)
      : null;
    return pkg?.share_id || entry.package_hash_blake3 || null;
  };
  const exchangeShareCode = (entry: LocalMcdfEntry): string | null => {
    const shareId = shareIdForEntry(entry);
    return shareId ? `mcdf.thebigtree.life:${shareId}` : null;
  };
  const publicExchangeShareText = (entry: LocalMcdfEntry): string => {
    const shareCode = exchangeShareCode(entry);
    if (shareCode) return shareCode;
    return `mcdf.thebigtree.life:${entry.package_hash_blake3 || entry.id}`;
  };
  const entryPublicLabel = (entry: LocalMcdfEntry): string =>
    entryListedPublicly(entry)
      ? "public"
      : entry.storage_state === "removed"
        ? "removed"
        : entry.storage_state === "subscribed"
          ? "sync needed"
          : "not listed";
  const entryPublicClass = (entry: LocalMcdfEntry): string =>
    entryListedPublicly(entry)
      ? "status-good"
      : entry.storage_state === "removed"
        ? "status-bad"
        : entry.storage_state === "server" || entry.storage_state === "online"
          ? "status-warn"
          : "status-neutral";
  const entryStatusLabel = (entry: LocalMcdfEntry): string =>
    entryHasLocalFile(entry)
      ? "on device"
      : entry.storage_state === "online" && !entryListedPublicly(entry)
        ? "not listed"
        : stateLabel(entry.storage_state);
  const entryStatusClass = (entry: LocalMcdfEntry): string =>
    entryHasLocalFile(entry)
      ? "status-neutral"
      : entry.storage_state === "online" && !entryListedPublicly(entry)
        ? "status-warn"
        : stateClass(entry.storage_state);
  const detailTableRows = (
    entry: LocalMcdfEntry,
  ): Array<{ label: string; value: string; className?: string }> => {
    const rows: Array<{ label: string; value: string; className?: string }> = [];
    const addRow = (label: string, value: string | null | undefined, className?: string) => {
      const normalized = String(value || "").trim();
      if (!normalized) return;
      rows.push({ label, value: normalized, className });
    };

    addRow("Library", entryStatusLabel(entry), entryStatusClass(entry));
    addRow("Exchange", entryPublicLabel(entry), entryPublicClass(entry));
    addRow("Source", sourceLabel(entry), sourceClass(entry));
    addRow("Sharing", librarySharingLabel(entry), librarySharingClass(entry));
    addRow("Consent", consentSummary(entry.character_use_consent), "status-neutral");
    addRow("Files", `${entry.file_count}`, "status-neutral");
    addRow("Payload", formatBytes(entry.total_file_bytes), "status-neutral");
    if (entryIsAdult(entry)) addRow("Content", "18+", "status-warn");
    if (entry.sharing_policy?.status === "blocked") {
      addRow("Policy", entry.sharing_policy.label, sharingPolicyClass(entry.sharing_policy));
    }
    return rows;
  };
  const [addEntryModalOpen, setAddEntryModalOpen] = useState(false);
  const [editEntryDetails, setEditEntryDetails] = useState(false);
  const [detailsPaneOpen, setDetailsPaneOpen] = useState(true);
  useEffect(() => {
    const openAddEntry = () => setAddEntryModalOpen(true);
    const refreshSettings = () => setLibrarySettings(readLibrarySettings());
    const refreshLocalEntries = (event?: Event) => {
      setEntries(readLocalMcdfLibrary());
      const selected = (
        event as CustomEvent<{ selectedId?: string }> | undefined
      )?.detail?.selectedId;
      if (selected) {
        setSelectedId(selected);
        setDetailsPaneOpen(true);
      }
    };
    window.addEventListener("mcdf-open-add-entry", openAddEntry);
    window.addEventListener("mcdf-local-library-changed", refreshLocalEntries);
    const refreshSubscriptions = () => {
      setCreatorSubscriptions(readCreatorSubscriptions());
      setPackageSubscriptions(readPackageSubscriptions());
      setPackageSubscriptionSnapshots(readPackageSubscriptionSnapshots());
    };
    const refreshDebugSettings = () => setDebugSettings(readClientDebugSettings());
    window.addEventListener("mcdf-library-settings-changed", refreshSettings);
    window.addEventListener(CLIENT_DEBUG_SETTINGS_EVENT, refreshDebugSettings);
    window.addEventListener("storage", refreshDebugSettings);
    window.addEventListener(
      "mcdf-creator-subscriptions-changed",
      refreshSubscriptions,
    );
    window.addEventListener(
      "mcdf-package-subscriptions-changed",
      refreshSubscriptions,
    );
    return () => {
      window.removeEventListener("mcdf-open-add-entry", openAddEntry);
      window.removeEventListener(
        "mcdf-local-library-changed",
        refreshLocalEntries,
      );
      window.removeEventListener(
        "mcdf-library-settings-changed",
        refreshSettings,
      );
      window.removeEventListener(CLIENT_DEBUG_SETTINGS_EVENT, refreshDebugSettings);
      window.removeEventListener("storage", refreshDebugSettings);
      window.removeEventListener(
        "mcdf-creator-subscriptions-changed",
        refreshSubscriptions,
      );
      window.removeEventListener(
        "mcdf-package-subscriptions-changed",
        refreshSubscriptions,
      );
    };
  }, []);

  useEffect(() => {
    void scanAutoImportFolders(true);
    const interval = window.setInterval(() => {
      void scanAutoImportFolders(true);
    }, 120000);
    return () => window.clearInterval(interval);
  }, []);

  const availableLibraryTags = Array.from(
    new Set(
      combinedEntries
        .flatMap((entry) => stringArray(entry.tags))
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));
  const promotedLibraryFolders = librarySettings.libraryFolderTags.filter((tag) =>
    availableLibraryTags.includes(tag),
  );

  const promoteSelectedTagToFolder = () => {
    const tag = (libraryTagFilter || librarySearch.replace(/^#/, "")).trim().toLowerCase();
    if (!tag) {
      setActionMessage("Choose a tag first, then pin it as a folder.");
      return;
    }
    const nextFolders = Array.from(new Set([tag, ...librarySettings.libraryFolderTags])).slice(0, 32);
    saveLibrarySettings({ libraryFolderTags: nextFolders });
    setLibraryFolderFilter(tag);
    setActionMessage(`#${tag} is now shown as a Library folder.`);
  };

  const removeCurrentFolder = () => {
    if (!libraryFolderFilter) return;
    const nextFolders = librarySettings.libraryFolderTags.filter((tag) => tag !== libraryFolderFilter);
    saveLibrarySettings({ libraryFolderTags: nextFolders });
    setLibraryFolderFilter("");
    setActionMessage("Library folder removed. Entries and tags were not changed.");
  };

  const filteredEntries = combinedEntries.filter((entry) => {
    const haystack =
      `${entry.title || ""} ${entry.original_filename || ""} ${entry.description || ""} ${stringArray(entry.tags).join(" ")} ${stringArray(entry.component_kinds).join(" ")} ${entry.source_url || ""}`.toLowerCase();
    const matchesSearch =
      !librarySearch.trim() ||
      haystack.includes(librarySearch.trim().toLowerCase());
    const adult = entryIsAdult(entry);
    const adultVisible =
      librarySettings.adultContentMode === "show" ||
      !adult ||
      libraryFilter === "adult";
    const matchesFilter =
      libraryFilter === "all" ||
      (libraryFilter === "local" && !isRemoteEntry(entry)) ||
      (libraryFilter === "remote" && isRemoteEntry(entry)) ||
      (libraryFilter === "adult" && adult) ||
      (libraryFilter === "blocked" &&
        entry.sharing_policy?.status === "blocked") ||
      (libraryFilter === "restricted" &&
        entry.sharing_policy?.classification === "restricted") ||
      (libraryFilter === "potentially_illegal" &&
        entry.sharing_policy?.classification === "potentially_illegal") ||
      entry.storage_state === libraryFilter;
    const entryTags = stringArray(entry.tags).map((tag) => tag.toLowerCase());
    const matchesTagFilter = !libraryTagFilter || entryTags.includes(libraryTagFilter);
    const matchesFolderFilter = !libraryFolderFilter || entryTags.includes(libraryFolderFilter);
    return matchesSearch && matchesFilter && adultVisible && matchesTagFilter && matchesFolderFilter;
  });

  const closeDetailsWhenClickingOutside = (
    event: MouseEvent<HTMLDivElement>,
  ) => {
    if (!detailsPaneOpen) return;
    const target = event.target as HTMLElement;
    if (
      target.closest(".elevated-detail-pane") ||
      target.closest(".library-table-row") ||
      target.closest(".library-card") ||
      target.closest(".modal-card")
    )
      return;
    setDetailsPaneOpen(false);
  };

  const saveEntries = (next: LocalMcdfEntry[]) => {
    setEntries(next);
    writeLocalMcdfLibrary(next);
    if (
      selectedId &&
      !selectedId.startsWith("subscribed-") &&
      !next.some((entry) => entry.id === selectedId)
    )
      setSelectedId(null);
  };

  const entryFromAutoImportCandidate = (candidate: AutoImportCandidate, existing?: LocalMcdfEntry): LocalMcdfEntry => ({
    id: existing?.id || localEntryId(candidate.local_path),
    local_path: candidate.local_path,
    source_type: "local_file",
    source_url: null,
    source_label: "Auto-import folder",
    source_owner_public_id: existing?.source_owner_public_id || null,
    source_owner_display_name: existing?.source_owner_display_name || null,
    source_package_hash_blake3: existing?.source_package_hash_blake3 || null,
    remote_annotation: "Imported automatically from a configured folder.",
    missing_registry_percent: null,
    original_filename: candidate.original_filename,
    title: existing?.title || candidate.title,
    description: existing?.description || candidate.description || "",
    tags: existing?.tags || [],
    preview_image_path: existing?.preview_image_path || null,
    preview_crop: existing?.preview_crop || null,
    is_adult: existing?.is_adult || false,
    visibility: existing?.visibility || "public",
    package_hash_blake3: candidate.package_hash_blake3,
    file_count: candidate.file_count,
    total_file_bytes: candidate.total_file_bytes,
    component_kinds: candidate.component_kinds || [],
    file_manifest: candidate.file_manifest || [],
    sharing_policy: existing?.sharing_policy || null,
    storage_state: existing?.storage_state || "offline",
    last_checked_at: new Date().toISOString(),
    last_published_at: existing?.last_published_at || null,
    manifest_url: existing?.manifest_url || null,
    download_url: existing?.download_url || null,
    notes: [
      ...(candidate.notes || []),
      ...(existing?.notes || []),
    ].filter(Boolean),
  });

  const scanAutoImportFolders = async (quiet = false) => {
    setLoading(true);
    if (!quiet) {
      setError(null);
      setAutoImportMessage("Scanning watched folders…");
    }
    try {
      const settings = await invoke<StorageSettingsResponse>(
        "get_storage_settings",
      );
      const folders = settings.auto_import_dirs || [];
      if (!folders.length) {
        if (!quiet) setAutoImportMessage("No watched auto-import folders are configured yet.");
        return;
      }
      let current = readLocalMcdfLibrary();
      let imported = 0;
      let scanned = 0;
      const notes: string[] = [];
      for (const folder of folders) {
        const result = await invoke<AutoImportFolderResult>(
          "scan_auto_import_folder",
          { folder, recursive: settings.auto_import_recursive },
        );
        scanned += result.scanned_file_count;
        notes.push(...(result.notes || []));
        for (const candidate of result.entries || []) {
          const existing = current.find(
            (entry) =>
              entry.local_path === candidate.local_path ||
              (candidate.package_hash_blake3 &&
                entry.package_hash_blake3 === candidate.package_hash_blake3),
          );
          if (existing) continue;
          const entry = entryFromAutoImportCandidate(candidate);
          current = [entry, ...current];
          imported += 1;
        }
      }
      saveEntries(current);
      const message = `${imported} new MCDF${imported === 1 ? "" : "s"} imported · ${scanned} file${scanned === 1 ? "" : "s"} scanned`;
      setAutoImportMessage(notes.length ? `${message}. ${notes[0]}` : message);
    } catch (e) {
      if (!quiet) setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const saveLibrarySettings = (patch: Partial<LocalLibrarySettings>) => {
    const next = { ...librarySettings, ...patch };
    setLibrarySettings(next);
    writeLibrarySettings(next);
  };

  const updateEntry = (id: string, patch: Partial<LocalMcdfEntry>) => {
    saveEntries(
      entries.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry,
      ),
    );
  };

  const choosePreview = async () => {
    try {
      const selected = await openDialog({
        multiple: false,
        filters: [
          {
            name: "Preview image",
            extensions: ["png", "jpg", "jpeg", "webp", "gif"],
          },
        ],
      });
      if (!selected || Array.isArray(selected)) return;
      const cached = await cachePreviewImageForLibrary(selected);
      setPublishPreviewPath(cached);
      if (
        selectedEntry &&
        !selectedEntry.id.startsWith("subscribed-") &&
        !selectedEntry.id.startsWith("removed-")
      )
        updateEntry(selectedEntry.id, {
          preview_image_path: cached,
          preview_crop: DEFAULT_PREVIEW_CROP,
        });
      setEntryFramingOpen(true);
    } catch (e) {
      setError(`Preview image picker failed: ${String(e)}`);
    }
  };

  const clearPreview = () => {
    setPublishPreviewPath(null);
    if (
      selectedEntry &&
      !selectedEntry.id.startsWith("subscribed-") &&
      !selectedEntry.id.startsWith("removed-")
    )
      updateEntry(selectedEntry.id, { preview_image_path: null, preview_crop: null });
  };

  const addMcdfToLibrary = async () => {
    setLoading(true);
    setError(null);
    try {
      const selected = await openDialog({
        multiple: false,
        filters: [{ name: "MCDF", extensions: ["mcdf"] }],
      });
      if (!selected || Array.isArray(selected)) return;
      const [info, files] = await Promise.all([
        invoke<MCDFInfo>("scan_mcdf", { path: selected }),
        invoke<ExtractedFileInfo[]>("inspect_mcdf_files", { path: selected }),
      ]);
      const fileName = basename(selected);
      const existing = entries.find((entry) => entry.local_path === selected);
      const entry: LocalMcdfEntry = {
        id: existing?.id || localEntryId(selected),
        local_path: selected,
        source_type: "local_file",
        source_url: null,
        source_label: "Device file",
        remote_annotation: null,
        missing_registry_percent: null,
        original_filename: fileName,
        title: existing?.title || fileName.replace(/\.mcdf$/i, ""),
        description: existing?.description || info.description || "",
        tags: existing?.tags || [],
        preview_image_path: existing?.preview_image_path || null,
        is_adult: existing?.is_adult || false,
        visibility: existing?.visibility || "public",
        package_hash_blake3: existing?.package_hash_blake3 || null,
        file_count: files.length,
        total_file_bytes: files.reduce((sum, file) => sum + file.length, 0),
        component_kinds: kindsFromExtractedFiles(files),
        file_manifest: fileManifestFromExtractedFiles(files),
        sharing_policy: existing?.sharing_policy || null,
        storage_state: existing?.storage_state || "offline",
        last_checked_at: new Date().toISOString(),
        last_published_at: existing?.last_published_at || null,
        manifest_url: existing?.manifest_url || null,
        download_url: existing?.download_url || null,
        notes: [
          "Added to the local library. It is available for local use and publishing from My Library.",
          ...(info.description
            ? ["MCDF description was imported into the local entry."]
            : []),
        ],
      };
      const next = [entry, ...entries.filter((item) => item.id !== entry.id)];
      saveEntries(next);
      setSelectedId(entry.id);
      setPublishTitle(entry.title);
      setPublishDescription(entry.description);
      setPublishTags(entry.tags.join(", "));
      setPublishPreviewPath(entry.preview_image_path || null);
      setAddEntryModalOpen(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const addRemoteEntry = async () => {
    const trimmedUrl = remoteUrl.trim();
    if (!trimmedUrl) {
      setError("Paste a Google Drive or direct MCDF URL first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const scanned = await invoke<RemoteMcdfScanResult>(
        "scan_remote_mcdf_metadata",
        { url: trimmedUrl },
      );
      const sourceType = remoteSourceTypeFromUrl(trimmedUrl);
      const entry: LocalMcdfEntry = {
        id: `remote-${scanned.package_hash_blake3.slice(0, 24)}`,
        local_path: "",
        source_type: sourceType,
        source_url: trimmedUrl,
        source_label:
          sourceType === "google_drive" ? "Google Drive" : "Direct URL",
        remote_annotation:
          "Remote entry scanned through a temporary download. The MCDF was removed from temp storage after metadata extraction.",
        missing_registry_percent: null,
        original_filename: scanned.original_filename,
        title: publishTitle.trim() || scanned.title,
        description: publishDescription.trim() || scanned.description || "",
        tags: tagsFromText(publishTags),
        preview_image_path: remotePreviewUrl.trim() || null,
        is_adult: publishIsAdult,
        package_hash_blake3: scanned.package_hash_blake3,
        file_count: scanned.file_count,
        total_file_bytes: scanned.total_file_bytes || scanned.package_size,
        component_kinds: scanned.component_kinds,
        file_manifest: [],
        sharing_policy: null,
        storage_state: "offline",
        last_checked_at: new Date().toISOString(),
        last_published_at: null,
        manifest_url: null,
        download_url: null,
        notes: [
          ...scanned.notes,
          "Remote source has been added as an annotated library entry. Publishing can index it later without keeping the temporary MCDF locally.",
          "Registry availability is checked during publishing and server-side processing.",
        ],
      };
      const next = [entry, ...entries.filter((item) => item.id !== entry.id)];
      saveEntries(next);
      setSelectedId(entry.id);
      setPublishTitle(entry.title);
      setPublishDescription(entry.description);
      setPublishTags(entry.tags.join(", "));
      setPublishPreviewPath(entry.preview_image_path || null);
      setRemoteUrl("");
      setRemotePreviewUrl("");
      setAddEntryModalOpen(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const downloadSubscribedEntry = async (entry = selectedEntry) => {
    if (!entry || entry.storage_state !== "subscribed") return;
    const manifestPath = entry.download_url || entry.manifest_url || "";
    if (!manifestPath) {
      setError(
        "This subscribed item does not include a downloadable public manifest yet.",
      );
      return;
    }
    const selected = await save({
      defaultPath: `${entry.original_filename.replace(/\.mcdf$/i, "")}.rebuilt.mcdf`,
      filters: [{ name: "MCDF", extensions: ["mcdf"] }],
    });
    if (!selected || Array.isArray(selected)) return;
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<ArchiveDownloadResult>(
        "download_package_from_exchange_index",
        {
          indexUrl,
          packageManifestPath: manifestPath,
          serverUrl: configuredArchiveHost(),
          outputPath: selected,
        },
      );
      const downloadedEntry: LocalMcdfEntry = {
        ...entry,
        id: localEntryId(result.output_path),
        local_path: result.output_path,
        source_type: "local_file",
        source_label: "Downloaded from Exchange",
        source_owner_public_id: entry.source_owner_public_id || (entry.package_hash_blake3 ? publicPackagesByHash.get(entry.package_hash_blake3)?.owner_public_id : null) || null,
        source_owner_display_name: entry.source_owner_display_name || (entry.package_hash_blake3 ? publicPackagesByHash.get(entry.package_hash_blake3)?.owner_display_name : null) || null,
        source_package_hash_blake3: entry.source_package_hash_blake3 || entry.package_hash_blake3 || null,
        remote_annotation: "Downloaded from a public Exchange entry. You can keep, sync, and export it, but only the original owner can publish this package back to the Exchange.",
        storage_state: "online",
        last_checked_at: new Date().toISOString(),
        notes: [
          "Downloaded from The Eorzea Exchange into the local library.",
          ...(entry.notes || []),
        ],
      };
      const nextPackageSubscriptions = packageSubscriptions.filter(
        (hash) => hash !== entry.package_hash_blake3,
      );
      setPackageSubscriptions(nextPackageSubscriptions);
      writePackageSubscriptions(nextPackageSubscriptions);
      if (entry.package_hash_blake3)
        removePackageSubscriptionSnapshot(entry.package_hash_blake3);
      saveEntries([
        downloadedEntry,
        ...entries.filter((entry) => entry.id !== downloadedEntry.id),
      ]);
      setSelectedId(downloadedEntry.id);
      window.dispatchEvent(new Event("mcdf-creator-subscriptions-changed"));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const entryCanSyncSource = (entry: LocalMcdfEntry): boolean => {
    if (entry.storage_state === "removed") return false;
    if (entry.source_url && entry.source_type !== "local_file") return true;
    return Boolean(
      entry.storage_state === "subscribed" &&
        (entry.download_url || entry.manifest_url),
    );
  };

  const entryCanDownloadDirect = (entry: LocalMcdfEntry): boolean =>
    Boolean(
      localEntryHasLocalFile(entry) ||
        (entry.source_url && entry.source_type !== "local_file") ||
        (entry.storage_state === "subscribed" &&
          (entry.download_url || entry.manifest_url)),
    );

  const downloadEntryToPath = async (
    entry: LocalMcdfEntry,
    outputPath: string,
  ): Promise<ArchiveDownloadResult> => {
    const manifestPath = entry.download_url || entry.manifest_url || "";
    if (entry.storage_state === "subscribed" && manifestPath) {
      return invoke<ArchiveDownloadResult>("download_package_from_exchange_index", {
        indexUrl,
        packageManifestPath: manifestPath,
        serverUrl: configuredArchiveHost(),
        outputPath,
      });
    }
    if (localEntryHasLocalFile(entry)) {
      const exported = await invoke<ExportLocalMcdfResult>("export_local_mcdf_file", {
        sourcePath: entry.local_path,
        outputPath,
      });
      return {
        output_path: exported.output_path,
        bytes_written: exported.bytes_written,
        package_hash_blake3: entry.package_hash_blake3 || "",
      };
    }
    if (entry.source_url && entry.source_type !== "local_file") {
      return invoke<ArchiveDownloadResult>("download_remote_mcdf_to_file", {
        sourceUrl: entry.source_url,
        outputPath,
        expectedPackageHash: entry.package_hash_blake3 || null,
      });
    }
    throw new Error(
      "This library entry has no local file, remote source, or downloadable Exchange manifest.",
    );
  };

  const directDownloadEntry = async (entry: LocalMcdfEntry) => {
    if (!entryCanDownloadDirect(entry)) {
      setError("This library entry does not include a downloadable source yet.");
      return;
    }
    const selected = await save({
      defaultPath: safeDownloadFilename(entry.original_filename || entry.title),
      filters: [{ name: "MCDF", extensions: ["mcdf"] }],
    });
    if (!selected || Array.isArray(selected)) return;
    const opId = addOperation({
      kind: "download",
      label: `Download ${entry.title || entry.original_filename}`,
      stage: {
        percent: 25,
        label: "Downloading MCDF",
        detail: entry.source_url
          ? "Downloading from the original internet source."
          : localEntryHasLocalFile(entry)
            ? "Copying from the local library source."
            : "Downloading from the static Exchange package manifest.",
      },
    });
    setLoading(true);
    setError(null);
    try {
      const result = await downloadEntryToPath(entry, selected);
      finishOperation(opId, {
        status: "done",
        bytesDone: result.bytes_written,
        bytesTotal: result.bytes_written,
        message: `Downloaded to ${result.output_path}`,
        stage: { percent: 100, label: "Download complete", detail: formatBytes(result.bytes_written) },
      });
      setActionMessage(
        result.download_note
          ? `Downloaded MCDF to ${result.output_path}. ${result.download_note}`
          : `Downloaded MCDF to ${result.output_path}`,
      );
    } catch (e) {
      const message = String(e);
      finishOperation(opId, {
        status: "failed",
        message,
        stage: { percent: 100, label: "Download failed", detail: message },
      });
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const syncLibraryEntrySource = async (entry: LocalMcdfEntry) => {
    if (!entryCanSyncSource(entry)) {
      setError("This entry has no internet source to sync.");
      return;
    }
    const cacheDir = await invoke<string>("get_cache_dir");
    const cacheName = safeDownloadFilename(
      `${entry.package_hash_blake3?.slice(0, 12) || entry.id}-${entry.original_filename || entry.title}`,
    );
    const outputPath = `${cacheDir}/synced-packages/${cacheName}`;
    const opId = addOperation({
      kind: "sync",
      label: `Sync ${entry.title || entry.original_filename}`,
      stage: {
        percent: 20,
        label: "Syncing source",
        detail: entry.source_url
          ? "Downloading the original internet source into a synced package cache."
          : "Rebuilding the Exchange package into a synced package cache.",
      },
    });
    setLoading(true);
    setError(null);
    try {
      const result = await downloadEntryToPath(entry, outputPath);
      const [info, files] = await Promise.all([
        invoke<MCDFInfo>("scan_mcdf", { path: result.output_path }),
        invoke<ExtractedFileInfo[]>("inspect_mcdf_files", { path: result.output_path }),
      ]);
      const syncedEntry: LocalMcdfEntry = {
        ...entry,
        id: entry.id.startsWith("subscribed-") || entry.id.startsWith("removed-")
          ? localEntryId(result.output_path)
          : entry.id,
        local_path: result.output_path,
        source_url: entry.storage_state === "subscribed" ? null : entry.source_url,
        source_label: entry.storage_state === "subscribed" ? "Synced Exchange item" : entry.source_label,
        remote_annotation: entry.storage_state === "subscribed"
          ? "Temporarily cached from the public Exchange package manifest. You can inspect and export it while cached, but only the original owner can publish or re-share it."
          : entry.source_url
            ? "Temporarily cached from the original internet source. The source URL is still kept so it can be refreshed later."
            : "Temporarily cached from the public Exchange package manifest.",
        storage_state: "online",
        last_checked_at: new Date().toISOString(),
        description: entry.description || info.description || "",
        package_hash_blake3: result.package_hash_blake3 || entry.package_hash_blake3,
        file_count: files.length,
        total_file_bytes: files.reduce((sum, file) => sum + file.length, 0),
        component_kinds: kindsFromExtractedFiles(files),
        file_manifest: fileManifestFromExtractedFiles(files),
        notes: [
          `Temporarily cached source at ${result.output_path}`,
          ...(entry.notes || []),
        ],
      };
      const nextPackageSubscriptions = entry.package_hash_blake3
        ? packageSubscriptions.filter((hash) => hash !== entry.package_hash_blake3)
        : packageSubscriptions;
      if (nextPackageSubscriptions !== packageSubscriptions) {
        setPackageSubscriptions(nextPackageSubscriptions);
        writePackageSubscriptions(nextPackageSubscriptions);
        if (entry.package_hash_blake3) removePackageSubscriptionSnapshot(entry.package_hash_blake3);
      }
      saveEntries([
        syncedEntry,
        ...entries.filter((item) => item.id !== syncedEntry.id),
      ]);
      setSelectedId(syncedEntry.id);
      finishOperation(opId, {
        status: "done",
        bytesDone: result.bytes_written,
        bytesTotal: result.bytes_written,
        message: `Cached temporarily at ${result.output_path}`,
        stage: { percent: 100, label: "Sync complete", detail: formatBytes(result.bytes_written) },
      });
      setActionMessage(`Temporarily cached MCDF source at ${result.output_path}. Use Export when you want a permanent copy outside MCDF Manager.`);
    } catch (e) {
      const message = String(e);
      finishOperation(opId, {
        status: "failed",
        message,
        stage: { percent: 100, label: "Sync failed", detail: message },
      });
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const shareEntry = async (entry: LocalMcdfEntry) => {
    if (!entryHasPublicExchangeRecord(entry)) {
      setError("Only public Exchange entries can be shared from this action.");
      return;
    }
    setError(null);
    const text = publicExchangeShareText(entry);
    try {
      await navigator.clipboard.writeText(text);
      setActionMessage("Share reference copied to clipboard.");
    } catch {
      setActionMessage(text);
    }
  };

  const exportLocalEntry = async (entry: LocalMcdfEntry) => {
    if (!entryHasLocalFile(entry)) {
      setError(
        "This library entry has not been temporarily cached on this machine yet. Use Sync source for inspection/export, or use Download MCDF to save a permanent copy directly from its source.",
      );
      return;
    }
    const defaultName =
      (
        entry.original_filename || basename(entry.local_path || "export.mcdf")
      ).replace(/\.mcdf$/i, "") + ".mcdf";
    const selected = await save({
      defaultPath: defaultName,
      filters: [{ name: "MCDF", extensions: ["mcdf"] }],
    });
    if (!selected || Array.isArray(selected)) return;
    const opId = addOperation({
      kind: "download",
      label: `Export ${entry.title || entry.original_filename}`,
      stage: {
        percent: 30,
        label: "Exporting local MCDF",
        detail: "Copying the selected library file to the chosen destination.",
      },
    });
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<ExportLocalMcdfResult>(
        "export_local_mcdf_file",
        { sourcePath: entry.local_path, outputPath: selected },
      );
      finishOperation(opId, {
        status: "done",
        bytesDone: result.bytes_written,
        bytesTotal: result.bytes_written,
        message: `Exported to ${result.output_path}`,
        stage: {
          percent: 100,
          label: "Export complete",
          detail: formatBytes(result.bytes_written),
        },
      });
      setActionMessage(`Exported MCDF to ${result.output_path}`);
    } catch (e) {
      const message = String(e);
      finishOperation(opId, {
        status: "failed",
        message,
        stage: { percent: 100, label: "Export failed", detail: message },
      });
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const publishEntry = (entry: LocalMcdfEntry) => {
    selectEntry(entry);
    void publishSelected(entry);
  };

  const removeEntry = (entry: LocalMcdfEntry) => {
    removeSelected(entry);
  };

  const entryCanPublish = (entry: LocalMcdfEntry): boolean =>
    Boolean(
      entry.storage_state !== "subscribed" &&
      entry.storage_state !== "removed" &&
      hasStoredClientAuth() &&
      !isRemoteEntry(entry) &&
      publishingRulesAccepted &&
      entry.sharing_policy?.status !== "blocked" &&
      !entryReshareBlockReason(entry),
    );
  const LibraryEntryActions = ({
    entry,
    compact = false,
  }: {
    entry: LocalMcdfEntry;
    compact?: boolean;
  }) => (
    <div
      className={`library-action-cluster ${compact ? "compact" : ""}`}
      onClick={(event) => event.stopPropagation()}
    >
      <IconButton
        label={
          entryHasPublicExchangeRecord(entry)
            ? "Copy public Exchange share reference"
            : "Share unavailable until this entry is public"
        }
        disabled={loading || !entryHasPublicExchangeRecord(entry)}
        className="library-action-button"
        onClick={() => void shareEntry(entry)}
      >
        <SvgIcon name="open-location" />
      </IconButton>
      <IconButton
        label="Download MCDF directly"
        disabled={loading || !entryCanDownloadDirect(entry)}
        className="library-action-button"
        onClick={() => void directDownloadEntry(entry)}
      >
        <SvgIcon name="download" />
      </IconButton>
      <IconButton
        label="Sync internet source to this library"
        disabled={loading || !entryCanSyncSource(entry)}
        className="library-action-button"
        onClick={() => void syncLibraryEntrySource(entry)}
      >
        <SvgIcon name="sync" />
      </IconButton>
      <IconButton
        label="Export synced/local MCDF from library"
        disabled={loading || !entryHasLocalFile(entry)}
        className="library-action-button"
        onClick={() => void exportLocalEntry(entry)}
      >
        <SvgIcon name="export" />
      </IconButton>
      <IconButton
        label={
          entry.sharing_policy?.status === "blocked"
            ? "Publishing blocked by sharing policy"
            : entryReshareBlockReason(entry) || "Publish to The Eorzea Exchange"
        }
        disabled={loading || !entryCanPublish(entry)}
        className="library-action-button"
        onClick={() => publishEntry(entry)}
      >
        <SvgIcon name="publish" />
      </IconButton>
      <IconButton
        label={
          entry.storage_state === "subscribed" ||
          entry.storage_state === "removed"
            ? "Hold Ctrl and click to remove subscription"
            : "Hold Ctrl and click to remove from library"
        }
        disabled={loading}
        className="library-action-button danger"
        onClick={(event) => {
          if (!event.ctrlKey) {
            setActionMessage(
              entry.storage_state === "subscribed" || entry.storage_state === "removed"
                ? "Hold Ctrl and click Remove to remove this subscription."
                : "Hold Ctrl and click Remove to remove this MCDF from the library.",
            );
            return;
          }
          removeEntry(entry);
        }}
      >
        <SvgIcon name="remove-local" />
      </IconButton>
    </div>
  );

  const removeSelected = (entry = selectedEntry) => {
    if (!entry) return;
    if (
      entry.storage_state === "subscribed" ||
      entry.storage_state === "removed"
    ) {
      const selectedPackageHash = entry.package_hash_blake3 || "";
      if (
        selectedPackageHash &&
        packageSubscriptions.includes(selectedPackageHash)
      ) {
        const nextPackageSubscriptions = packageSubscriptions.filter(
          (id) => id !== selectedPackageHash,
        );
        setPackageSubscriptions(nextPackageSubscriptions);
        writePackageSubscriptions(nextPackageSubscriptions);
        removePackageSubscriptionSnapshot(selectedPackageHash);
      } else {
        const matchedPackage = publicPackages.find(
          (pkg) => pkg.package_hash_blake3 === selectedPackageHash,
        );
        const creatorId = matchedPackage
          ? creatorKeyFromPackage(matchedPackage)
          : null;
        if (creatorId) {
          const nextSubscriptions = creatorSubscriptions.filter(
            (id) => id !== creatorId,
          );
          setCreatorSubscriptions(nextSubscriptions);
          writeCreatorSubscriptions(nextSubscriptions);
        }
      }
      window.dispatchEvent(new Event("mcdf-creator-subscriptions-changed"));
      setSelectedId(null);
      return;
    }
    const next = entries.filter((item) => item.id !== entry.id);
    saveEntries(next);
    setSelectedId(next[0]?.id ?? null);
  };

  const loadIndexState = async () => {
    setLoading(true);
    setError(null);
    try {
      const latest = await invoke<PublicIndexLatest>(
        "fetch_public_marketplace_index",
        { indexUrl },
      );
      const normalizedPackages = (Array.isArray(latest.packages) ? latest.packages : [])
        .map((pkg) => normalizePublicIndexPackageSummary(pkg))
        .filter((pkg): pkg is PublicIndexPackageSummary => Boolean(pkg));
      setPublicIndex({ ...latest, packages: normalizedPackages });
      const onlinePackages = new Map(
        normalizedPackages.map((pkg) => [pkg.package_hash_blake3, pkg]),
      );
      const next = entries.map((entry) => {
        const publicPackage = entry.package_hash_blake3
          ? onlinePackages.get(entry.package_hash_blake3)
          : null;
        if (publicPackage) {
          return {
            ...entry,
            source_owner_public_id:
              entry.source_owner_public_id || publicPackage.owner_public_id || null,
            source_owner_display_name:
              entry.source_owner_display_name || publicPackage.owner_display_name || null,
            source_package_hash_blake3:
              entry.source_package_hash_blake3 || publicPackage.package_hash_blake3,
            storage_state: "online" as LocalMcdfStorageState,
            last_checked_at: new Date().toISOString(),
          };
        }
        if (entry.storage_state === "online") {
          return {
            ...entry,
            storage_state: "removed" as LocalMcdfStorageState,
            last_checked_at: new Date().toISOString(),
            notes: [
              "This MCDF is no longer listed in The Eorzea Exchange. It was previously online but has been removed from the public index.",
              ...(entry.notes || []),
            ],
          };
        }
        return { ...entry, last_checked_at: new Date().toISOString() };
      });
      saveEntries(next);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const checkLibrarySharingPolicy = async () => {
    const token = storedAdminToken().trim() || archiveActionToken();
    if (!token) {
      setError(
        "A moderation/admin token is required to check local entries against the restricted and potentially illegal hash list.",
      );
      return;
    }
    const opId = addOperation({
      kind: "scan",
      label: "Check library sharing policy",
      stage: {
        percent: 10,
        label: "Loading moderation hashes",
        detail:
          "Checking package and file BLAKE3 hashes against the moderation blocklist.",
      },
      message: "Checking moderation hash list",
    });
    setLoading(true);
    setError(null);
    try {
      const blocks = await invoke<ModerationBlocklistResponse>(
        "fetch_moderation_blocklist",
        { serverUrl, bearerToken: token },
      );
      const checkedAt = new Date().toISOString();
      const next = entries.map((entry) => ({
        ...entry,
        sharing_policy: sharingPolicyForEntry(entry, blocks, checkedAt),
        last_checked_at: checkedAt,
      }));
      saveEntries(next);
      const blocked = next.filter(
        (entry) => entry.sharing_policy?.status === "blocked",
      ).length;
      finishOperation(opId, {
        status: "done",
        message: `${next.length} entries checked · ${blocked} blocked from sharing`,
        stage: {
          percent: 100,
          label: "Sharing policy checked",
          detail: `${blocked} local entries contain a blocked package or file hash.`,
        },
      });
    } catch (e) {
      const message = String(e);
      finishOperation(opId, {
        status: "failed",
        message,
        stage: { percent: 100, label: "Policy check failed", detail: message },
      });
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const refreshEntrySharingPolicy = async (entry: LocalMcdfEntry): Promise<LocalSharingPolicy | null> => {
    const token = storedAdminToken().trim() || archiveActionToken();
    if (!token) return null;
    const blocks = await invoke<ModerationBlocklistResponse>(
      "fetch_moderation_blocklist",
      { serverUrl, bearerToken: token },
    );
    const checkedAt = new Date().toISOString();
    const policy = sharingPolicyForEntry(entry, blocks, checkedAt);
    updateEntry(entry.id, { sharing_policy: policy, last_checked_at: checkedAt });
    return policy;
  };

  const refreshSelectedSharingPolicy = async () => {
    if (!selectedEntry) return;
    const token = storedAdminToken().trim() || archiveActionToken();
    if (!token) {
      setError(
        "Admin or moderation access is required to refresh local sharing policy before publishing. The registry still enforces blocked hashes during upload.",
      );
      return;
    }
    const opId = addOperation({
      kind: "scan",
      label: "Refresh moderation status",
      stage: {
        percent: 20,
        label: "Checking moderation hashes",
        detail: "Checking this entry's package and file BLAKE3 hashes.",
      },
      message: "Checking moderation status",
    });
    setLoading(true);
    setError(null);
    try {
      const policy = await refreshEntrySharingPolicy(selectedEntry);
      finishOperation(opId, {
        status: "done",
        message:
          policy?.status === "blocked"
            ? `${policy.label}: sharing blocked`
            : "No moderation block matched this entry",
        stage: {
          percent: 100,
          label: "Moderation status refreshed",
          detail:
            policy?.status === "blocked"
              ? policy.summary
              : "This entry has no local moderation block match.",
        },
      });
    } catch (e) {
      const message = String(e);
      finishOperation(opId, {
        status: "failed",
        message,
        stage: { percent: 100, label: "Moderation check failed", detail: message },
      });
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIndexState();
  }, []);

  const selectEntry = (entry: LocalMcdfEntry) => {
    setSelectedId(entry.id);
    setDetailsPaneOpen(true);
    setPublishTitle(entry.title);
    setPublishDescription(entry.description);
    setPublishTags(entry.tags.join(", "));
    setPublishPreviewPath(entry.preview_image_path || null);
    setPublishIsAdult(Boolean(entryIsAdult(entry)));
    setPublishVisibility(entry.visibility || "public");
    const consent = normalizeCharacterUseConsentValue(entry.character_use_consent);
    setPublishConsentThemeIds([...consent.allowed_theme_ids]);
  };

  const saveMetadata = () => {
    if (!selectedEntry) return;
    if (entryUsesLocalOnlyMetadata(selectedEntry)) {
      updateEntry(selectedEntry.id, {
        title: publishTitle.trim() || selectedEntry.title,
        tags: tagsFromText(publishTags),
        notes: ["Local title and tags updated."],
      });
      setEditEntryDetails(false);
      return;
    }
    if (publishConsentThemeIds.length === 0) {
      setError("Select at least one allowed theme for character use consent.");
      return;
    }
    updateEntry(selectedEntry.id, {
      title: publishTitle.trim() || selectedEntry.title,
      description: publishDescription.trim(),
      tags: tagsFromText(publishTags),
      preview_image_path: publishPreviewPath,
      is_adult: publishIsAdult,
      visibility: publishVisibility,
      character_use_consent: buildCharacterUseConsent(publishConsentThemeIds),
      notes: ["Local metadata updated."],
    });
    setEditEntryDetails(false);
  };

  const publishSelected = async (entry = selectedEntry) => {
    if (!entry) return;
    if (isRemoteEntry(entry)) {
      setError(
        "This entry is remote/index-only. Add the source to My Library, then publish from a local MCDF file or a supported remote source.",
      );
      return;
    }
    if (!hasStoredClientAuth()) {
      setError(
        "Publishing requires a registered profile. This MCDF remains available in your local library.",
      );
      return;
    }
    const reshareBlock = entryReshareBlockReason(entry);
    if (reshareBlock) {
      setError(reshareBlock);
      return;
    }
    if (!publishingRulesAccepted) {
      setPublishingRulesOpen(true);
      setError(
        "Accept the current publishing rules before publishing. Only upload MCDFs and previews you are allowed to share.",
      );
      return;
    }
    if (entry.sharing_policy?.status === "blocked") {
      setError(
        `${entry.sharing_policy.label}: this MCDF is disallowed from sharing and cannot be uploaded. Reason: ${sharingReasonFile(entry)}`,
      );
      return;
    }
    const moderationToken = storedAdminToken().trim() || archiveActionToken();
    if (moderationToken) {
      try {
        const policy = await refreshEntrySharingPolicy(entry);
        if (policy?.status === "blocked") {
          const reason = sharingReasonFile({ sharing_policy: policy });
          setError(
            `${policy.label}: this MCDF is disallowed from sharing and cannot be uploaded. Reason: ${reason}`,
          );
          return;
        }
      } catch (policyError) {
        console.warn("sharing policy preflight failed", policyError);
      }
    }
    const usesOpenEditor = selectedEntry?.id === entry.id;
    const nextTitle = usesOpenEditor
      ? publishTitle.trim() || entry.title
      : entry.title;
    const nextDescription = usesOpenEditor
      ? publishDescription.trim()
      : entry.description;
    const nextTags = usesOpenEditor ? tagsFromText(publishTags) : entry.tags;
    const nextPreviewPath = usesOpenEditor
      ? publishPreviewPath || entry.preview_image_path || null
      : entry.preview_image_path || null;
    const nextPreviewCrop = nextPreviewPath ? normalizePreviewCrop(entry.preview_crop) : null;
    const nextIsAdult = usesOpenEditor
      ? publishIsAdult
      : Boolean(entryIsAdult(entry));
    const nextVisibility = usesOpenEditor
      ? publishVisibility
      : entry.visibility || "public";
    if (usesOpenEditor && publishConsentThemeIds.length === 0) {
      setError("Select at least one allowed theme for character use consent.");
      return;
    }
    const nextCharacterUseConsent = usesOpenEditor
      ? buildCharacterUseConsent(publishConsentThemeIds)
      : normalizeCharacterUseConsentValue(entry.character_use_consent);
    const opId = addOperation({
      kind: "upload",
      label: `Publish ${nextTitle || entry.original_filename}`,
    });
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<CentralUploadResponse>(
        "upload_mcdf_to_central_server",
        {
          path: entry.local_path,
          serverUrl,
          bearerToken: serverToken.trim() || null,
          title: nextTitle || null,
          description: nextDescription || null,
          tags: nextTags,
          previewImagePath: nextPreviewPath,
          previewCrop: nextPreviewCrop,
          isAdult: nextIsAdult,
          visibility: nextVisibility,
          characterUseConsent: nextCharacterUseConsent,
          ...localPublisherAuthHeaders(),
        },
      );
      const indexFailed = result.notes.some((note) =>
        /index sync failed/i.test(note),
      );
      updateEntry(entry.id, {
        title: nextTitle || entry.title,
        description: nextDescription || entry.description,
        tags: nextTags,
        preview_image_path: nextPreviewPath,
        preview_crop: nextPreviewCrop,
        is_adult: nextIsAdult,
        visibility: nextVisibility,
        character_use_consent: nextCharacterUseConsent,
        package_hash_blake3: result.package_hash_blake3,
        file_count: result.file_count,
        total_file_bytes: result.package_size,
        storage_state:
          indexFailed || nextVisibility !== "public" ? "server" : "online",
        last_published_at: new Date().toISOString(),
        manifest_url: result.manifest_url,
        download_url: result.download_url,
        notes:
          result.notes.length > 0 ? result.notes : ["Published successfully."],
      });
      finishOperation(opId, {
        status: "done",
        bytesDone: result.package_size,
        message: indexFailed
          ? "server registered; index sync pending"
          : "published online",
      });
    } catch (e) {
      const rawError = String(e);
      const debugContext = publishDebugContext(entry, {
        serverUrl,
        previewPath: nextPreviewPath,
        hasBearerToken: Boolean(serverToken.trim()),
        hasPublisherCertificate: Boolean(localStorage.getItem("mcdf.publisher.certificate")),
        hasPublisherPublicKey: Boolean(localStorage.getItem("mcdf.publisher.publicKey.spki")),
        visibility: nextVisibility,
      });
      const detailedError = `${rawError}\n\n${debugContext}`;
      updateEntry(entry.id, { storage_state: "failed", notes: [detailedError] });
      finishOperation(opId, { status: "failed", message: rawError });
      setError(detailedError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEntry) {
      setPublishTitle(selectedEntry.title);
      setPublishDescription(selectedEntry.description);
      setPublishTags(selectedEntry.tags.join(", "));
      setPublishPreviewPath(selectedEntry.preview_image_path || null);
      setPublishIsAdult(Boolean(entryIsAdult(selectedEntry)));
      setPublishVisibility(selectedEntry.visibility || "public");
      const consent = normalizeCharacterUseConsentValue(selectedEntry.character_use_consent);
      setPublishConsentThemeIds([...consent.allowed_theme_ids]);
      }
    setEntryFramingOpen(false);
    setEditEntryDetails(false);
  }, [selectedEntry?.id]);

  return (
    <div
      className="screen-grid library-screen library-screen-no-preview library-flat"
      onMouseDown={closeDetailsWhenClickingOutside}
    >
      {publishingRulesOpen && (
        <PublishingRulesModal
          onClose={() => setPublishingRulesOpen(false)}
          onAccept={() => {
            acceptPublishingRules();
            setPublishingRulesAccepted(true);
            setPublishingRulesOpen(false);
          }}
        />
      )}
      {addEntryModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal-card add-entry-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Add MCDF entry"
          >
            <div className="panel-title-row">
              <div>
                <div className="eyebrow">Add entry</div>
                <h2>Add to My Library</h2>
              </div>
              <GhostButton onClick={() => setAddEntryModalOpen(false)}>
                Close
              </GhostButton>
            </div>
            <p>
              Add a local MCDF, or scan a remote source. Remote scans use a
              temporary download only so metadata can be read and then
              discarded.
            </p>
            <div className="add-entry-grid">
              <div className="remote-add-card">
                <div className="eyebrow">Device file</div>
                <h3>Choose an MCDF from this computer</h3>
                <p className="empty-small">
                  The entry stays in your library for local use, editing,
                  publishing, and updates.
                </p>
                <PrimaryButton disabled={loading} onClick={addMcdfToLibrary}>
                  {loading ? "Working…" : "Choose MCDF…"}
                </PrimaryButton>
              </div>
              <div className="remote-add-card">
                <div className="eyebrow">Remote source</div>
                <Field
                  value={remoteUrl}
                  onChange={(e) => setRemoteUrl(e.target.value)}
                  placeholder="Google Drive or direct MCDF URL"
                />
                <Field
                  value={remotePreviewUrl}
                  onChange={(e) => setRemotePreviewUrl(e.target.value)}
                  placeholder="Preview image URL, optional"
                />
                <GhostButton
                  disabled={loading || !remoteUrl.trim()}
                  onClick={addRemoteEntry}
                >
                  Scan temp + add remote entry
                </GhostButton>
                <p className="empty-small">
                  Remote entries are annotated separately and do not need to
                  remain on this machine.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="main-stack">
        <ErrorBox error={error} />
        {actionMessage && (
          <SuccessBox>
            <div className="font-semibold">{actionMessage}</div>
          </SuccessBox>
        )}
        {autoImportMessage && (
          <SuccessBox>
            <div className="font-semibold">{autoImportMessage}</div>
          </SuccessBox>
        )}
        <Panel className="library-results-section">
          <div className="library-toolbar">
            <Field
              value={librarySearch}
              onChange={(e) => setLibrarySearch(e.target.value)}
              placeholder="Search title, tag, component, source…"
            />
            <select
              value={librarySettings.libraryViewMode}
              onChange={(e) =>
                saveLibrarySettings({
                  libraryViewMode: e.target.value as BrowserDisplayMode,
                })
              }
            >
              <option value="list">List view</option>
              <option value="cards">Large cards</option>
            </select>
            <select
              value={libraryFilter}
              onChange={(e) =>
                setLibraryFilter(e.target.value as typeof libraryFilter)
              }
            >
              <option value="all">All entries</option>
              <option value="local">On this device</option>
              <option value="remote">Remote sources</option>
              <option value="offline">Offline</option>
              <option value="server">Server only</option>
              <option value="online">Online</option>
              <option value="subscribed">Subscribed, not downloaded</option>
              <option value="removed">Removed from Exchange</option>
              <option value="failed">Needs attention</option>
              <option value="blocked">Blocked from sharing</option>
              <option value="restricted">Restricted</option>
              <option value="potentially_illegal">Potentially illegal</option>
            </select>
            <select
              value={libraryFolderFilter}
              onChange={(e) => {
                setLibraryFolderFilter(e.target.value);
                if (e.target.value) setLibraryTagFilter("");
              }}
              title="Pinned tag folders keep related MCDFs together without moving files on disk."
            >
              <option value="">All folders</option>
              {promotedLibraryFolders.map((tag) => (
                <option key={tag} value={tag}>
                  #{tag}
                </option>
              ))}
            </select>
            <select
              value={libraryTagFilter}
              onChange={(e) => {
                setLibraryTagFilter(e.target.value);
                if (e.target.value) setLibraryFolderFilter("");
              }}
              title="Filter by any tag. Pin a tag to make it a folder."
            >
              <option value="">All tags</option>
              {availableLibraryTags.map((tag) => (
                <option key={tag} value={tag}>
                  #{tag}
                </option>
              ))}
            </select>
            <GhostButton disabled={!libraryTagFilter && !librarySearch.trim()} onClick={promoteSelectedTagToFolder}>
              Pin tag as folder
            </GhostButton>
            {libraryFolderFilter && (
              <GhostButton onClick={removeCurrentFolder}>
                Unpin folder
              </GhostButton>
            )}
            <GhostButton disabled={loading} onClick={() => void scanAutoImportFolders(false)}>
              Scan watched folders
            </GhostButton>
          </div>
          {combinedEntries.length === 0 ? (
            <p className="empty-small">
              No MCDF entries yet. Add an MCDF from this device, a remote
              source, or an Exchange subscription to start building the
              browsable library.
            </p>
          ) : filteredEntries.length === 0 ? (
            <p className="empty-small">No entries match this search/filter.</p>
          ) : librarySettings.libraryViewMode === "list" ? (
            <div
              className="library-table"
              role="table"
              aria-label="My Library entries"
            >
              <div className="library-table-header" role="row">
                <span>Name</span>
                <span>Files</span>
                <span>Size</span>
                <span>Exchange</span>
                <span>Sharing</span>
                <span>18+</span>
                <span>Tags / labels</span>
                <span>Actions</span>
              </div>
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className={`library-table-row ${selectedEntry?.id === entry.id ? "selected-row" : ""}`}
                  role="row"
                >
                  <button
                    type="button"
                    className="table-cell-button table-title"
                    onClick={() => selectEntry(entry)}
                  >
                    {entry.title && !entry.title.includes("\\")
                      ? entry.title
                      : basename(
                          entry.original_filename ||
                            entry.local_path ||
                            entry.title ||
                            "Untitled MCDF",
                        )}
                  </button>
                  <button
                    type="button"
                    className="table-cell-button file-count-link"
                    onClick={() => { selectEntry(entry); setLayersEntry(entry); }}
                    title="View MCDF layers and files"
                  >
                    {entry.file_count}
                  </button>
                  <button
                    type="button"
                    className="table-cell-button"
                    onClick={() => selectEntry(entry)}
                  >
                    {formatBytes(entry.total_file_bytes)}
                  </button>
                  <button
                    type="button"
                    className={`table-cell-button table-tick ${entryPublicClass(entry) === "status-good" ? "yes" : entryPublicClass(entry) === "status-bad" ? "no" : "partial"}`}
                    onClick={() => selectEntry(entry)}
                  >
                    {entryPublicLabel(entry)}
                  </button>
                  <button
                    type="button"
                    className={`table-cell-button table-tick ${librarySharingClass(entry)}`}
                    title={entryReshareBlockReason(entry) || sharingPolicyDetailLabel(entry)}
                    onClick={() => selectEntry(entry)}
                  >
                    {librarySharingLabel(entry)}
                  </button>
                  <button
                    type="button"
                    className={`table-cell-button table-tick ${entryIsAdult(entry) ? "adult" : "no"}`}
                    onClick={() => selectEntry(entry)}
                  >
                    {entryIsAdult(entry) ? "18+" : "—"}
                  </button>
                  <button
                    type="button"
                    className="table-cell-button table-tags"
                    onClick={() => selectEntry(entry)}
                  >
                    {localEntryManualTags(entry)
                      .slice(0, 2)
                      .map((tag) => `#${tag}`)
                      .concat(localEntrySystemLabels(entry).slice(0, 3))
                      .join(" · ") || "—"}
                  </button>
                  <LibraryEntryActions entry={entry} compact />
                </div>
              ))}
            </div>
          ) : (
            <div className="browse-results card-grid library-card-grid">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className={`library-card ${selectedEntry?.id === entry.id ? "selected-row" : ""}`}
                >
                  <button
                    type="button"
                    className="library-row-main"
                    onClick={() => selectEntry(entry)}
                  >
                    <PreviewTile
                      image={entry.preview_image_path}
                      crop={entry.preview_crop}
                      title={entry.title || entry.original_filename}
                      adult={entryIsAdult(entry)}
                    />
                    <strong>
                      {entry.title && !entry.title.includes("\\")
                        ? entry.title
                        : basename(
                            entry.original_filename ||
                              entry.local_path ||
                              entry.title ||
                              "Untitled MCDF",
                          )}
                    </strong>
                    <span>
                      <button
                        type="button"
                        className="inline-link file-count-inline"
                        onClick={(event) => { event.stopPropagation(); selectEntry(entry); setLayersEntry(entry); }}
                        title="View MCDF layers and files"
                      >
                        {entry.file_count}
                      </button>{" "}
                      · {formatBytes(entry.total_file_bytes)}
                    </span>
                    {entry.sharing_policy?.status === "blocked" && (
                      <span className="card-blocked-line">
                        Disallowed · {entry.sharing_policy.label} ·{" "}
                        {sharingReasonFile(entry)}
                      </span>
                    )}
                    <code>
                      {localEntryManualTags(entry)
                        .slice(0, 3)
                        .map((tag) => `#${tag}`)
                        .concat(localEntrySystemLabels(entry).slice(0, 4))
                        .join(" · ") || "No tags or labels yet"}
                    </code>
                  </button>
                  <LibraryEntryActions entry={entry} />
                  <div className="state-pill-stack">
                    {(entryListedPublicly(entry) ||
                      entry.storage_state === "removed" ||
                      entry.storage_state === "subscribed") && (
                      <span
                        className={`status-pill ${entryPublicClass(entry)}`}
                      >
                        {entryPublicLabel(entry)}
                      </span>
                    )}
                    {entry.sharing_policy?.status === "blocked" && (
                      <span
                        className={`status-pill ${sharingPolicyClass(entry.sharing_policy)}`}
                      >
                        Disallowed
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
      {layersEntry && (
        <LayerInventoryModal
          entry={layersEntry}
          onClose={() => setLayersEntry(null)}
          onError={setError}
          onMessage={setActionMessage}
        />
      )}
      {selectedEntry && detailsPaneOpen && (
        <aside className="right-stack elevated-detail-pane">
          <Panel className="entry-detail-card">
            <button
              type="button"
              className="entry-detail-preview entry-detail-preview-button"
              disabled={
                loading ||
                selectedEntry.storage_state === "subscribed" ||
                selectedEntry.storage_state === "removed"
              }
              onClick={() =>
                publishPreviewPath ? setEntryFramingOpen(true) : choosePreview()
              }
              title={publishPreviewPath ? "Frame MCDF preview image" : "Choose MCDF preview image"}
            >
              {publishPreviewPath ? (
                <img
                  src={displayImageSrc(publishPreviewPath) || undefined}
                  alt={publishTitle || selectedEntry.original_filename}
                  style={previewImageStyle(selectedEntry.preview_crop)}
                />
              ) : (
                <div className="preview-placeholder large"><SvgIcon name="empty-placeholder" /></div>
              )}
              {selectedEntry.storage_state !== "subscribed" &&
                selectedEntry.storage_state !== "removed" && (
                  <span className="preview-edit-chip">
                    {publishPreviewPath ? "Frame picture" : "Add picture"}
                  </span>
                )}
            </button>
            {entryFramingOpen && publishPreviewPath && (
              <PreviewFramingModal
                image={publishPreviewPath}
                title={publishTitle || selectedEntry.original_filename}
                crop={normalizePreviewCrop(selectedEntry.preview_crop)}
                onClose={() => setEntryFramingOpen(false)}
                onChooseImage={choosePreview}
                onApply={(preview_crop) => {
                  updateEntry(selectedEntry.id, { preview_crop });
                  setEntryFramingOpen(false);
                }}
              />
            )}
            <div className="entry-detail-table" role="table" aria-label="Entry details">
              {detailTableRows(selectedEntry).map((row) => (
                <div className="entry-detail-table-row" role="row" key={`${row.label}-${row.value}`}>
                  <span className="entry-detail-table-label" role="cell">{row.label}</span>
                  <span
                    className={`entry-detail-table-value ${row.className || ""}`}
                    role="cell"
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
            <div className="panel-title-row detail-title-row">
              <div>
                <h2>
                  {selectedEntry.title && !selectedEntry.title.includes("\\")
                    ? selectedEntry.title
                    : basename(
                        selectedEntry.original_filename ||
                          selectedEntry.local_path ||
                          selectedEntry.title ||
                          "Untitled MCDF",
                      )}
                </h2>
              </div>
              <div className="detail-title-actions">
                {!editEntryDetails &&
                selectedEntry.storage_state !== "removed" ? (
                  <GhostButton
                    disabled={loading}
                    onClick={() => setEditEntryDetails(true)}
                  >
                    Edit
                  </GhostButton>
                ) : editEntryDetails ? (
                  <GhostButton
                    disabled={loading}
                    onClick={() => setEditEntryDetails(false)}
                  >
                    Done
                  </GhostButton>
                ) : null}
                <IconButton
                  label="Close details"
                  className="detail-close-button"
                  onClick={() => setDetailsPaneOpen(false)}
                >
                  <SvgIcon name="close" />
                </IconButton>
              </div>
            </div>
            {!editEntryDetails ? (
              <div className="published-detail">
                <p>
                  {selectedEntry.description || "No description saved yet."}
                </p>
                {localEntryManualTags(selectedEntry).length > 0 && (
                  <div className="tag-group">
                    <span className="tag-group-title">User tags</span>
                    <div className="tag-row">
                      {localEntryManualTags(selectedEntry).map((tag) => (
                        <span key={tag}>#{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
                {localEntrySystemLabels(selectedEntry).length > 0 && (
                  <div className="tag-group">
                    <span className="tag-group-title">Package labels</span>
                    <div className="tag-row label-row">
                      {localEntrySystemLabels(selectedEntry).map((label) => (
                        <span key={label}>{label}</span>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  className="inline-link detail-files-link"
                  onClick={() => setLayersEntry(selectedEntry)}
                >
                  {selectedEntry.file_count}
                </button>
              </div>
            ) : (
              <div className="published-detail">
                <Field
                  value={publishTitle}
                  onChange={(e) => setPublishTitle(e.target.value)}
                  placeholder="Public title"
                />
                <Field
                  value={publishTags}
                  onChange={(e) => setPublishTags(e.target.value)}
                  placeholder="Tags, comma separated"
                />
                {!entryUsesLocalOnlyMetadata(selectedEntry) && (
                  <>
                    <Field
                      value={publishDescription}
                      onChange={(e) => setPublishDescription(e.target.value)}
                      placeholder="Public description"
                    />
                    <label className="form-label">Visibility</label>
                    <select
                      value={publishVisibility}
                      onChange={(e) =>
                        setPublishVisibility(e.target.value as McdfVisibility)
                      }
                    >
                      <option value="public">Public in The Eorzea Exchange</option>
                      <option value="locked">
                        Locked — listed by server only, access requires approval
                      </option>
                      <option value="private">Private/server-only</option>
                    </select>
                    <label className="check-row">
                      <input
                        type="checkbox"
                        checked={publishIsAdult}
                        onChange={(e) => setPublishIsAdult(e.target.checked)}
                      />{" "}
                      <span>Mark this MCDF as 18+</span>
                    </label>
                    <div className="consent-form-panel">
                      <div className="consent-form-heading">
                        <label className="form-label">Allowed themes</label>
                        <div className="consent-form-actions">
                          <button
                            type="button"
                            className="link-button"
                            onClick={() => setPublishConsentThemeIds([...CHARACTER_USE_CONSENT_THEME_IDS])}
                          >
                            Select all
                          </button>
                          <button
                            type="button"
                            className="link-button"
                            onClick={() => setPublishConsentThemeIds([])}
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      <div className="consent-theme-table" role="table" aria-label="Allowed themes">
                        {CHARACTER_USE_CONSENT_THEMES.map((theme) => {
                          const checked = publishConsentThemeIds.includes(theme.id);
                          return (
                            <label
                              key={theme.id}
                              className="consent-theme-row"
                              title={theme.description}
                              role="row"
                            >
                              <span className="consent-theme-check" role="cell">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    setPublishConsentThemeIds((current) =>
                                      e.target.checked
                                        ? Array.from(new Set([...current, theme.id]))
                                        : current.filter((id) => id !== theme.id),
                                    );
                                  }}
                                />
                              </span>
                              <span className="consent-theme-title" role="cell">{theme.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
                <div className="hero-actions">
                  {!entryUsesLocalOnlyMetadata(selectedEntry) && (
                    <>
                      <GhostButton disabled={loading} onClick={choosePreview}>
                        {publishPreviewPath ? "Change picture" : "Add picture"}
                      </GhostButton>
                      {publishPreviewPath && (
                        <GhostButton disabled={loading} onClick={clearPreview}>
                          Remove picture
                        </GhostButton>
                      )}
                    </>
                  )}
                  <GhostButton disabled={loading} onClick={saveMetadata}>
                    Save locally
                  </GhostButton>
                </div>
              </div>
            )}
            {selectedEntry.source_url && (
              <div className="source-annotation">
                <strong>Remote source</strong>
                <span>
                  {selectedEntry.remote_annotation ||
                    "This entry lives outside the local library until you choose to mirror or archive it."}
                </span>
              </div>
            )}
            {selectedEntry.missing_registry_percent != null && (
              <div className="source-annotation">
                <strong>Registry gap</strong>
                <span>
                  {selectedEntry.missing_registry_percent}% missing in online
                  storage, based on last temp scan.
                </span>
              </div>
            )}
            {selectedEntry.sharing_policy &&
              selectedEntry.sharing_policy.status !== "allowed" && (
                <div className="upload-responsibility-notice policy-block-notice">
                  <strong>{selectedEntry.sharing_policy.label}</strong>
                  <p>
                    {selectedEntry.sharing_policy.summary} This entry stays
                    available locally, but MCDF Manager blocks upload and
                    sharing.
                  </p>
                  <div className="policy-match-list">
                    {(selectedEntry.sharing_policy.matches || [])
                      .slice(0, 6)
                      .map((match) => (
                        <div
                          key={`${match.target_type}-${match.hash_blake3}`}
                          className="policy-match-row"
                        >
                          <span>
                            {match.target_type === "package"
                              ? "Package"
                              : match.file_path || "Unknown file"}
                          </span>
                          <code>{shortHash(match.hash_blake3)}</code>
                          <em>{match.reason}</em>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            {selectedEntry.storage_state !== "subscribed" &&
              selectedEntry.storage_state !== "removed" &&
              !publishingRulesAccepted && (
                <div className="upload-responsibility-notice">
                  <strong>Publishing rules</strong>
                  <p>
                    Accept the current publishing rules once before publishing.
                    You will only be asked again when the rules document version
                    changes.
                  </p>
                  <div className="hero-actions compact-actions">
                    <GhostButton
                      disabled={loading}
                      onClick={() => setPublishingRulesOpen(true)}
                    >
                      Read and accept rules
                    </GhostButton>
                  </div>
                </div>
              )}
            <div className="detail-action-panel detail-action-panel-compact">
              <LibraryEntryActions entry={selectedEntry} />
            </div>
            {!hasStoredClientAuth() && (
              <p className="empty-small">
                Connect and authorize this client before publishing.
              </p>
            )}
            {selectedEntry.storage_state === "subscribed" && (
              <div className="alert success">
                <div className="font-semibold">Subscribed online MCDF</div>
                <p className="empty-small">
                  This Exchange item is tracked in My Library with its cover and metadata only. Sync source creates a synced package cache for inspection and export. Download MCDF saves a direct permanent copy wherever you choose without changing the Library record.
                </p>
                <PrimaryButton
                  disabled={loading}
                  onClick={() => void syncLibraryEntrySource(selectedEntry)}
                >
                  {loading ? "Syncing…" : "Sync source"}
                </PrimaryButton>
              </div>
            )}
            {selectedEntry.storage_state === "removed" && (
              <div className="alert error">
                <div className="font-semibold">
                  Removed from The Eorzea Exchange
                </div>
                <p className="empty-small">
                  This MCDF was in your local subscriptions, but it is no longer
                  available in the public Exchange index. The local subscription
                  record is kept so you can see that it was removed instead of
                  silently disappearing.
                </p>
              </div>
            )}
            {isRemoteEntry(selectedEntry) &&
              selectedEntry.storage_state !== "subscribed" &&
              selectedEntry.storage_state !== "removed" && (
                <p className="empty-small">
                  Remote entries remain in My Library as source references. Use
                  Add MCDF or Publish with a supported source to publish them.
                </p>
              )}
            {friendlyPublishNotes(selectedEntry).length > 0 && (
              <div className="publish-result-summary mt-2">
                {friendlyPublishNotes(selectedEntry).map((note, index) => (
                  <p key={index}>{note}</p>
                ))}
              </div>
            )}
          </Panel>
        </aside>
      )}
    </div>
  );
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

async function createPublisherKeyMaterial(displayName: string) {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const publicKey = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  const privateKey = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  const publicKeyB64 = arrayBufferToBase64(publicKey);
  const privateKeyB64 = arrayBufferToBase64(privateKey);
  localStorage.setItem("mcdf.publisher.privateKey.pkcs8", privateKeyB64);
  localStorage.setItem("mcdf.publisher.publicKey.spki", publicKeyB64);
  localStorage.setItem("mcdf.publisher.displayName", displayName);
  return { publicKeyB64, privateKeyB64 };
}

type SharedArchiveConnectModalProps = {
  onClose: () => void;
  onConnected: (
    health: CentralServerHealth,
    config: ArchiveConfigResponse | null,
  ) => void;
};

function SharedArchiveConnectModal({
  onClose,
  onConnected,
}: SharedArchiveConnectModalProps) {
  const [serverUrl] = useState(configuredArchiveHost());
  const [displayName, setDisplayName] = useState(
    localStorage.getItem("mcdf.publisher.displayName") || "",
  );
  const [serverToken, setServerToken] = useState(archiveActionToken() || "");
  const [serverHealth, setServerHealth] = useState<CentralServerHealth | null>(
    null,
  );
  const [archiveConfig, setArchiveConfig] =
    useState<ArchiveConfigResponse | null>(null);
  const [publisherIdentity, setPublisherIdentity] =
    useState<PublisherIdentityRecord | null>(null);
  const [clientAuthPackagePath, setClientAuthPackagePath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const tokenRequired = Boolean(
    serverHealth?.uploads_require_auth ||
    archiveConfig?.uploads?.requires_token,
  );
  const clientAuthorized = hasStoredClientAuth();

  useEffect(() => {
    let cancelled = false;
    const discover = async () => {
      setLoading(true);
      setError(null);
      try {
        const health = await invoke<CentralServerHealth>(
          "central_server_health",
          { serverUrl },
        );
        if (cancelled) return;
        setServerHealth(health);
        try {
          const config = await invoke<ArchiveConfigResponse>(
            "fetch_archive_config",
            { serverUrl },
          );
          if (!cancelled) setArchiveConfig(config);
        } catch {
          if (!cancelled) setArchiveConfig(null);
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    discover();
    return () => {
      cancelled = true;
    };
  }, [serverUrl]);

  const importClientAuth = async () => {
    setLoading(true);
    setError(null);
    setClientAuthPackagePath("");
    try {
      const selected = await openDialog({
        multiple: false,
        filters: [
          { name: "MCDF Client Auth", extensions: ["mcdfauth", "json"] },
        ],
      });
      if (!selected || Array.isArray(selected)) return;
      const authPackage = await invoke<ClientAuthExportPackage>(
        "import_client_auth_package",
        { path: selected },
      );
      localStorage.setItem(
        "mcdf.publisher.privateKey.pkcs8",
        authPackage.private_key,
      );
      localStorage.setItem(
        "mcdf.publisher.publicKey.spki",
        authPackage.public_key,
      );
      localStorage.setItem(
        "mcdf.publisher.certificate",
        authPackage.certificate,
      );
      localStorage.setItem("mcdf.publisher.publisherId", authPackage.publisher_id);
      localStorage.setItem(
        "mcdf.publisher.username",
        authPackage.username || authPackage.publisher_id,
      );
      localStorage.setItem(
        "mcdf.publisher.displayName",
        authPackage.display_name,
      );
      setDisplayName(authPackage.display_name);
      setPublisherIdentity({
        schema_version: 1,
        publisher_id: authPackage.publisher_id,
        username: authPackage.username || authPackage.publisher_id,
        display_name: authPackage.display_name,
        public_key: authPackage.public_key,
        certificate: authPackage.certificate,
        status: "imported",
        source: "imported_client_auth_package",
        created_at: authPackage.exported_at,
        updated_at: new Date().toISOString(),
        notes: [
          "Imported from a client auth package. This installation can now prove the same publisher identity.",
        ],
      });
      notifyClientAuthChanged();
      setClientAuthPackagePath(selected);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const authorizeAndConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const health =
        serverHealth ||
        (await invoke<CentralServerHealth>("central_server_health", {
          serverUrl,
        }));
      let config = archiveConfig;
      try {
        config =
          config ||
          (await invoke<ArchiveConfigResponse>("fetch_archive_config", {
            serverUrl,
          }));
        setArchiveConfig(config);
      } catch {
        config = null;
      }
      const needsToken = Boolean(
        health.uploads_require_auth || config?.uploads?.requires_token,
      );
      if (needsToken && !serverToken.trim()) {
        throw new Error(
          "This archive service requires an upload token before it can authorize this client.",
        );
      }
      if (serverToken.trim()) {
        saveUploadToken(serverToken.trim());
      }
      if (!hasStoredClientAuth()) {
        const name = displayName.trim();
        if (!name)
          throw new Error(
            "Enter the display name people will see on shared MCDF uploads.",
          );
        const username = displayNameToUsername(name);
        const { publicKeyB64 } = await createPublisherKeyMaterial(name);
        localStorage.setItem("mcdf.publisher.username", username);
        const identity = await invoke<PublisherIdentityRecord>(
          "issue_publisher_certificate",
          {
            serverUrl,
            bearerToken: serverToken.trim() || null,
            username,
            displayName: name,
            label: username,
            publicKey: publicKeyB64,
          },
        );
        localStorage.setItem(
          "mcdf.publisher.certificate",
          identity.certificate || "",
        );
        localStorage.setItem("mcdf.publisher.publisherId", identity.publisher_id);
        setPublisherIdentity(identity);
        notifyClientAuthChanged();
      }
      localStorage.removeItem("mcdf.archive.host");
      onConnected(health, config);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="connect-modal glass-panel">
        <div className="panel-title-row">
          <div>
            <div className="eyebrow">Register</div>
            <h2>{clientAuthorized ? "Connect" : "Register new account"}</h2>
          </div>
        </div>
        <p>
          Register a server-side publisher account when you want to use
          community services or upload Character files. Browsing the Exchange
          does not require an account.
        </p>
        {!clientAuthorized && (
          <>
            <p>
              Enter the display name for your new server profile, or import an
              existing <span className="inline-code">.mcdfauth</span> package
              from another computer.
            </p>
            <div className="form-grid single-column">
              <Field
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name"
                autoFocus
              />
            </div>
          </>
        )}
        {tokenRequired && (
          <div className="form-grid single-column">
            <Field
              value={serverToken}
              onChange={(e) => setServerToken(e.target.value)}
              placeholder="Upload token"
            />
          </div>
        )}
        <ErrorBox error={error} />
        {publisherIdentity && (
          <SuccessBox>
            <div className="font-semibold">
              Connected as {publisherIdentity.display_name}
            </div>
            <div className="mt-2">
              You can export a <span className="inline-code">.mcdfauth</span>{" "}
              package later if you move computers.
            </div>
          </SuccessBox>
        )}
        {clientAuthPackagePath && (
          <SuccessBox>
            <div className="font-semibold">Imported client auth</div>
            <div className="mt-2 font-mono text-xs">
              {clientAuthPackagePath}
            </div>
          </SuccessBox>
        )}
        <div className="hero-actions modal-actions">
          {!clientAuthorized && (
            <GhostButton disabled={loading} onClick={importClientAuth}>
              Import
            </GhostButton>
          )}
          <PrimaryButton
            disabled={loading || Boolean(error && !serverHealth)}
            onClick={authorizeAndConnect}
          >
            {loading
              ? "Working…"
              : clientAuthorized
                ? "Connect"
                : "Register new account"}
          </PrimaryButton>
          <GhostButton disabled={loading} onClick={onClose}>
            Cancel
          </GhostButton>
        </div>
      </div>
    </div>
  );
}

function EndUserLicenseAgreementModal({ onAccept }: { onAccept: () => void }) {
  const accept = () => {
    acceptEula();
    onAccept();
  };
  return (
    <div
      className="modal-backdrop eula-backdrop"
      role="dialog"
      aria-modal="true"
    >
      <div className="connect-modal glass-panel eula-modal">
        <div className="panel-title-row">
          <div>
            <div className="eyebrow">End User License Agreement</div>
            <h2>MCDF Manager use and upload terms</h2>
          </div>
        </div>
        <div className="eula-scroll">
          <p>
            <strong>You are responsible for your use of MCDF Manager.</strong>{" "}
            Use the application only for content and activity you are allowed to
            perform.
          </p>
          <p>
            <strong>
              You may upload or publish content only when you have the right to
              share it.
            </strong>{" "}
            That includes MCDF packages, preview images, descriptions, tags,
            labels, source links, and creator/profile information.
          </p>
          <p>
            <strong>
              You may not upload or publish stolen, leaked, private, restricted,
              malicious, misleading, or unauthorized content.
            </strong>{" "}
            Do not upload content that violates another person's rights, a
            creator's terms, community rules, platform rules, or applicable law.
          </p>
          <p>
            <strong>
              You must mark adult or sensitive content accurately where the
              product provides those controls.
            </strong>{" "}
            Do not misrepresent sexual, adult, age-sensitive, or restricted
            content.
          </p>
          <p>
            <strong>
              MCDF Manager and its operators do not own, approve, or take
              responsibility for user-submitted content.
            </strong>{" "}
            You remain responsible for rights, permission, consent, legality,
            labels, descriptions, and consequences of publishing.
          </p>
          <p>
            <strong>Moderation may happen.</strong> Content or accounts may be
            removed, hidden, blocked, restricted, or reported when they violate
            these terms, community rules, law, safety requirements, or
            moderation decisions.
          </p>
        </div>
        <div className="hero-actions modal-actions">
          <PrimaryButton onClick={accept}>Accept and continue</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function PublishingRulesModal({
  onClose,
  onAccept,
}: {
  onClose: () => void;
  onAccept: () => void;
}) {
  return (
    <div
      className="modal-backdrop eula-backdrop"
      role="dialog"
      aria-modal="true"
    >
      <div className="connect-modal glass-panel eula-modal publishing-rules-modal">
        <div className="panel-title-row">
          <div>
            <div className="eyebrow">
              Publishing rules · version {PUBLISHING_RULES_VERSION}
            </div>
            <h2>Before you publish</h2>
          </div>
          <IconButton label="Close publishing rules" onClick={onClose}>
            <SvgIcon name="close" />
          </IconButton>
        </div>
        <div className="eula-scroll">
          <p>
            <strong>You are responsible for what you publish.</strong> Only
            upload MCDF packages, preview images, descriptions, tags, and source
            links that you are allowed to share.
          </p>
          <p>
            MCDF Manager does not verify ownership, consent, copyright, model
            permissions, game-mod permissions, or platform/community-rule
            compliance for you.
          </p>
          <p>
            Do not upload private, confidential, restricted, stolen, leaked, or
            otherwise unauthorized files. Do not upload files that violate
            another person’s rights or the rules of communities and services you
            use.
          </p>
          <p>
            Published files and assets are not private personal storage. Do not
            publish anything that must stay private, confidential, or
            restricted.
          </p>
          <p>
            You will only be asked to accept these publishing rules again when
            the publishing rules document changes.
          </p>
        </div>
        <div className="hero-actions modal-actions">
          <PrimaryButton onClick={onAccept}>
            Accept current publishing rules
          </PrimaryButton>
          <GhostButton onClick={onClose}>Close</GhostButton>
        </div>
      </div>
    </div>
  );
}

function StorageFoldersPanel({
  compact = false,
  onSaved,
}: {
  compact?: boolean;
  onSaved?: (settings: StorageSettingsResponse) => void;
}) {
  const [settings, setSettings] = useState<StorageSettingsResponse | null>(
    null,
  );
  const [settingsFile, setSettingsFile] = useState("");
  const [libraryDir, setLibraryDir] = useState("");
  const [exchangeCacheDir, setExchangeCacheDir] = useState("");
  const [downloadsDir, setDownloadsDir] = useState("");
  const [autoImportText, setAutoImportText] = useState("");
  const [autoImportRecursive, setAutoImportRecursive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    setError(null);
    try {
      const value = await invoke<StorageSettingsResponse>(
        "get_storage_settings",
      );
      setSettings(value);
      setSettingsFile(value.settings_file);
      setLibraryDir(value.library_dir);
      setExchangeCacheDir(value.exchange_cache_dir);
      setDownloadsDir(value.downloads_dir);
      setAutoImportText((value.auto_import_dirs || []).join("\n"));
      setAutoImportRecursive(Boolean(value.auto_import_recursive));
    } catch (e) {
      setError(String(e));
    }
  };
  useEffect(() => {
    loadSettings();
  }, []);

  const chooseFolder = async (setter: (value: string) => void) => {
    const selected = await openDialog({ directory: true, multiple: false });
    if (selected && !Array.isArray(selected)) setter(selected);
  };

  const chooseSettingsFile = async () => {
    const selected = await openDialog({
      directory: false,
      multiple: false,
      defaultPath: settingsFile || undefined,
      filters: [{ name: "MCDF Manager config", extensions: ["json"] }],
    });
    if (selected && !Array.isArray(selected)) setSettingsFile(selected);
  };

  const addAutoImportFolder = async () => {
    const selected = await openDialog({ directory: true, multiple: false });
    if (!selected || Array.isArray(selected)) return;
    const existing = autoImportText
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (!existing.some((value) => value.toLowerCase() === selected.toLowerCase())) {
      setAutoImportText([...existing, selected].join("\n"));
    }
  };

  const saveFolders = async () => {
    setLoading(true);
    setError(null);
    try {
      const update: StorageSettingsUpdateRequest = {
        settings_file: settingsFile.trim() || null,
        library_dir: libraryDir.trim() || null,
        exchange_cache_dir: exchangeCacheDir.trim() || null,
        downloads_dir: downloadsDir.trim() || null,
        auto_import_dirs: autoImportText
          .split(/\r?\n/)
          .map((value) => value.trim())
          .filter(Boolean),
        auto_import_recursive: autoImportRecursive,
        initialized: true,
      };
      const next = await invoke<StorageSettingsResponse>(
        "save_storage_settings",
        { update },
      );
      setSettings(next);
      setSettingsFile(next.settings_file);
      setLibraryDir(next.library_dir);
      setExchangeCacheDir(next.exchange_cache_dir);
      setDownloadsDir(next.downloads_dir);
      setAutoImportText((next.auto_import_dirs || []).join("\n"));
      setAutoImportRecursive(Boolean(next.auto_import_recursive));
      acknowledgeStorageSetup();
      onSaved?.(next);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel
      className={
        compact ? "storage-setup-panel compact" : "storage-setup-panel"
      }
    >
      <div className="panel-title-row">
        <div>
          <div className="eyebrow">Local storage</div>
          <h2>Library and Exchange folders</h2>
        </div>
        {settings && (
          <span
            className={
              settings.initialized
                ? "status-pill status-good"
                : "status-pill status-warn"
            }
          >
            {settings.initialized ? "configured" : "setup needed"}
          </span>
        )}
      </div>
      <div className="storage-folder-grid">
        <label className="wide-field">
          <span>Config file</span>
          <div className="folder-row">
            <Field
              value={settingsFile}
              onChange={(e) => setSettingsFile(e.target.value)}
              placeholder="Select an existing MCDF Manager config JSON file"
            />
            <GhostButton onClick={chooseSettingsFile}>Choose existing</GhostButton>
          </div>
          <small>
            Choose an existing config file to use it. Saving Settings updates that file; it does not create a new file picker overwrite prompt.
          </small>
        </label>
        <label>
          <span>My Library folder</span>
          <div className="folder-row">
            <Field
              value={libraryDir}
              onChange={(e) => setLibraryDir(e.target.value)}
              placeholder="Local library folder"
            />
            <GhostButton onClick={() => chooseFolder(setLibraryDir)}>
              Browse
            </GhostButton>
          </div>
        </label>
        <label>
          <span>Exchange cache folder</span>
          <div className="folder-row">
            <Field
              value={exchangeCacheDir}
              onChange={(e) => setExchangeCacheDir(e.target.value)}
              placeholder="Downloaded file-part cache"
            />
            <GhostButton onClick={() => chooseFolder(setExchangeCacheDir)}>
              Browse
            </GhostButton>
          </div>
        </label>
        <label>
          <span>Downloads folder</span>
          <div className="folder-row">
            <Field
              value={downloadsDir}
              onChange={(e) => setDownloadsDir(e.target.value)}
              placeholder="Rebuilt MCDF downloads"
            />
            <GhostButton onClick={() => chooseFolder(setDownloadsDir)}>
              Browse
            </GhostButton>
          </div>
        </label>
        <label className="wide-field">
          <span>Auto-import watched folders</span>
          <textarea
            value={autoImportText}
            onChange={(event) => setAutoImportText(event.target.value)}
            placeholder="One folder per line. New .mcdf files placed here are automatically added to your library."
            rows={4}
          />
          <span className="field-hint">
            You can import MCDF files from anywhere. These folders are watched
            while MCDF Manager is open and are scanned automatically for new
            packages.
          </span>
        </label>
        <label className="checkbox-row wide-field">
          <input
            type="checkbox"
            checked={autoImportRecursive}
            onChange={(event) => setAutoImportRecursive(event.target.checked)}
          />
          <span>Include subfolders in automatic import</span>
        </label>
      </div>
      <div className="hero-actions">
        <PrimaryButton disabled={loading} onClick={saveFolders}>
          {loading ? "Saving…" : "Save storage folders"}
        </PrimaryButton>
        <GhostButton disabled={loading} onClick={loadSettings}>
          Reload
        </GhostButton>
        <GhostButton disabled={loading} onClick={addAutoImportFolder}>
          Add watched folder
        </GhostButton>
      </div>
      <ErrorBox error={error} />
      {settings && (
        <div className="empty-small">
          Active config file:{" "}
          <span className="inline-code">{settings.settings_file}</span>
        </div>
      )}
      {settings?.notes?.map((note, index) => (
        <p key={index} className="empty-small">
          {note}
        </p>
      ))}
    </Panel>
  );
}

function FirstBootStorageModal({ onDone }: { onDone: () => void }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="connect-modal glass-panel storage-first-boot-modal">
        <div className="panel-title-row">
          <div>
            <div className="eyebrow">First boot</div>
            <h2>Choose local storage folders</h2>
          </div>
        </div>
        <p>
          MCDF Manager uses local folders for your Library, Exchange cache, synced package cache, and
          rebuilt downloads. You can use the defaults, choose new folders, or
          point the app at existing folders from another install.
        </p>
        <StorageFoldersPanel compact onSaved={onDone} />
        <div className="hero-actions modal-actions">
          <GhostButton
            onClick={() => {
              acknowledgeStorageSetup();
              onDone();
            }}
          >
            Use defaults for now
          </GhostButton>
        </div>
      </div>
    </div>
  );
}

function PublicProfileModal({ onClose }: { onClose: () => void }) {
  const [profile, setProfile] = useState(() => readPublicProfile());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportPath, setExportPath] = useState("");
  const publicKey =
    profile.publicKey ||
    localStorage.getItem("mcdf.publisher.publicKey.spki") ||
    "";
  const registeredAt =
    profile.registeredAt ||
    localStorage.getItem("mcdf.publisher.registeredAt") ||
    "";
  const chooseProfileImage = async () => {
    try {
      const selected = await openDialog({
        multiple: false,
        filters: [
          {
            name: "Profile image",
            extensions: ["png", "jpg", "jpeg", "webp", "gif"],
          },
        ],
      });
      if (!selected || Array.isArray(selected)) return;
      const cached = await cachePreviewImageForLibrary(selected);
      setProfile((current) => ({ ...current, image: cached }));
    } catch (e) {
      setError(`Profile image picker failed: ${String(e)}`);
    }
  };
  const exportClientAuthFromProfile = async () => {
    setError(null);
    setExportPath("");
    try {
      const privateKey =
        localStorage.getItem("mcdf.publisher.privateKey.pkcs8") || "";
      const certificate =
        localStorage.getItem("mcdf.publisher.certificate") || "";
      if (!privateKey || !publicKey || !certificate)
        throw new Error(
          "Register this client before exporting an auth package.",
        );
      const username =
        profile.username ||
        displayNameToUsername(profile.displayName || "publisher");
      const selected = await save({
        defaultPath: `${username}.mcdfauth`,
        filters: [
          { name: "MCDF Client Auth", extensions: ["mcdfauth", "json"] },
        ],
      });
      if (!selected) return;
      const authPackage: ClientAuthExportPackage = {
        schema_version: 1,
        package_kind: "mcdf-client-auth",
        exported_at: new Date().toISOString(),
        archive_host: configuredArchiveHost(),
        archive_endpoint: null,
        publisher_id: username,
        username,
        display_name: profile.displayName || username,
        public_key: publicKey,
        private_key: privateKey,
        certificate,
        ca_id: null,
        notes: [
          "This package proves publisher ownership on another computer.",
          "It contains the private key. Keep it private.",
        ],
      };
      const writtenPath = await invoke<string>("export_client_auth_package", {
        path: selected,
        authPackage,
      });
      setExportPath(writtenPath);
    } catch (e) {
      setError(String(e));
    }
  };
  const saveProfile = () => {
    savePublicProfile(profile);
    setMessage("Profile saved");
  };
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="modal-card profile-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Publisher profile"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="panel-title-row refined-modal-head">
          <div>
            <div className="eyebrow">Profile</div>
            <h2>Server profile</h2>
          </div>
          <button
            type="button"
            className="modal-icon-close"
            onClick={onClose}
            aria-label="Close"
          >
            <SvgIcon name="close" />
          </button>
        </div>
        <p className="compact-note">
          Your public publisher profile belongs to the registry server. MCDF
          Manager keeps this local copy so the client can sign requests, show
          your current identity, and export a migration package for another
          install.
        </p>
        <div className="profile-editor-grid">
          <button
            type="button"
            className="entry-detail-preview entry-detail-preview-button profile-picture-picker"
            onClick={chooseProfileImage}
            title="Choose profile picture"
          >
            {profile.image ? (
              <img
                src={displayImageSrc(profile.image) || undefined}
                alt={profile.displayName || "Profile"}
              />
            ) : (
              <div className="preview-placeholder large"><SvgIcon name="empty-placeholder" /></div>
            )}
            <span className="preview-edit-chip">
              {profile.image ? "Change picture" : "Add picture"}
            </span>
          </button>
          <div className="form-grid single-column">
            <label>
              <span>Display name</span>
              <Field
                value={profile.displayName}
                onChange={(event) =>
                  setProfile({ ...profile, displayName: event.target.value })
                }
                placeholder="How people know you"
              />
            </label>
            <label>
              <span>Username</span>
              <Field
                value={
                  profile.username ||
                  displayNameToUsername(profile.displayName || "publisher")
                }
                disabled
                placeholder="Stable username"
              />
            </label>
            <label>
              <span>Flair</span>
              <Field
                value={profile.flair}
                onChange={(event) =>
                  setProfile({ ...profile, flair: event.target.value })
                }
                placeholder="Short profile line"
              />
            </label>
            <label>
              <span>Website</span>
              <Field
                value={profile.website}
                onChange={(event) =>
                  setProfile({ ...profile, website: event.target.value })
                }
                placeholder="https://…"
              />
            </label>
          </div>
        </div>
        <div className="profile-facts-grid">
          <div>
            <span>Public key</span>
            <code>{publicKey ? shortHash(publicKey) : "Not registered"}</code>
          </div>
          <div>
            <span>Access</span>
            <strong>
              {storedAdminToken().trim()
                ? "Admin"
                : storedUploadToken().trim()
                  ? "Uploader"
                  : hasStoredClientAuth()
                    ? "Publisher"
                    : "Not registered"}
            </strong>
          </div>
          <div>
            <span>Profile</span>
            <strong>
              {registeredAt ? formatDate(registeredAt) : "Not registered"}
            </strong>
          </div>
        </div>
        <div className="hero-actions modal-actions">
          <PrimaryButton onClick={saveProfile}>Save local profile cache</PrimaryButton>
          <GhostButton
            disabled={!hasStoredClientAuth()}
            onClick={exportClientAuthFromProfile}
          >
            Export auth package
          </GhostButton>
        </div>
        {message && (
          <SuccessBox>
            <div className="font-semibold">{message}</div>
          </SuccessBox>
        )}
        {exportPath && (
          <SuccessBox>
            <div className="font-semibold">Auth package exported</div>
            <div className="path-block">{exportPath}</div>
          </SuccessBox>
        )}
        <ErrorBox error={error} />
      </div>
    </div>
  );
}

function SettingsPanel({
  sharedArchiveConnected = false,
  onOpenConnect,
  onDisconnect,
}: {
  sharedArchiveConnected?: boolean;
  onOpenConnect: () => void;
  onDisconnect: () => void;
}) {
  const [cacheDir, setCacheDir] = useState("loading…");
  const [cacheResult, setCacheResult] = useState<CacheClearResult | null>(null);
  const [storageUsage, setStorageUsage] = useState<StorageUsageResponse | null>(null);
  const [storageUsageLoading, setStorageUsageLoading] = useState(false);
  const [settingsFavoriteHashes, setSettingsFavoriteHashes] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem("mcdf.exchange.favorites.v1") || "[]"),
  );
  const [settingsCreatorSubscriptions, setSettingsCreatorSubscriptions] = useState<string[]>(
    () => readCreatorSubscriptions(),
  );
  const [settingsPackageSubscriptions, setSettingsPackageSubscriptions] = useState<string[]>(
    () => readPackageSubscriptions(),
  );
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [serverUsers, setServerUsers] = useState<UserPermissionRecord[]>([]);
  const [generatedToken, setGeneratedToken] =
    useState<GenerateAdminTokenResponse | null>(null);
  const [serverUrl] = useState(MCDF_REGISTRY_URL);
  const [archiveEndpoint, setArchiveEndpoint] = useState(MCDF_REGISTRY_URL);
  const [serverToken] = useState(storedAdminToken());
  const [adminToken, setAdminToken] = useState(storedAdminToken());
  const [savedAdminToken, setSavedAdminToken] = useState(storedAdminToken());
  const [tokenSaving, setTokenSaving] = useState(false);
  const [tokenMessage, setTokenMessage] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [publicIndexUrl] = useState(
    PUBLIC_INDEX_LATEST_URL,
  );
  const [publicIndex, setPublicIndex] = useState<PublicIndexLatest | null>(
    null,
  );
  const [indexDiagnostics, setIndexDiagnostics] =
    useState<PublicIndexDiagnosticsResponse | null>(null);
  const [indexSshKey, setIndexSshKey] = useState<IndexSshKeyResult | null>(
    null,
  );
  const [indexSshTest, setIndexSshTest] = useState<IndexSshTestResult | null>(
    null,
  );
  const [serverHealth, setServerHealth] = useState<CentralServerHealth | null>(
    null,
  );
  const [uploadResult, setUploadResult] =
    useState<CentralUploadResponse | null>(null);
  const [publishTitle, setPublishTitle] = useState("");
  const [publishDescription, setPublishDescription] = useState("");
  const [publishTags, setPublishTags] = useState("");
  const [publishPreviewPath, setPublishPreviewPath] = useState<string | null>(
    null,
  );
  const [publisherIdentity, setPublisherIdentity] =
    useState<PublisherIdentityRecord | null>(null);
  const [publisherUsername, setPublisherUsername] = useState(
    localStorage.getItem("mcdf.publisher.username") || "",
  );
  const [publisherDisplayName, setPublisherDisplayName] = useState(
    localStorage.getItem("mcdf.publisher.displayName") || "",
  );
  const [clientAuthPackagePath, setClientAuthPackagePath] = useState("");
  const [selectedPublicPackage, setSelectedPublicPackage] =
    useState<PublicPackageRecord | null>(null);
  const [downloadResult, setDownloadResult] =
    useState<ArchiveDownloadResult | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverLoading, setServerLoading] = useState(false);
  const [indexLoading, setIndexLoading] = useState(false);
  const [librarySettings, setLibrarySettings] = useState<LocalLibrarySettings>(
    () => readLibrarySettings(),
  );
  const [publishingRulesOpen, setPublishingRulesOpen] = useState(false);
  const saveLibraryVisibilitySettings = (
    patch: Partial<LocalLibrarySettings>,
  ) => {
    const next = { ...librarySettings, ...patch };
    setLibrarySettings(next);
    writeLibrarySettings(next);
    window.dispatchEvent(new Event("mcdf-library-settings-changed"));
  };
  const saveLocalPublisherProfile = () => {
    const displayName = publisherDisplayName.trim();
    const username = (
      publisherUsername.trim() ||
      displayNameToUsername(displayName || "publisher")
    ).toLowerCase();
    if (displayName)
      localStorage.setItem("mcdf.publisher.displayName", displayName);
    if (username) localStorage.setItem("mcdf.publisher.username", username);
    notifyClientAuthChanged();
  };
  useEffect(() => {
    invoke<StorageSettingsResponse>("get_storage_settings")
      .then((settings) => {
        setCacheDir(settings.exchange_cache_dir);
        const localToken = storedAdminToken().trim();
        setAdminToken(localToken);
        setSavedAdminToken(localToken);
      })
      .catch((e) => setCacheDir(String(e)));
  }, []);

  const refreshStorageUsage = async () => {
    setStorageUsageLoading(true);
    setServerError(null);
    try {
      setStorageUsage(await invoke<StorageUsageResponse>("get_storage_usage"));
    } catch (error) {
      setServerError(String(error));
    } finally {
      setStorageUsageLoading(false);
    }
  };

  useEffect(() => {
    refreshStorageUsage().catch(console.error);
  }, []);

  const refreshExchangeLists = () => {
    setSettingsFavoriteHashes(JSON.parse(localStorage.getItem("mcdf.exchange.favorites.v1") || "[]"));
    setSettingsCreatorSubscriptions(readCreatorSubscriptions());
    setSettingsPackageSubscriptions(readPackageSubscriptions());
  };

  const clearExchangeFavorites = () => {
    localStorage.setItem("mcdf.exchange.favorites.v1", "[]");
    refreshExchangeLists();
  };

  const clearCreatorSubscriptions = () => {
    writeCreatorSubscriptions([]);
    window.dispatchEvent(new Event("mcdf-creator-subscriptions-changed"));
    refreshExchangeLists();
  };

  const clearPackageSubscriptions = () => {
    writePackageSubscriptions([]);
    writePackageSubscriptionSnapshots({});
    window.dispatchEvent(new Event("mcdf-creator-subscriptions-changed"));
    refreshExchangeLists();
  };
  const clearLocalCache = async () => {
    setServerLoading(true);
    setServerError(null);
    try {
      const result = await invoke<CacheClearResult>("clear_download_cache");
      setCacheResult(result);
      setCacheDir(result.cache_dir);
    } catch (error) {
      setServerError(String(error));
    } finally {
      setServerLoading(false);
    }
  };
  useEffect(() => {
    localStorage.removeItem("mcdf.archive.host");
    invoke<string>("resolve_archive_endpoint", { serverUrl: MCDF_REGISTRY_URL })
      .then(setArchiveEndpoint)
      .catch(() => setArchiveEndpoint(MCDF_REGISTRY_URL));
  }, []);

  const testServer = async () => {
    setServerLoading(true);
    setServerError(null);
    setServerHealth(null);
    try {
      setServerHealth(
        await invoke<CentralServerHealth>("central_server_health", {
          serverUrl,
        }),
      );
    } catch (e) {
      setServerError(String(e));
    } finally {
      setServerLoading(false);
    }
  };

  const loadPublicIndex = async () => {
    setIndexLoading(true);
    setServerError(null);
    setPublicIndex(null);
    try {
      setPublicIndex(
        await invoke<PublicIndexLatest>("fetch_public_marketplace_index", {
          indexUrl: publicIndexUrl,
        }),
      );
    } catch (e) {
      setServerError(String(e));
    } finally {
      setIndexLoading(false);
    }
  };

  const loadIndexDiagnostics = async () => {
    setIndexLoading(true);
    setServerError(null);
    setIndexDiagnostics(null);
    try {
      setIndexDiagnostics(
        await invoke<PublicIndexDiagnosticsResponse>(
          "fetch_public_index_diagnostics",
          { serverUrl },
        ),
      );
    } catch (e) {
      setServerError(String(e));
    } finally {
      setIndexLoading(false);
    }
  };

  const ensureIndexSshKey = async () => {
    setIndexLoading(true);
    setServerError(null);
    try {
      setIndexSshKey(
        await invoke<IndexSshKeyResult>("ensure_public_index_ssh_key"),
      );
    } catch (e) {
      setServerError(String(e));
    } finally {
      setIndexLoading(false);
    }
  };

  const testIndexSshKey = async () => {
    setIndexLoading(true);
    setServerError(null);
    try {
      setIndexSshTest(
        await invoke<IndexSshTestResult>("test_public_index_ssh_key", {
          remote: null,
        }),
      );
    } catch (e) {
      setServerError(String(e));
    } finally {
      setIndexLoading(false);
    }
  };

  const exportClientAuth = async () => {
    setServerLoading(true);
    setServerError(null);
    setClientAuthPackagePath("");
    try {
      const privateKey =
        localStorage.getItem("mcdf.publisher.privateKey.pkcs8") || "";
      const publicKey =
        localStorage.getItem("mcdf.publisher.publicKey.spki") ||
        publisherIdentity?.public_key ||
        "";
      const certificate =
        localStorage.getItem("mcdf.publisher.certificate") ||
        publisherIdentity?.certificate ||
        "";
      const username =
        localStorage.getItem("mcdf.publisher.username") ||
        publisherIdentity?.username ||
        publisherIdentity?.publisher_id ||
        publisherUsername ||
        "publisher";
      const publisherId =
        localStorage.getItem("mcdf.publisher.publisherId") ||
        publisherIdentity?.publisher_id ||
        parsePublisherIdFromCertificate(certificate) ||
        username;
      const displayName =
        localStorage.getItem("mcdf.publisher.displayName") ||
        publisherIdentity?.display_name ||
        publisherDisplayName ||
        username;
      if (!privateKey || !publicKey || !certificate) {
        throw new Error(
          "Authorize this client or import an existing .mcdfauth package before exporting.",
        );
      }
      const selected = await save({
        defaultPath: `${username}.mcdfauth`,
        filters: [
          { name: "MCDF Client Auth", extensions: ["mcdfauth", "json"] },
        ],
      });
      if (!selected) return;
      const authPackage: ClientAuthExportPackage = {
        schema_version: 1,
        package_kind: "mcdf-client-auth",
        exported_at: new Date().toISOString(),
        archive_host: serverUrl,
        archive_endpoint: archiveEndpoint,
        publisher_id: publisherId,
        username,
        display_name: displayName,
        public_key: publicKey,
        private_key: privateKey,
        certificate,
        ca_id: serverHealth?.ca_id || null,
        notes: [
          "This package proves publisher ownership on another computer.",
          "It contains the private key. Keep it private and do not upload it to the public index.",
        ],
      };
      const writtenPath = await invoke<string>("export_client_auth_package", {
        path: selected,
        authPackage,
      });
      setClientAuthPackagePath(writtenPath);
    } catch (e) {
      setServerError(String(e));
    } finally {
      setServerLoading(false);
    }
  };

  const importClientAuth = async () => {
    setServerLoading(true);
    setServerError(null);
    setClientAuthPackagePath("");
    try {
      const selected = await openDialog({
        multiple: false,
        filters: [
          { name: "MCDF Client Auth", extensions: ["mcdfauth", "json"] },
        ],
      });
      if (!selected || Array.isArray(selected)) return;
      const authPackage = await invoke<ClientAuthExportPackage>(
        "import_client_auth_package",
        { path: selected },
      );
      localStorage.setItem(
        "mcdf.publisher.privateKey.pkcs8",
        authPackage.private_key,
      );
      localStorage.setItem(
        "mcdf.publisher.publicKey.spki",
        authPackage.public_key,
      );
      localStorage.setItem(
        "mcdf.publisher.certificate",
        authPackage.certificate,
      );
      localStorage.setItem("mcdf.publisher.publisherId", authPackage.publisher_id);
      localStorage.setItem(
        "mcdf.publisher.username",
        authPackage.username || authPackage.publisher_id,
      );
      localStorage.setItem(
        "mcdf.publisher.displayName",
        authPackage.display_name,
      );
      setPublisherUsername(authPackage.username || authPackage.publisher_id);
      setPublisherDisplayName(authPackage.display_name);
      setPublisherIdentity({
        schema_version: 1,
        publisher_id: authPackage.publisher_id,
        username: authPackage.username || authPackage.publisher_id,
        display_name: authPackage.display_name,
        public_key: authPackage.public_key,
        certificate: authPackage.certificate,
        status: "imported",
        source: "imported_client_auth_package",
        created_at: authPackage.exported_at,
        updated_at: new Date().toISOString(),
        notes: [
          "Imported from a client auth package. This machine can now use the existing publisher ownership keypair.",
          "The public key remains the same publisher identity exported to the public index.",
        ],
      });
      notifyClientAuthChanged();
      localStorage.removeItem("mcdf.archive.host");
      setClientAuthPackagePath(selected);
    } catch (e) {
      setServerError(String(e));
    } finally {
      setServerLoading(false);
    }
  };

  const inspectPublicPackage = async (pkg: PublicIndexPackageSummary) => {
    setIndexLoading(true);
    setServerError(null);
    setSelectedPublicPackage(null);
    try {
      setSelectedPublicPackage(
        await invoke<PublicPackageRecord>("fetch_public_package_record", {
          indexUrl: publicIndexUrl,
          packageManifestPath: pkg.package_manifest_path,
        }),
      );
    } catch (e) {
      setServerError(String(e));
    } finally {
      setIndexLoading(false);
    }
  };

  const downloadSelectedFromArchive = async () => {
    if (!selectedPublicPackage) return;
    const selected = await save({
      defaultPath: `${selectedPublicPackage.original_filename.replace(/\.mcdf$/i, "")}.rebuilt.mcdf`,
      filters: [{ name: "MCDF", extensions: ["mcdf"] }],
    });
    if (!selected || Array.isArray(selected)) return;
    let metadataDescription = publishDescription.trim();
    if (!metadataDescription) {
      try {
        const scanned = await invoke<MCDFInfo>("scan_mcdf", { path: selected });
        metadataDescription = scanned.description || "";
        if (metadataDescription) setPublishDescription(metadataDescription);
      } catch {
        // Publishing can continue even when optional metadata pre-scan fails.
      }
    }
    setServerLoading(true);
    setServerError(null);
    setDownloadResult(null);
    try {
      setDownloadResult(
        await invoke<ArchiveDownloadResult>("download_package_from_archive", {
          serverUrl,
          packageHash: selectedPublicPackage.package_hash_blake3,
          outputPath: selected,
        }),
      );
    } catch (e) {
      setServerError(String(e));
    } finally {
      setServerLoading(false);
    }
  };

  const choosePublishPreview = async () => {
    try {
      const selected = await openDialog({
        multiple: false,
        filters: [
          {
            name: "Preview image",
            extensions: ["png", "jpg", "jpeg", "webp", "gif"],
          },
        ],
      });
      if (!selected || Array.isArray(selected)) return;
      const cached = await cachePreviewImageForLibrary(selected);
      setPublishPreviewPath(cached);
    } catch (e) {
      setServerError(`Preview image picker failed: ${String(e)}`);
    }
  };

  const uploadTestMcdf = async () => {
    if (!hasStoredClientAuth()) {
      setServerError(
        "Authorize and connect or import an existing .mcdfauth package before publishing.",
      );
      return;
    }
    const selected = await openDialog({
      multiple: false,
      filters: [{ name: "MCDF", extensions: ["mcdf"] }],
    });
    if (!selected || Array.isArray(selected)) return;
    let metadataDescription = publishDescription.trim();
    if (!metadataDescription) {
      try {
        const scanned = await invoke<MCDFInfo>("scan_mcdf", { path: selected });
        metadataDescription = scanned.description || "";
        if (metadataDescription) setPublishDescription(metadataDescription);
      } catch {
        // Publishing can continue even when optional metadata pre-scan fails.
      }
    }
    setServerLoading(true);
    setServerError(null);
    setUploadResult(null);
    try {
      setUploadResult(
        await invoke<CentralUploadResponse>("upload_mcdf_to_central_server", {
          path: selected,
          serverUrl,
          bearerToken: serverToken.trim() || null,
          title: publishTitle.trim() || null,
          description: metadataDescription || null,
          tags: tagsFromText(publishTags),
          previewImagePath: publishPreviewPath,
          previewCrop: null,
          isAdult: false,
          visibility: "public",
          ...localPublisherAuthHeaders(),
        }),
      );
    } catch (e) {
      setServerError(String(e));
    } finally {
      setServerLoading(false);
    }
  };

  const loadModerationReports = async () => {
    setReportsLoading(true);
    setReportsError(null);
    try {
      const result = await invoke<ReportListResponse>(
        "fetch_exchange_reports",
        {
          serverUrl: configuredArchiveHost(),
          bearerToken: archiveActionToken(),
        },
      );
      setReports(result.reports || []);
    } catch (error) {
      setReportsError(String(error));
    } finally {
      setReportsLoading(false);
    }
  };

  const reviewModerationReport = async (
    report: ReportRecord,
    status: "reviewed" | "dismissed",
  ) => {
    setReportsLoading(true);
    setReportsError(null);
    try {
      await invoke<ReportRecord>("review_exchange_report", {
        serverUrl: configuredArchiveHost(),
        bearerToken: archiveActionToken(),
        reportId: report.id,
        status,
        decisionNote:
          status === "dismissed"
            ? "Dismissed from admin moderation inbox"
            : "Marked reviewed from admin moderation inbox",
      });
      await loadModerationReports();
    } catch (error) {
      setReportsError(String(error));
    } finally {
      setReportsLoading(false);
    }
  };

  const removeReportedPackage = async (report: ReportRecord) => {
    if (
      !window.confirm(
        `Remove ${report.package_title || report.package_hash_blake3} from the Exchange?`,
      )
    )
      return;
    setReportsLoading(true);
    setReportsError(null);
    try {
      const removedHash = report.package_hash_blake3;
      await invoke<ReportRecord>("admin_remove_exchange_entry", {
        serverUrl: configuredArchiveHost(),
        bearerToken: archiveActionToken(),
        packageHashBlake3: removedHash,
        reason: `Removed from moderation inbox: ${report.reason}`,
      });
      setPublicIndex((current) =>
        current
          ? {
              ...current,
              packages: current.packages.filter(
                (entry) => entry.package_hash_blake3 !== removedHash,
              ),
              package_count: Math.max(0, current.package_count - 1),
            }
          : current,
      );
      await loadModerationReports();
    } catch (error) {
      setReportsError(String(error));
    } finally {
      setReportsLoading(false);
    }
  };

  const loadServerUsers = async () => {
    setReportsLoading(true);
    setReportsError(null);
    try {
      const result = await invoke<UserPermissionListResponse>(
        "fetch_server_user_permissions",
        {
          serverUrl: configuredArchiveHost(),
          bearerToken: archiveActionToken(),
        },
      );
      setServerUsers(result.users || []);
    } catch (error) {
      setReportsError(String(error));
    } finally {
      setReportsLoading(false);
    }
  };

  const setUserUploadPermission = async (
    user: UserPermissionRecord,
    canUpload: boolean,
  ) => {
    setReportsLoading(true);
    setReportsError(null);
    try {
      const updated = await invoke<UserPermissionRecord>(
        "update_server_user_upload_permission",
        {
          serverUrl: configuredArchiveHost(),
          bearerToken: archiveActionToken(),
          publisherId: user.publisher_id,
          canUpload,
        },
      );
      setServerUsers((users) =>
        users.map((item) =>
          item.publisher_id === updated.publisher_id ? updated : item,
        ),
      );
    } catch (error) {
      setReportsError(String(error));
    } finally {
      setReportsLoading(false);
    }
  };

  const saveSettingsAdminToken = async () => {
    const nextToken = adminToken.trim();
    setTokenSaving(true);
    setTokenError(null);
    setTokenMessage(null);
    try {
      if (!nextToken) {
        await saveAdminToken("");
        saveUploadToken("");
        setSavedAdminToken("");
        setAdminToken("");
        setTokenMessage("Access token cleared.");
        return;
      }
      const adminAccepted = await validateAdminToken(nextToken);
      if (adminAccepted) {
        await saveAdminToken(nextToken);
        const storedToken = storedAdminToken().trim();
        setSavedAdminToken(storedToken);
        setAdminToken(storedToken);
        setTokenMessage("Admin/moderation token verified and saved. Admin is now available.");
        return;
      }
      await saveAdminToken("");
      saveUploadToken(nextToken);
      setSavedAdminToken("");
      setAdminToken("");
      setTokenMessage("Token saved as an uploader token. Admin stays hidden unless an admin/moderation token is verified.");
    } catch (error) {
      setTokenError(String(error));
    } finally {
      setTokenSaving(false);
    }
  };

  const clearSettingsAdminToken = async () => {
    setAdminToken("");
    setTokenSaving(true);
    setTokenError(null);
    setTokenMessage(null);
    try {
      await saveAdminToken("");
      setSavedAdminToken("");
      setTokenMessage("Admin/moderation token cleared.");
    } catch (error) {
      setTokenError(String(error));
    } finally {
      setTokenSaving(false);
    }
  };

  const generateReplacementAdminToken = async () => {
    if (!adminToken.trim()) {
      setReportsError(
        "Save an existing admin token before generating a replacement token.",
      );
      return;
    }
    if (
      !window.confirm(
        "Generate a new admin token on the server? Save the returned token immediately; the old token may stop working after rotation.",
      )
    )
      return;
    setReportsLoading(true);
    setReportsError(null);
    try {
      const result = await invoke<GenerateAdminTokenResponse>(
        "generate_admin_token",
        {
          serverUrl: configuredArchiveHost(),
          bearerToken: adminToken.trim(),
          label: "Generated from MCDF Manager Settings",
        },
      );
      setGeneratedToken(result);
      setAdminToken(result.token);
      await saveAdminToken(result.token);
      setSavedAdminToken(result.token);
      setTokenMessage("Replacement admin token saved. Admin is now available.");
    } catch (error) {
      setReportsError(String(error));
    } finally {
      setReportsLoading(false);
    }
  };

  const tokenConfigured = Boolean(savedAdminToken.trim());
  const tokenHasChanges = adminToken.trim() !== savedAdminToken.trim();
  return (
    <div className="settings-screen integrated-settings slim-settings">
      {publishingRulesOpen && (
        <PublishingRulesModal
          onClose={() => setPublishingRulesOpen(false)}
          onAccept={() => {
            acceptPublishingRules();
            setPublishingRulesOpen(false);
          }}
        />
      )}
      <StorageFoldersPanel
        onSaved={(settings) => {
          setCacheDir(settings.exchange_cache_dir);
          void refreshStorageUsage();
        }}
      />
      <Panel className="settings-section-panel">
        <div className="panel-title-row">
          <div>
            <div className="eyebrow">Disk usage</div>
            <h2>Local MCDF Manager storage</h2>
          </div>
          <span className="status-pill status-neutral">
            {storageUsage ? formatBytes(storageUsage.total_bytes) : "checking"}
          </span>
        </div>
        {storageUsage ? (
          <div className="storage-usage-table">
            {storageUsage.items.map((item) => (
              <div key={`${item.label}-${item.path}`} className="storage-usage-row">
                <div>
                  <strong>{item.label}</strong>
                  <span title={item.path}>{item.path}</span>
                  {item.error && <em>{item.error}</em>}
                </div>
                <div>
                  <strong>{formatBytes(item.bytes)}</strong>
                  <span>{item.files} files</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-small">Storage usage has not been loaded yet.</p>
        )}
        <div className="hero-actions">
          <GhostButton disabled={storageUsageLoading} onClick={() => void refreshStorageUsage()}>
            {storageUsageLoading ? "Checking…" : "Refresh storage usage"}
          </GhostButton>
        </div>
      </Panel>
      <Panel className="settings-section-panel">
        <div className="panel-title-row">
          <div>
            <div className="eyebrow">Token</div>
            <h2>Access token</h2>
          </div>
          <span
            className={
              tokenHasChanges
                ? "status-pill status-warn"
                : tokenConfigured
                  ? "status-pill status-good"
                  : "status-pill status-neutral"
            }
          >
            {tokenHasChanges ? "unsaved" : tokenConfigured ? "configured" : "not set"}
          </span>
        </div>
        <div className="token-locked-state">
          <div className="form-grid single-column">
            <Field
              type="password"
              value={adminToken}
              onChange={(e) => {
                setAdminToken(e.target.value);
                setTokenMessage(null);
                setTokenError(null);
              }}
              placeholder={tokenConfigured ? "Paste replacement access token" : "Upload or admin token"}
            />
          </div>
          <div className="hero-actions">
            <GhostButton
              disabled={tokenSaving || (!adminToken.trim() && !savedAdminToken.trim()) || (!tokenHasChanges && tokenConfigured)}
              onClick={() => void saveSettingsAdminToken()}
            >
              {tokenSaving ? "Saving…" : tokenConfigured ? "Save token changes" : "Save token"}
            </GhostButton>
            {tokenConfigured && (
              <GhostButton disabled={tokenSaving} onClick={() => void clearSettingsAdminToken()}>
                Clear token
              </GhostButton>
            )}
          </div>
          {tokenMessage && <SuccessBox>{tokenMessage}</SuccessBox>}
          <ErrorBox error={tokenError} />
        </div>
      </Panel>

      <Panel className="settings-section-panel">
        <div className="panel-title-row compact-setting-title">
          <div>
            <div className="eyebrow">Exchange lists</div>
            <h2>Favorites and follows</h2>
          </div>
          <span className="status-pill status-neutral">
            {settingsFavoriteHashes.length + settingsCreatorSubscriptions.length + settingsPackageSubscriptions.length} saved
          </span>
        </div>
        <div className="settings-list-summary">
          <div>
            <strong>{settingsFavoriteHashes.length}</strong>
            <span>favorite entries</span>
          </div>
          <div>
            <strong>{settingsCreatorSubscriptions.length}</strong>
            <span>followed creators</span>
          </div>
          <div>
            <strong>{settingsPackageSubscriptions.length}</strong>
            <span>tracked Exchange entries</span>
          </div>
        </div>
        <div className="settings-list-chips">
          {settingsCreatorSubscriptions.slice(0, 12).map((creator) => (
            <span key={`creator-${creator}`}>creator: {creator}</span>
          ))}
          {settingsFavoriteHashes.slice(0, 12).map((hash) => (
            <span key={`fav-${hash}`}>favorite: {shortHash(hash)}</span>
          ))}
          {settingsPackageSubscriptions.slice(0, 12).map((hash) => (
            <span key={`sub-${hash}`}>entry: {shortHash(hash)}</span>
          ))}
        </div>
        <div className="hero-actions">
          <GhostButton onClick={refreshExchangeLists}>Refresh lists</GhostButton>
          <GhostButton disabled={settingsFavoriteHashes.length === 0} onClick={clearExchangeFavorites}>Clear favorites</GhostButton>
          <GhostButton disabled={settingsCreatorSubscriptions.length === 0} onClick={clearCreatorSubscriptions}>Unfollow creators</GhostButton>
          <GhostButton disabled={settingsPackageSubscriptions.length === 0} onClick={clearPackageSubscriptions}>Clear tracked entries</GhostButton>
        </div>
      </Panel>
      <Panel className="settings-section-panel">
        <div className="panel-title-row compact-setting-title">
          <div>
            <div className="eyebrow">Browsing visibility</div>
            <h2>18+ content</h2>
          </div>
          <span
            className={
              librarySettings.adultContentMode === "show"
                ? "status-pill status-warn"
                : "status-pill status-good"
            }
          >
            {librarySettings.adultContentMode === "show" ? "showing" : "hidden"}
          </span>
        </div>
        <label className="check-row">
          <input
            type="checkbox"
            checked={librarySettings.adultContentMode === "show"}
            onChange={(event) =>
              saveLibraryVisibilitySettings({
                adultContentMode: event.target.checked ? "show" : "hide",
              })
            }
          />
          <span>Show 18+ content in browsing views</span>
        </label>
        <div className="settings-separator" />
        <div className="panel-title-row compact-setting-title">
          <div>
            <div className="eyebrow">Date display</div>
            <h2>Date format</h2>
          </div>
          <span className="status-pill status-neutral">
            {formatDate(
              new Date().toISOString(),
              librarySettings.dateDisplayMode,
            )}
          </span>
        </div>
        <select
          value={librarySettings.dateDisplayMode}
          onChange={(event) =>
            saveLibraryVisibilitySettings({
              dateDisplayMode: event.target.value as DateDisplayMode,
            })
          }
        >
          <option value="dmy">day-month-year</option>
          <option value="ymd">year-month-day</option>
          <option value="mdy">month-day-year</option>
          <option value="iso">ISO yyyy-mm-dd</option>
        </select>
      </Panel>
      <Panel className="settings-section-panel">
        <div className="panel-title-row">
          <div>
            <div className="eyebrow">Legal</div>
            <h2>Publishing rules</h2>
          </div>
          <span
            className={
              hasAcceptedPublishingRules()
                ? "status-pill status-good"
                : "status-pill status-warn"
            }
          >
            {hasAcceptedPublishingRules()
              ? `accepted ${PUBLISHING_RULES_VERSION}`
              : "not accepted"}
          </span>
        </div>
        <div className="hero-actions">
          <GhostButton onClick={() => setPublishingRulesOpen(true)}>
            Read publishing rules
          </GhostButton>
        </div>
      </Panel>
      <ErrorBox error={serverError} />
    </div>
  );
}

function normalizePublicIndexAssetPath(relativePath?: string | null): string | null {
  if (!relativePath) return null;
  const trimmed = relativePath.trim();
  if (!trimmed) return null;
  if (/^(https?:|data:|blob:|asset:|tauri:)/i.test(trimmed)) return trimmed;
  return trimmed.replace(/\\/g, "/").replace(/^\/+/, "").replace(/^public\//i, "");
}

function publicIndexAssetUrlCandidates(
  indexUrl: string,
  relativePath?: string | null,
): string[] {
  const normalized = normalizePublicIndexAssetPath(relativePath);
  if (!normalized) return [];
  if (/^(https?:|data:|blob:|asset:|tauri:)/i.test(normalized)) return [normalized];

  // Exchange browsing is static-index first. The live registry server is reserved for
  // management actions such as publishing, owner edits, deletion, and moderation.
  // Do not fetch card/detail images from the live registry API/host here.
  const indexBase = indexUrl
    .replace(/\\/g, "/")
    .replace(/indexes\/latest\.json(?:\?.*)?$/i, "");
  const indexAssetUrl = `${indexBase.replace(/\/+$/, "")}/${normalized}`;

  return [indexAssetUrl];
}

function publicIndexAssetUrl(
  indexUrl: string,
  relativePath?: string | null,
): string | null {
  return publicIndexAssetUrlCandidates(indexUrl, relativePath)[0] || null;
}

function publicIndexSiblingUrl(indexUrl: string, relativePath: string): string {
  return indexUrl
    .replace(/\\/g, "/")
    .replace(/indexes\/latest\.json$/, relativePath.replace(/^\/+/, ""));
}

async function fetchJsonFromIndex<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok)
    throw new Error(
      `Index fetch failed ${response.status}: ${response.statusText}`,
    );
  return response.json() as Promise<T>;
}

function tagsFromText(text: string): string[] {
  return text
    .split(/[#,]/g)
    .map((tag) => tag.trim().replace(/^#/, "").toLowerCase())
    .filter(Boolean)
    .slice(0, 32);
}

function PublicIndexPreviewImage({
  indexUrl,
  image,
  crop,
  alt,
  className,
}: {
  indexUrl: string;
  image?: string | null;
  crop?: PreviewCrop | null;
  alt: string;
  className?: string;
}) {
  const candidates = useMemo(
    () => publicIndexAssetUrlCandidates(indexUrl, image),
    [indexUrl, image],
  );
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => setCandidateIndex(0), [indexUrl, image]);

  const src = candidates[candidateIndex] ? displayImageSrc(candidates[candidateIndex]) : null;
  if (!src) return <div className="preview-placeholder"><SvgIcon name="empty-placeholder" /></div>;

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      style={previewImageStyle(crop)}
      onError={() => setCandidateIndex((current) => current + 1)}
    />
  );
}

function PreviewTile({
  image,
  crop,
  title,
  adult,
  indexUrl,
}: {
  image?: string | null;
  crop?: PreviewCrop | null;
  title: string;
  adult?: boolean;
  indexUrl?: string;
}) {
  const candidates = indexUrl
    ? publicIndexAssetUrlCandidates(indexUrl, image)
    : image
      ? [image]
      : [];
  return (
    <div className={`preview-tile ${candidates.length ? "has-image" : "no-image"}`}>
      {candidates.length ? (
        indexUrl ? (
          <PublicIndexPreviewImage
            indexUrl={indexUrl}
            image={image}
            crop={crop}
            alt={title}
          />
        ) : (
          <LocalPreviewTileImage image={image} crop={crop} title={title} />
        )
      ) : (
        <div className="preview-placeholder"><SvgIcon name="empty-placeholder" /></div>
      )}
      {adult && <span className="adult-corner">18+</span>}
    </div>
  );
}

function LocalPreviewTileImage({
  image,
  crop,
  title,
}: {
  image?: string | null;
  crop?: PreviewCrop | null;
  title: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [image]);
  const safeImage = image && !imageFailed ? displayImageSrc(image) : null;
  if (!safeImage) return <div className="preview-placeholder"><SvgIcon name="empty-placeholder" /></div>;
  return (
    <img
      src={safeImage}
      alt={title}
      style={previewImageStyle(crop)}
      onError={() => setImageFailed(true)}
    />
  );
}

function SystemAdminPanel({
  sharedArchiveConnected,
}: {
  sharedArchiveConnected: boolean;
}) {
  const [adminToken, setAdminToken] = useState(storedAdminToken());
  const [publicIndexUrl] = useState(
    PUBLIC_INDEX_LATEST_URL,
  );
  const [publicIndex, setPublicIndex] = useState<PublicIndexLatest | null>(
    null,
  );
  const [publisherIndex, setPublisherIndex] =
    useState<PublicPublisherIndex | null>(null);
  const [serverUsers, setServerUsers] = useState<UserPermissionRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [blocklist, setBlocklist] =
    useState<ModerationBlocklistResponse | null>(null);
  const [adminServerSettings, setAdminServerSettings] =
    useState<AdminServerSettings | null>(null);
  const [serverUploadMode, setServerUploadMode] = useState<
    "public" | "registered"
  >("registered");
  const [serverRequireToken, setServerRequireToken] = useState(false);
  const [serverPublicIndexEnabled, setServerPublicIndexEnabled] =
    useState(false);
  const [serverIncludePrivate, setServerIncludePrivate] = useState(false);
  const [selectedHash, setSelectedHash] = useState("");
  const [blockTargetType, setBlockTargetType] = useState<"package" | "file">(
    "package",
  );
  const [blockCategory, setBlockCategory] = useState("copyright-or-paid-mod");
  const [blockReason, setBlockReason] = useState(
    "Rights holder or moderation policy block",
  );
  const [transferPackageHash, setTransferPackageHash] = useState("");
  const [transferOwnerId, setTransferOwnerId] = useState("");
  const [transferOwnerName, setTransferOwnerName] = useState("");
  const [transferReason, setTransferReason] = useState("Owner correction from Admin panel");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminActionMessage, setAdminActionMessage] = useState<string | null>(null);
  const [usersFilter, setUsersFilter] = useState("");
  const [eventsFilter, setEventsFilter] = useState("");
  const [packagesFilter, setPackagesFilter] = useState("");
  const [usersPage, setUsersPage] = useState(0);
  const [eventsPage, setEventsPage] = useState(0);
  const [packagesPage, setPackagesPage] = useState(0);
  const [indexDiagnostics, setIndexDiagnostics] =
    useState<PublicIndexDiagnosticsResponse | null>(null);
  const [indexSshKey, setIndexSshKey] = useState<IndexSshKeyResult | null>(
    null,
  );
  const [indexSshTest, setIndexSshTest] = useState<IndexSshTestResult | null>(
    null,
  );
  const [debugSettings, setDebugSettings] = useState<ClientDebugSettings>(() =>
    readClientDebugSettings(),
  );

  const updateDebugSettings = (patch: Partial<ClientDebugSettings>) => {
    const next = { ...debugSettings, ...patch };
    setDebugSettings(next);
    writeClientDebugSettings(next);
  };

  const loadIndexDiagnostics = async () => {
    setLoading(true);
    setError(null);
    setIndexDiagnostics(null);
    try {
      setIndexDiagnostics(
        await invoke<PublicIndexDiagnosticsResponse>(
          "fetch_public_index_diagnostics",
          { serverUrl: configuredArchiveHost() },
        ),
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };
  const ensureIndexSshKey = async () => {
    setLoading(true);
    setError(null);
    try {
      setIndexSshKey(
        await invoke<IndexSshKeyResult>("ensure_public_index_ssh_key"),
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };
  const testIndexSshKey = async () => {
    setLoading(true);
    setError(null);
    try {
      setIndexSshTest(
        await invoke<IndexSshTestResult>("test_public_index_ssh_key", {
          remote: null,
        }),
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const refreshToken = () => setAdminToken(storedAdminToken());
    window.addEventListener("mcdf-admin-token-changed", refreshToken);
    window.addEventListener("storage", refreshToken);
    refreshToken();
    return () => {
      window.removeEventListener("mcdf-admin-token-changed", refreshToken);
      window.removeEventListener("storage", refreshToken);
    };
  }, []);

  const packageCountByOwner = useMemo(() => {
    const map = new Map<string, number>();
    for (const pkg of publicIndex?.packages || [])
      map.set(pkg.owner_public_id, (map.get(pkg.owner_public_id) || 0) + 1);
    return map;
  }, [publicIndex]);
  const totalFiles = useMemo(
    () =>
      (publicIndex?.packages || []).reduce(
        (sum, pkg) => sum + pkg.file_count,
        0,
      ),
    [publicIndex],
  );
  const totalBytes = useMemo(
    () =>
      (publicIndex?.packages || []).reduce(
        (sum, pkg) => sum + pkg.total_file_bytes,
        0,
      ),
    [publicIndex],
  );
  const paidLikeCount = useMemo(
    () =>
      (publicIndex?.packages || []).filter((pkg) =>
        (pkg.tags || []).some((tag) =>
          /paid|premium|commission|ko-fi|patreon/i.test(tag),
        ),
      ).length,
    [publicIndex],
  );

  const loadGithubEnvironment = async () => {
    setLoading(true);
    setError(null);
    try {
      const [latest, publishers] = await Promise.all([
        fetchJsonFromIndex<PublicIndexLatest>(publicIndexUrl),
        fetchJsonFromIndex<PublicPublisherIndex>(
          publicIndexSiblingUrl(publicIndexUrl, "indexes/publishers.json"),
        ),
      ]);
      setPublicIndex(latest);
      setPublisherIndex(publishers);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const loadServerAdminState = async () => {
    setLoading(true);
    setError(null);
    try {
      const [users, reportResult, blocks, settings] = await Promise.all([
        invoke<UserPermissionListResponse>("fetch_server_user_permissions", {
          serverUrl: configuredArchiveHost(),
          bearerToken: adminToken.trim() || archiveActionToken(),
        }),
        invoke<ReportListResponse>("fetch_exchange_reports", {
          serverUrl: configuredArchiveHost(),
          bearerToken: adminToken.trim() || archiveActionToken(),
        }),
        invoke<ModerationBlocklistResponse>("fetch_moderation_blocklist", {
          serverUrl: configuredArchiveHost(),
          bearerToken: adminToken.trim() || archiveActionToken(),
        }),
        invoke<AdminServerSettings>("fetch_admin_server_settings", {
          serverUrl: configuredArchiveHost(),
          bearerToken: adminToken.trim() || archiveActionToken(),
        }),
      ]);
      setServerUsers(users.users || []);
      setReports(reportResult.reports || []);
      setBlocklist(blocks);
      setAdminServerSettings(settings);
      setServerUploadMode(
        settings.upload_mode === "public" ? "public" : "registered",
      );
      setServerRequireToken(Boolean(settings.require_upload_token));
      setServerPublicIndexEnabled(Boolean(settings.public_index_enabled));
      setServerIncludePrivate(Boolean(settings.public_index_include_private));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const saveAdminServerSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const settings = await invoke<AdminServerSettings>(
        "update_admin_server_settings",
        {
          serverUrl: configuredArchiveHost(),
          bearerToken: archiveActionToken(),
          uploadMode: serverUploadMode,
          requireUploadToken: serverRequireToken,
          publicIndexEnabled: serverPublicIndexEnabled,
          publicIndexIncludePrivate: serverIncludePrivate,
        },
      );
      setAdminServerSettings(settings);
      setServerUploadMode(
        settings.upload_mode === "public" ? "public" : "registered",
      );
      setServerRequireToken(Boolean(settings.require_upload_token));
      setServerPublicIndexEnabled(Boolean(settings.public_index_enabled));
      setServerIncludePrivate(Boolean(settings.public_index_include_private));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const updateUserAdminState = async (
    user: UserPermissionRecord,
    patch: Partial<
      Pick<
        UserPermissionRecord,
        | "can_connect"
        | "can_upload"
        | "is_admin"
        | "certificate_revoked"
        | "status"
      >
    >,
    note: string,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await invoke<UserPermissionRecord>(
        "update_server_user_permissions",
        {
          serverUrl: configuredArchiveHost(),
          bearerToken: archiveActionToken(),
          publisherId: user.publisher_id,
          canConnect: patch.can_connect ?? null,
          canUpload: patch.can_upload ?? null,
          isAdmin: patch.is_admin ?? null,
          certificateRevoked: patch.certificate_revoked ?? null,
          status: patch.status ?? null,
          note,
        },
      );
      setServerUsers((users) =>
        users.map((entry) =>
          entry.publisher_id === updated.publisher_id ? updated : entry,
        ),
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const addBlock = async () => {
    if (!selectedHash.trim()) {
      setError("Enter a package or layer BLAKE3 hash first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<ModerationBlocklistResponse>(
        "add_moderation_block",
        {
          serverUrl: configuredArchiveHost(),
          bearerToken: archiveActionToken(),
          targetType: blockTargetType,
          hashBlake3: selectedHash.trim(),
          reason: blockReason.trim() || null,
          category: blockCategory.trim() || "policy",
          sourcePackageHash:
            blockTargetType === "file" ? null : selectedHash.trim(),
        },
      );
      setBlocklist(result);
      setSelectedHash("");
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const removePackage = async (pkg: PublicIndexPackageSummary) => {
    if (
      !window.confirm(
        `Remove ${pkg.title || pkg.original_filename} from the Exchange index?`,
      )
    )
      return;
    setLoading(true);
    setError(null);
    try {
      const removedHash = pkg.package_hash_blake3;
      await invoke<ReportRecord>("admin_remove_exchange_entry", {
        serverUrl: configuredArchiveHost(),
        bearerToken: archiveActionToken(),
        packageHashBlake3: removedHash,
        reason: "Removed from System Admin panel",
      });
      setPublicIndex((current) =>
        current
          ? {
              ...current,
              packages: current.packages.filter(
                (entry) => entry.package_hash_blake3 !== removedHash,
              ),
              package_count: Math.max(0, current.package_count - 1),
            }
          : current,
      );
      await loadGithubEnvironment();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const transferPackageOwner = async () => {
    if (!transferPackageHash.trim() || !transferOwnerId.trim()) {
      setError("Enter a package hash and a new owner public id first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await invoke<unknown>("transfer_exchange_entry_owner", {
        serverUrl: configuredArchiveHost(),
        bearerToken: archiveActionToken(),
        packageHashBlake3: transferPackageHash.trim(),
        newOwnerPublicId: transferOwnerId.trim(),
        newOwnerDisplayName: transferOwnerName.trim() || null,
        reason: transferReason.trim() || null,
      });
      setAdminActionMessage("Owner transfer submitted. Reloading public index and admin state.");
      setTransferPackageHash("");
      setTransferOwnerId("");
      setTransferOwnerName("");
      await loadGithubEnvironment();
      await loadServerAdminState();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const adminPageSize = 25;
  const allPackages = publicIndex?.packages || [];
  const filteredPackages = useMemo(() => {
    const q = packagesFilter.trim().toLowerCase();
    if (!q) return allPackages;
    return allPackages.filter((pkg) =>
      [
        pkg.title,
        pkg.original_filename,
        pkg.owner_display_name,
        pkg.owner_public_id,
        pkg.package_hash_blake3,
        ...(pkg.tags || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [allPackages, packagesFilter]);
  const packageRows = filteredPackages.slice(
    packagesPage * adminPageSize,
    packagesPage * adminPageSize + adminPageSize,
  );
  const allUsers = serverUsers;
  const filteredUsers = useMemo(() => {
    const q = usersFilter.trim().toLowerCase();
    if (!q) return allUsers;
    return allUsers.filter((user) =>
      [
        user.display_name,
        user.username,
        user.publisher_id,
        user.public_key,
        user.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [allUsers, usersFilter]);
  const userRows = filteredUsers.slice(
    usersPage * adminPageSize,
    usersPage * adminPageSize + adminPageSize,
  );
  const adminEvents = useMemo(() => {
    const userEvents = serverUsers.map((user) => ({
      id: `user-${user.publisher_id}`,
      type: "user",
      title: user.display_name || user.username || user.publisher_id,
      detail: `${user.status} · ${user.can_upload ? "upload allowed" : "upload blocked"} · ${user.is_admin ? "admin" : "publisher"}`,
      stamp: user.updated_at || "",
    }));
    const reportEvents = reports.map((report) => ({
      id: `report-${report.id}`,
      type: "report",
      title: report.package_title || shortHash(report.package_hash_blake3),
      detail: `${report.reason} · ${report.status} · reported by ${report.reporter_display_name}`,
      stamp: report.updated_at || report.created_at,
    }));
    const blockEvents = (blocklist?.entries || []).map((entry) => ({
      id: `block-${entry.target_type}-${entry.hash_blake3}`,
      type: "moderation",
      title: `${entry.target_type} block`,
      detail: `${entry.category} · ${entry.reason} · ${shortHash(entry.hash_blake3)}`,
      stamp: entry.created_at,
    }));
    return [...reportEvents, ...blockEvents, ...userEvents].sort((a, b) =>
      (b.stamp || "").localeCompare(a.stamp || ""),
    );
  }, [serverUsers, reports, blocklist]);
  const filteredEvents = useMemo(() => {
    const q = eventsFilter.trim().toLowerCase();
    if (!q) return adminEvents;
    return adminEvents.filter((event) =>
      [event.type, event.title, event.detail, event.stamp]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [adminEvents, eventsFilter]);
  const eventRows = filteredEvents.slice(
    eventsPage * adminPageSize,
    eventsPage * adminPageSize + adminPageSize,
  );

  useEffect(() => {
    setUsersPage(0);
  }, [usersFilter, serverUsers.length]);
  useEffect(() => {
    setEventsPage(0);
  }, [eventsFilter, adminEvents.length]);
  useEffect(() => {
    setPackagesPage(0);
  }, [packagesFilter, allPackages.length]);

  useEffect(() => {
    if (!adminToken.trim()) return;
    if (!publicIndex && !loading) void loadGithubEnvironment();
    if (
      serverUsers.length === 0 &&
      reports.length === 0 &&
      !blocklist &&
      !loading
    )
      void loadServerAdminState();
  }, [adminToken, sharedArchiveConnected]);

  const renderPager = (
    page: number,
    total: number,
    setPage: (next: number) => void,
  ) => {
    const pageCount = Math.max(1, Math.ceil(total / adminPageSize));
    return (
      <div className="admin-table-pager">
        <span>
          {Math.min(total, page * adminPageSize + 1)}-
          {Math.min(total, (page + 1) * adminPageSize)} of {total}
        </span>
        <GhostButton
          disabled={page <= 0}
          onClick={() => setPage(Math.max(0, page - 1))}
        >
          Previous
        </GhostButton>
        <GhostButton
          disabled={page >= pageCount - 1}
          onClick={() => setPage(Math.min(pageCount - 1, page + 1))}
        >
          Next
        </GhostButton>
      </div>
    );
  };

  return (
    <div className="settings-screen integrated-settings admin-screen">
      <Panel>
        <div className="panel-title-row">
          <div>
            <div className="eyebrow">Client debug</div>
            <h2>Debug settings</h2>
          </div>
          <span className={debugSettings.fakeExchangeEnabled || debugSettings.fakeLibraryEnabled ? "status-pill status-good" : "status-pill status-neutral"}>
            {debugSettings.fakeExchangeEnabled || debugSettings.fakeLibraryEnabled ? "fake data on" : "off"}
          </span>
        </div>
        <p>
          Add temporary fake entries on this machine to stress-test Exchange and Library layouts.
          These entries are never written to the registry or your real Library.
        </p>
        <div className="debug-settings-grid">
          <label className="debug-toggle-row">
            <input
              type="checkbox"
              checked={debugSettings.fakeExchangeEnabled}
              onChange={(event) => updateDebugSettings({ fakeExchangeEnabled: event.target.checked })}
            />
            <span>Show fake Exchange entries</span>
          </label>
          <Field
            type="number"
            min="0"
            max="1000"
            value={String(debugSettings.fakeExchangeCount)}
            onChange={(event) => updateDebugSettings({ fakeExchangeCount: clampDebugCount(event.target.value) })}
            placeholder="Exchange fake entries"
          />
          <label className="debug-toggle-row">
            <input
              type="checkbox"
              checked={debugSettings.fakeLibraryEnabled}
              onChange={(event) => updateDebugSettings({ fakeLibraryEnabled: event.target.checked })}
            />
            <span>Show fake Library entries</span>
          </label>
          <Field
            type="number"
            min="0"
            max="1000"
            value={String(debugSettings.fakeLibraryCount)}
            onChange={(event) => updateDebugSettings({ fakeLibraryCount: clampDebugCount(event.target.value) })}
            placeholder="Library fake entries"
          />
        </div>
        <div className="hero-actions">
          <GhostButton
            onClick={() =>
              updateDebugSettings({
                fakeExchangeEnabled: true,
                fakeExchangeCount: 200,
                fakeLibraryEnabled: true,
                fakeLibraryCount: 200,
              })
            }
          >
            Enable 200 + 200
          </GhostButton>
          <GhostButton
            onClick={() =>
              updateDebugSettings({
                fakeExchangeEnabled: false,
                fakeLibraryEnabled: false,
              })
            }
          >
            Disable fake data
          </GhostButton>
          <GhostButton
            className="danger"
            onClick={() => {
              if (
                window.confirm(
                  "Clear MCDF Manager browser state on this machine? This removes saved Library entries, fake-data toggles, favorites, publisher auth, and UI settings from this WebView profile. It does not delete files from disk or the registry.",
                )
              ) {
                localStorage.clear();
                window.location.reload();
              }
            }}
          >
            Reset client browser state
          </GhostButton>
        </div>
        <p className="debug-danger-note">
          Deleting <code>.mcdf-manager</code> removes file caches. The Library list, favorites, fake-data toggles, and publisher profile are stored in the app WebView browser state, so use reset when you want a fully clean client.
        </p>
      </Panel>

      {!adminToken.trim() && (
        <Panel>
          <div className="panel-title-row">
            <div>
              <div className="eyebrow">Admin token required</div>
              <h2>Save a token in Settings first</h2>
            </div>
            <span className="status-pill status-neutral">hidden</span>
          </div>
          <p>
            The admin panel is available after the admin/moderation token is
            stored in the System settings area.
          </p>
        </Panel>
      )}

      {adminToken.trim() && (
        <>
          <Panel>
            <div className="panel-title-row">
              <div>
                <div className="eyebrow">Environment</div>
                <h2>Public index overview</h2>
              </div>
              <span
                className={
                  publicIndex
                    ? "status-pill status-good"
                    : "status-pill status-neutral"
                }
              >
                {publicIndex
                  ? `index ${formatDate(publicIndex.generated_at)}`
                  : "not loaded"}
              </span>
            </div>
            <p>
              Loads automatically when the admin area opens. Public package
              metadata comes from the Git index; live server calls are used for
              events, users, reports, and moderation state.
            </p>
            <div className="hero-actions">
              <button
                type="button"
                className="refresh-icon-button"
                disabled={loading}
                onClick={() => {
                  void loadGithubEnvironment();
                  void loadServerAdminState();
                }}
                aria-label={
                  loading ? "Loading admin state" : "Refresh admin state"
                }
                title={loading ? "Loading admin state" : "Refresh admin state"}
              >
                <SvgIcon name="refresh" />
              </button>
            </div>
            <ErrorBox error={error} />
            {adminActionMessage && (
              <SuccessBox>
                <div className="font-semibold">{adminActionMessage}</div>
              </SuccessBox>
            )}
            <div className="admin-metric-grid">
              <div className="metric-card">
                <span>Characters</span>
                <strong>{publicIndex?.package_count ?? "—"}</strong>
              </div>
              <div className="metric-card">
                <span>Publishers</span>
                <strong>{publisherIndex?.publisher_count ?? "—"}</strong>
              </div>
              <div className="metric-card">
                <span>Known files</span>
                <strong>{publicIndex ? totalFiles : "—"}</strong>
              </div>
              <div className="metric-card">
                <span>Total payload</span>
                <strong>{publicIndex ? formatBytes(totalBytes) : "—"}</strong>
              </div>
              <div className="metric-card">
                <span>Potential paid tags</span>
                <strong>{publicIndex ? paidLikeCount : "—"}</strong>
              </div>
              <div className="metric-card">
                <span>Blocked hashes</span>
                <strong>{blocklist ? blocklist.entries.length : "—"}</strong>
              </div>
            </div>
          </Panel>

          <Panel>
            <div className="panel-title-row">
              <div>
                <div className="eyebrow">Server settings</div>
                <h2>Upload and admin access</h2>
              </div>
              <span
                className={
                  adminServerSettings
                    ? "status-pill status-good"
                    : "status-pill status-neutral"
                }
              >
                {adminServerSettings ? "loaded" : "not loaded"}
              </span>
            </div>
            <p>
              Configure the small set of server-side controls that are safe to
              manage from the client. The token remains a break-glass admin path
              even when a user's certificate is revoked.
            </p>
            <div className="form-grid two-columns">
              <label>
                <span>Upload mode</span>
                <select
                  value={serverUploadMode}
                  onChange={(event) =>
                    setServerUploadMode(
                      event.target.value as "public" | "registered",
                    )
                  }
                >
                  <option value="registered">
                    Private: registered users with upload permission
                  </option>
                  <option value="public">
                    Public: allow uploads without registration
                  </option>
                </select>
              </label>
              <label>
                <span>Require legacy upload token</span>
                <select
                  value={serverRequireToken ? "true" : "false"}
                  onChange={(event) =>
                    setServerRequireToken(event.target.value === "true")
                  }
                >
                  <option value="false">No</option>
                  <option value="true">Yes, token required</option>
                </select>
              </label>
              <label>
                <span>Public index export enabled</span>
                <select
                  value={serverPublicIndexEnabled ? "true" : "false"}
                  onChange={(event) =>
                    setServerPublicIndexEnabled(event.target.value === "true")
                  }
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </label>
              <label>
                <span>Include non-public packages in public index</span>
                <select
                  value={serverIncludePrivate ? "true" : "false"}
                  onChange={(event) =>
                    setServerIncludePrivate(event.target.value === "true")
                  }
                >
                  <option value="false">No, public/listed only</option>
                  <option value="true">Yes, local test only</option>
                </select>
              </label>
            </div>
            <div className="hero-actions">
              <GhostButton
                disabled={loading || !adminToken.trim()}
                onClick={saveAdminServerSettings}
              >
                Save server settings
              </GhostButton>
              <GhostButton
                disabled={loading || !adminToken.trim()}
                onClick={loadServerAdminState}
              >
                Reload
              </GhostButton>
            </div>
            {adminServerSettings?.restart_required && (
              <SuccessBox>
                <strong>Restart may be required.</strong>
                <p>
                  Some process/config values are stored as admin intent and may
                  need a server restart or config reconciliation. Upload mode
                  applies immediately.
                </p>
              </SuccessBox>
            )}
          </Panel>

          <Panel>
            <div className="panel-title-row">
              <div>
                <div className="eyebrow">Public index</div>
                <h2>Index operations</h2>
              </div>
              <span
                className={
                  indexDiagnostics?.git_available
                    ? "status-pill status-good"
                    : "status-pill status-neutral"
                }
              >
                {indexDiagnostics?.git_version || "not checked"}
              </span>
            </div>
            <div className="hero-actions">
              <GhostButton disabled={loading} onClick={loadIndexDiagnostics}>
                Check index setup
              </GhostButton>
              <GhostButton disabled={loading} onClick={ensureIndexSshKey}>
                Show deploy key
              </GhostButton>
              <GhostButton disabled={loading} onClick={testIndexSshKey}>
                Test SSH access
              </GhostButton>
            </div>
            {indexDiagnostics && (
              <div className="source-list mt-2">
                <div className="source-row">
                  <div>
                    <strong>{indexDiagnostics.repo || "local index"}</strong>
                    <span>{indexDiagnostics.index_dir}</span>
                    <code>
                      branch {indexDiagnostics.branch} · packages{" "}
                      {indexDiagnostics.package_count} · files{" "}
                      {indexDiagnostics.file_metadata_count} · auth{" "}
                      {indexDiagnostics.auth_method}
                    </code>
                  </div>
                </div>
                {indexDiagnostics.checks.map((check) => (
                  <div key={check.name} className="source-row">
                    <div>
                      <strong>{check.name}</strong>
                      <span>{check.detail}</span>
                    </div>
                    <span
                      className={
                        check.ok
                          ? "status-pill status-good"
                          : "status-pill status-neutral"
                      }
                    >
                      {check.ok ? "ok" : "needs setup"}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {indexSshKey && (
              <SuccessBox>
                <div className="font-semibold">
                  Index SSH key {indexSshKey.created ? "created" : "ready"}
                </div>
                <div className="path-block">{indexSshKey.private_key_file}</div>
                <div className="selectable-key">
                  {indexSshKey.public_key ||
                    "Public key file was not readable."}
                </div>
              </SuccessBox>
            )}
            {indexSshTest && (
              <div
                className={indexSshTest.ok ? "alert success" : "alert error"}
              >
                <div className="font-semibold">
                  SSH test {indexSshTest.ok ? "passed" : "failed"}
                </div>
                <div className="mt-1 font-mono text-xs">
                  {indexSshTest.remote}
                </div>
                {indexSshTest.stderr && (
                  <div className="mt-2 font-mono text-xs diagnostic-text">
                    {indexSshTest.stderr}
                  </div>
                )}
              </div>
            )}
          </Panel>

          <Panel>
            <div className="panel-title-row">
              <div>
                <div className="eyebrow">Users</div>
                <h2>Registered users</h2>
              </div>
              <span className="status-pill status-neutral">
                {filteredUsers.length} users
              </span>
            </div>
            <div className="admin-table-toolbar">
              <Field
                value={usersFilter}
                onChange={(event) => setUsersFilter(event.target.value)}
                placeholder="Filter users by username, display name, public key, or status"
              />
            </div>
            <div className="admin-table-wrap">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Public key</th>
                    <th>Status</th>
                    <th>Permissions</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {userRows.length === 0 && (
                    <tr>
                      <td colSpan={5}>
                        {error
                          ? "Could not load registered users. Check the token and server connection."
                          : "No registered users found yet."}
                      </td>
                    </tr>
                  )}
                  {userRows.map((user) => (
                    <tr key={user.publisher_id}>
                      <td>
                        <strong>
                          {user.display_name ||
                            user.username ||
                            user.publisher_id}
                        </strong>
                        <span>{user.username || "No username"}</span>
                      </td>
                      <td>
                        <code>
                          {user.public_key
                            ? shortHash(user.public_key)
                            : shortHash(user.publisher_id)}
                        </code>
                      </td>
                      <td>
                        <span
                          className={`status-pill ${user.certificate_revoked || user.status === "blocked" || user.status === "disabled" ? "status-warn" : "status-neutral"}`}
                        >
                          {user.certificate_revoked
                            ? "certificate revoked"
                            : user.status}
                        </span>
                      </td>
                      <td>
                        {user.is_admin ? "admin" : "publisher"} ·{" "}
                        {user.can_upload ? "upload" : "no upload"} ·{" "}
                        {user.can_connect ? "connect" : "no connect"}
                      </td>
                      <td>
                        <div className="admin-row-actions">
                          <GhostButton
                            disabled={loading}
                            onClick={() =>
                              updateUserAdminState(
                                user,
                                { is_admin: !user.is_admin },
                                user.is_admin
                                  ? "Admin role revoked from client admin panel"
                                  : "Admin role granted from client admin panel",
                              )
                            }
                          >
                            {user.is_admin ? "Revoke admin" : "Make admin"}
                          </GhostButton>
                          <GhostButton
                            disabled={loading}
                            onClick={() =>
                              updateUserAdminState(
                                user,
                                { can_upload: !user.can_upload },
                                user.can_upload
                                  ? "Upload permission revoked from client admin panel"
                                  : "Upload permission granted from client admin panel",
                              )
                            }
                          >
                            {user.can_upload ? "Revoke upload" : "Allow upload"}
                          </GhostButton>
                          <GhostButton
                            disabled={loading}
                            onClick={() =>
                              updateUserAdminState(
                                user,
                                {
                                  certificate_revoked:
                                    !user.certificate_revoked,
                                },
                                user.certificate_revoked
                                  ? "Certificate restored from client admin panel"
                                  : "Certificate revoked from client admin panel",
                              )
                            }
                          >
                            {user.certificate_revoked
                              ? "Restore cert"
                              : "Revoke cert"}
                          </GhostButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderPager(usersPage, filteredUsers.length, setUsersPage)}
          </Panel>

          <Panel>
            <div className="panel-title-row">
              <div>
                <div className="eyebrow">Moderation blocklist</div>
                <h2>Block packages or layers</h2>
              </div>
              <span
                className={
                  (blocklist?.entries.length || 0) > 0
                    ? "status-pill status-warn"
                    : "status-pill status-neutral"
                }
              >
                {blocklist
                  ? `${blocklist.package_block_count} packages · ${blocklist.file_block_count} layers`
                  : "not loaded"}
              </span>
            </div>
            <p>
              Use package blocks for a whole character upload. Use layer/file
              blocks for exact BLAKE3 payload hashes that are blocked from
              future publishing, including disputed paid mods, potentially
              illegal files, or content outside the community policy. Moderation
              blocks remain private administrative state.
            </p>
            <div className="form-grid admin-block-form">
              <select
                value={blockTargetType}
                onChange={(event) =>
                  setBlockTargetType(event.target.value as "package" | "file")
                }
              >
                <option value="package">Package / character hash</option>
                <option value="file">Layer / file payload hash</option>
              </select>
              <Field
                value={selectedHash}
                onChange={(event) => setSelectedHash(event.target.value)}
                placeholder="BLAKE3 hash"
              />
              <select
                value={blockCategory}
                onChange={(event) => setBlockCategory(event.target.value)}
              >
                <option value="copyright-or-paid-mod">
                  Copyright / paid mod dispute
                </option>
                <option value="potentially-illegal">
                  Potentially illegal / legally unsafe
                </option>
                <option value="sexualized-minor-or-age-ambiguous">
                  Sexualized minor or age-ambiguous content
                </option>
                <option value="malware-or-abuse">Malware or abuse</option>
                <option value="privacy-or-doxxing">Privacy or doxxing</option>
                <option value="policy">Other policy issue</option>
              </select>
              <Field
                value={blockReason}
                onChange={(event) => setBlockReason(event.target.value)}
                placeholder="Reason shown in admin records"
              />
            </div>
            <div className="hero-actions">
              <GhostButton disabled={loading} onClick={addBlock}>
                Add block
              </GhostButton>
              <button
                type="button"
                className="refresh-icon-button"
                disabled={loading}
                onClick={loadServerAdminState}
                aria-label={loading ? "Loading blocklist" : "Refresh blocklist"}
                title={loading ? "Loading blocklist" : "Refresh blocklist"}
              >
                <SvgIcon name="refresh" />
              </button>
            </div>
            <div className="source-list moderation-list">
              {(blocklist?.entries || []).slice(0, 12).map((entry) => (
                <div
                  key={`${entry.target_type}-${entry.hash_blake3}`}
                  className="source-row moderation-row"
                >
                  <div>
                    <strong>
                      {entry.target_type} · {entry.category}
                    </strong>
                    <span>{entry.reason}</span>
                    <code>
                      {shortHash(entry.hash_blake3)} ·{" "}
                      {formatDate(entry.created_at)}
                    </code>
                  </div>
                  <span className="status-pill status-warn">blocked</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <div className="panel-title-row">
              <div>
                <div className="eyebrow">Ownership</div>
                <h2>Move an entry to another owner</h2>
              </div>
              <span className="status-pill status-neutral">admin</span>
            </div>
            <p>
              Move a published MCDF entry to a different registered owner when a
              migration, creator correction, or moderation action requires it.
            </p>
            <div className="form-grid two-columns">
              <label>
                <span>Package hash</span>
                <Field
                  value={transferPackageHash}
                  onChange={(event) => setTransferPackageHash(event.target.value)}
                  placeholder="Package BLAKE3 hash"
                />
              </label>
              <label>
                <span>New owner public id</span>
                <Field
                  value={transferOwnerId}
                  onChange={(event) => setTransferOwnerId(event.target.value)}
                  placeholder="publisher id / username"
                />
              </label>
              <label>
                <span>New owner display name</span>
                <Field
                  value={transferOwnerName}
                  onChange={(event) => setTransferOwnerName(event.target.value)}
                  placeholder="Display name shown in the Exchange"
                />
              </label>
              <label>
                <span>Reason</span>
                <Field
                  value={transferReason}
                  onChange={(event) => setTransferReason(event.target.value)}
                  placeholder="Admin note"
                />
              </label>
            </div>
            <div className="hero-actions">
              <GhostButton disabled={loading || !adminToken.trim()} onClick={transferPackageOwner}>
                Move owner
              </GhostButton>
            </div>
          </Panel>

          <Panel>
            <div className="panel-title-row">
              <div>
                <div className="eyebrow">Characters</div>
                <h2>Published entries</h2>
              </div>
              <span className="status-pill status-neutral">
                {filteredPackages.length} entries
              </span>
            </div>
            <div className="admin-table-toolbar">
              <Field
                value={packagesFilter}
                onChange={(event) => setPackagesFilter(event.target.value)}
                placeholder="Filter characters by title, creator, tag, or hash"
              />
            </div>
            <div className="admin-table-wrap">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Character</th>
                    <th>Creator</th>
                    <th>Files</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {packageRows.length === 0 && (
                    <tr>
                      <td colSpan={5}>
                        Load the GitHub index to see published characters.
                      </td>
                    </tr>
                  )}
                  {packageRows.map((pkg) => (
                    <tr key={pkg.package_hash_blake3}>
                      <td>
                        <strong>{pkg.title || pkg.original_filename}</strong>
                        <span>
                          {shortHash(pkg.package_hash_blake3)} ·{" "}
                          {(pkg.tags || []).join(", ") || "no tags"}
                        </span>
                      </td>
                      <td>
                        {pkg.owner_display_name ||
                          shortHash(pkg.owner_public_id)}
                      </td>
                      <td>
                        {pkg.file_count} · {formatBytes(pkg.total_file_bytes)}
                      </td>
                      <td>
                        <span
                          className={`status-pill ${pkg.visibility === "public" ? "status-good" : "status-neutral"}`}
                        >
                          {pkg.visibility || "public"}
                        </span>
                      </td>
                      <td>
                        <div className="admin-row-actions">
                          <GhostButton
                            disabled={loading}
                            onClick={() => removePackage(pkg)}
                          >
                            Remove
                          </GhostButton>
                          <GhostButton
                            disabled={loading}
                            onClick={() => {
                              setSelectedHash(pkg.package_hash_blake3);
                              setBlockTargetType("package");
                            }}
                          >
                            Prepare block
                          </GhostButton>
                          <GhostButton
                            disabled={loading}
                            onClick={() => {
                              setTransferPackageHash(pkg.package_hash_blake3);
                              setTransferOwnerId(pkg.owner_public_id || "");
                              setTransferOwnerName(pkg.owner_display_name || "");
                            }}
                          >
                            Move owner
                          </GhostButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderPager(
              packagesPage,
              filteredPackages.length,
              setPackagesPage,
            )}
          </Panel>

          <Panel>
            <div className="panel-title-row">
              <div>
                <div className="eyebrow">Events</div>
                <h2>Server events</h2>
              </div>
              <span className="status-pill status-neutral">
                {filteredEvents.length} events
              </span>
            </div>
            <div className="admin-table-toolbar">
              <Field
                value={eventsFilter}
                onChange={(event) => setEventsFilter(event.target.value)}
                placeholder="Filter events by type, user, package, reason, or hash"
              />
            </div>
            <div className="admin-table-wrap">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Subject</th>
                    <th>Details</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {eventRows.length === 0 && (
                    <tr>
                      <td colSpan={5}>
                        Connect and load server state to see events.
                      </td>
                    </tr>
                  )}
                  {eventRows.map((event) => (
                    <tr key={event.id}>
                      <td>{event.stamp ? formatDate(event.stamp) : "—"}</td>
                      <td>
                        <span className="status-pill status-neutral">
                          {event.type}
                        </span>
                      </td>
                      <td>
                        <strong>{event.title}</strong>
                      </td>
                      <td>{event.detail}</td>
                      <td>
                        <div className="admin-row-actions">
                          <GhostButton disabled>Select</GhostButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderPager(eventsPage, filteredEvents.length, setEventsPage)}
          </Panel>
        </>
      )}
    </div>
  );
}

function PublishedIndexPanel({
  sharedArchiveConnected,
}: {
  sharedArchiveConnected: boolean;
}) {
  const [indexLoading, setIndexLoading] = useState(false);
  const [indexError, setIndexError] = useState<string | null>(null);
  const [publicIndex, setPublicIndex] = useState<PublicIndexLatest | null>(
    null,
  );
  const [selectedPublicPackage, setSelectedPublicPackage] =
    useState<PublicPackageRecord | null>(null);
  const [packageLoading, setPackageLoading] = useState(false);
  const [exchangeSearch, setExchangeSearch] = useState("");
  const [exchangeTagFilter, setExchangeTagFilter] = useState("");
  const [exchangeThemeFilter, setExchangeThemeFilter] = useState<CharacterUseConsentThemeId | "">("");
  const [librarySettings, setLibrarySettings] = useState<LocalLibrarySettings>(
    () => readLibrarySettings(),
  );
  const [indexUrl] = useState(
    PUBLIC_INDEX_LATEST_URL,
  );
  const [exchangeFilter, setExchangeFilter] = useState<
    "all" | "favorites" | "recent" | "subscribed"
  >("all");
  const [favoriteHashes, setFavoriteHashes] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem("mcdf.exchange.favorites.v1") || "[]"),
  );
  const [recentHashes, setRecentHashes] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem("mcdf.exchange.recent.v1") || "[]"),
  );
  const [creatorSubscriptions, setCreatorSubscriptions] = useState<string[]>(
    () => readCreatorSubscriptions(),
  );
  const [packageSubscriptions, setPackageSubscriptions] = useState<string[]>(
    () => readPackageSubscriptions(),
  );
  const [debugSettings, setDebugSettings] = useState<ClientDebugSettings>(() =>
    readClientDebugSettings(),
  );
  const [downloadResult, setDownloadResult] =
    useState<ArchiveDownloadResult | null>(null);
  const [requestAccessResult, setRequestAccessResult] =
    useState<AccessRequestNotification | null>(null);
  const [reportResult, setReportResult] = useState<ReportRecord | null>(null);
  const [ownerActionResult, setOwnerActionResult] =
    useState<ExchangeOwnerMutationResponse | null>(null);
  const [exchangeEditDraft, setExchangeEditDraft] =
    useState<ExchangeEditDraft | null>(null);
  const [exchangeFramingOpen, setExchangeFramingOpen] = useState(false);
  const [cacheInspection, setCacheInspection] =
    useState<ExchangePackageCacheInspection | null>(null);
  const [cacheActionResult, setCacheActionResult] =
    useState<CacheClearResult | null>(null);
  const [detailsPaneOpen, setDetailsPaneOpen] = useState(true);
  const toggleFavorite = (hash: string) => {
    const next = favoriteHashes.includes(hash)
      ? favoriteHashes.filter((item) => item !== hash)
      : [hash, ...favoriteHashes];
    setFavoriteHashes(next);
    localStorage.setItem("mcdf.exchange.favorites.v1", JSON.stringify(next));
  };
  const toggleCreatorSubscription = (creatorId: string) => {
    const next = creatorSubscriptions.includes(creatorId)
      ? creatorSubscriptions.filter((item) => item !== creatorId)
      : [creatorId, ...creatorSubscriptions];
    setCreatorSubscriptions(next);
    writeCreatorSubscriptions(next);
    window.dispatchEvent(new Event("mcdf-creator-subscriptions-changed"));
  };
  const togglePackageSubscription = (
    pkg: PublicIndexPackageSummary | PublicPackageRecord,
  ) => {
    try {
      const packageHash = String(pkg.package_hash_blake3 || "").trim();
      if (!packageHash) {
        setIndexError("This Exchange entry cannot be added to My Library because it is missing a package hash.");
        return;
      }
      const alreadySubscribed = packageSubscriptions.includes(packageHash);
      const next = alreadySubscribed
        ? packageSubscriptions.filter((item) => item !== packageHash)
        : [packageHash, ...packageSubscriptions];
      if (alreadySubscribed) {
        removePackageSubscriptionSnapshot(packageHash);
      } else {
        rememberPackageSubscriptionSnapshot(pkg);
      }
      setPackageSubscriptions(next);
      writePackageSubscriptions(next);
      window.dispatchEvent(new Event("mcdf-package-subscriptions-changed"));
      window.dispatchEvent(new Event("mcdf-creator-subscriptions-changed"));
    } catch (error) {
      setIndexError(`Could not update My Library subscription: ${String(error)}`);
    }
  };
  const rememberRecent = (hash: string) => {
    const next = [hash, ...recentHashes.filter((item) => item !== hash)].slice(
      0,
      30,
    );
    setRecentHashes(next);
    localStorage.setItem("mcdf.exchange.recent.v1", JSON.stringify(next));
  };

  const loadIndex = async () => {
    setIndexLoading(true);
    setIndexError(null);
    try {
      setPublicIndex(
        await invoke<PublicIndexLatest>("fetch_public_marketplace_index", {
          indexUrl,
        }),
      );
    } catch (e) {
      setIndexError(String(e));
    } finally {
      setIndexLoading(false);
    }
  };

  useEffect(() => {
    loadIndex().catch(console.error);
  }, []);

  useEffect(() => {
    const refreshDebugSettings = () => setDebugSettings(readClientDebugSettings());
    window.addEventListener(CLIENT_DEBUG_SETTINGS_EVENT, refreshDebugSettings);
    window.addEventListener("storage", refreshDebugSettings);
    return () => {
      window.removeEventListener(CLIENT_DEBUG_SETTINGS_EVENT, refreshDebugSettings);
      window.removeEventListener("storage", refreshDebugSettings);
    };
  }, []);

  const inspectPackage = async (pkg: PublicIndexPackageSummary) => {
    rememberRecent(pkg.package_hash_blake3);
    setDetailsPaneOpen(true);
    setPackageLoading(true);
    setIndexError(null);
    setOwnerActionResult(null);
    setRequestAccessResult(null);
    setReportResult(null);
    setDownloadResult(null);
    setCacheInspection(null);
    setCacheActionResult(null);
    try {
      if (pkg.package_manifest_path.startsWith("debug://")) {
        setSelectedPublicPackage(fakePackageRecordFromSummary(pkg));
        setDetailsPaneOpen(true);
        return;
      }
      const packageRecord = await invoke<PublicPackageRecord>("fetch_public_package_record", {
        indexUrl,
        packageManifestPath: pkg.package_manifest_path,
      });
      setSelectedPublicPackage({
        ...packageRecord,
        preview_image_path:
          packageRecord.preview_image_path ?? pkg.preview_image_path ?? null,
        preview_crop: packageRecord.preview_crop ?? pkg.preview_crop ?? null,
      });
      setDetailsPaneOpen(true);
    } catch (e) {
      setIndexError(String(e));
    } finally {
      setPackageLoading(false);
    }
  };

  const downloadSelectedExchangePackage = async () => {
    if (!selectedPublicPackage) return;
    if (
      selectedPublicPackage.visibility === "locked" ||
      selectedPublicPackage.visibility === "private"
    ) {
      setIndexError("This entry requires access before downloading.");
      return;
    }
    const selected = await save({
      defaultPath: `${selectedPublicPackage.original_filename.replace(/\.mcdf$/i, "")}.rebuilt.mcdf`,
      filters: [{ name: "MCDF", extensions: ["mcdf"] }],
    });
    if (!selected || Array.isArray(selected)) return;
    setPackageLoading(true);
    setIndexError(null);
    setDownloadResult(null);
    try {
      const summary = packages.find(
        (pkg) =>
          pkg.package_hash_blake3 === selectedPublicPackage.package_hash_blake3,
      );
      setDownloadResult(
        await invoke<ArchiveDownloadResult>(
          "download_package_from_exchange_index",
          {
            indexUrl,
            packageManifestPath:
              summary?.download_manifest_path ||
              summary?.package_manifest_path ||
              "",
            serverUrl: configuredArchiveHost(),
            outputPath: selected,
          },
        ),
      );
    } catch (e) {
      setIndexError(String(e));
    } finally {
      setPackageLoading(false);
    }
  };

  const inspectSelectedPackageCache = async () => {
    if (!selectedPublicPackage) return;
    const summary = packages.find(
      (pkg) =>
        pkg.package_hash_blake3 === selectedPublicPackage.package_hash_blake3,
    );
    if (!summary) return;
    setPackageLoading(true);
    setIndexError(null);
    setCacheActionResult(null);
    try {
      const result = await invoke<ExchangePackageCacheInspection>(
        "inspect_exchange_package_cache",
        {
          indexUrl,
          packageManifestPath: summary.package_manifest_path,
        },
      );
      setCacheInspection(result);
    } catch (e) {
      setIndexError(String(e));
    } finally {
      setPackageLoading(false);
    }
  };

  const clearSelectedPackageCache = async () => {
    if (!selectedPublicPackage) return;
    const summary = packages.find(
      (pkg) =>
        pkg.package_hash_blake3 === selectedPublicPackage.package_hash_blake3,
    );
    if (!summary) return;
    setPackageLoading(true);
    setIndexError(null);
    try {
      const result = await invoke<CacheClearResult>(
        "clear_exchange_package_cache",
        {
          indexUrl,
          packageManifestPath: summary.package_manifest_path,
        },
      );
      setCacheActionResult(result);
      await inspectSelectedPackageCache();
    } catch (e) {
      setIndexError(String(e));
    } finally {
      setPackageLoading(false);
    }
  };

  const requestAccessForSelectedPackage = async () => {
    if (!selectedPublicPackage) return;
    if (!sharedArchiveConnected) {
      setIndexError("Connect to the archive server before requesting access.");
      return;
    }
    const note = window.prompt(
      "Optional note to the creator",
      "Requesting access to this locked MCDF.",
    );
    if (note === null) return;
    setPackageLoading(true);
    setIndexError(null);
    setRequestAccessResult(null);
    try {
      const result = await invoke<AccessRequestNotification>(
        "request_locked_mcdf_access",
        {
          serverUrl: configuredArchiveHost(),
          bearerToken: archiveActionToken(),
          packageHashBlake3: selectedPublicPackage.package_hash_blake3,
          requesterDisplayName: storedPublisherDisplayName(),
          note,
        },
      );
      setRequestAccessResult(result);
    } catch (e) {
      setIndexError(String(e));
    } finally {
      setPackageLoading(false);
    }
  };

  const reportSelectedPackage = async () => {
    if (!selectedPublicPackage) return;
    if (!sharedArchiveConnected) {
      setIndexError("Connect to the archive server before reporting an entry.");
      return;
    }
    const category = window.prompt(
      "Report category: inaccessible, unsafe, duplicate, incorrect metadata, or other",
      "inaccessible",
    );
    if (category === null) return;
    const note = window.prompt("Optional extra context for the admin", "");
    setPackageLoading(true);
    setIndexError(null);
    setReportResult(null);
    try {
      const result = await invoke<ReportRecord>("report_exchange_entry", {
        serverUrl: configuredArchiveHost(),
        bearerToken: archiveActionToken(),
        packageHashBlake3: selectedPublicPackage.package_hash_blake3,
        reporterDisplayName: storedPublisherDisplayName(),
        reason: category.trim() || "other",
        note,
      });
      setReportResult(result);
    } catch (e) {
      setIndexError(String(e));
    } finally {
      setPackageLoading(false);
    }
  };

  const removeSelectedPackageAsAdmin = async () => {
    if (!selectedPublicPackage) return;
    if (!sharedArchiveConnected) {
      setIndexError(
        "Connect to the archive server before using admin removal.",
      );
      return;
    }
    if (
      !window.confirm(
        `Remove ${selectedPublicPackage.title || selectedPublicPackage.original_filename} from the server/index?`,
      )
    )
      return;
    setPackageLoading(true);
    setIndexError(null);
    try {
      const removedHash = selectedPublicPackage.package_hash_blake3;
      await invoke<ReportRecord>("admin_remove_exchange_entry", {
        serverUrl: configuredArchiveHost(),
        bearerToken: archiveActionToken(),
        packageHashBlake3: removedHash,
        reason: "Removed by admin from MCDF Manager",
      });
      setPublicIndex((current) =>
        current
          ? {
              ...current,
              packages: current.packages.filter(
                (pkg) => pkg.package_hash_blake3 !== removedHash,
              ),
              package_count: Math.max(0, current.package_count - 1),
            }
          : current,
      );
      setSelectedPublicPackage(null);
      await loadIndex();
    } catch (e) {
      setIndexError(String(e));
    } finally {
      setPackageLoading(false);
    }
  };

  const selectedPackageOwnerId = selectedPublicPackage
    ? displayNameToUsername(
        selectedPublicPackage.owner?.public_id ||
          selectedPublicPackage.owner?.display_name ||
          "",
      )
    : "";
  const selectedPackageIsOwnedByCurrentPublisher =
    Boolean(selectedPackageOwnerId) &&
    selectedPackageOwnerId === storedPublisherPublicId();
  const selectedPackageCanBeManaged =
    Boolean(selectedPublicPackage) &&
    (Boolean(storedAdminToken().trim()) ||
      (hasStoredClientAuth() && selectedPackageIsOwnedByCurrentPublisher));

  const applyOwnerMutationResult = (result: ExchangeOwnerMutationResponse) => {
    if (result.removed) {
      setPublicIndex((current) =>
        current
          ? {
              ...current,
              packages: current.packages.filter(
                (pkg) => pkg.package_hash_blake3 !== result.package_hash_blake3,
              ),
              package_count: Math.max(0, current.package_count - 1),
            }
          : current,
      );
      setSelectedPublicPackage(null);
      return;
    }
    const updatedAt = new Date().toISOString();
    setPublicIndex((current) =>
      current
        ? {
            ...current,
            packages: current.packages.map((pkg) =>
              pkg.package_hash_blake3 === result.package_hash_blake3
                ? {
                    ...pkg,
                    title: result.title,
                    description: result.description,
                    tags: result.tags,
                    is_adult: result.is_adult,
                    visibility: result.visibility,
                    owner_display_name: result.owner_display_name,
                    owner_public_id: result.owner_public_id,
                    preview_image_path:
                      result.preview_image_path ?? pkg.preview_image_path,
                    preview_crop: result.preview_crop ?? pkg.preview_crop ?? null,
                    updated_at: updatedAt,
                  }
                : pkg,
            ),
          }
        : current,
    );
    setSelectedPublicPackage((current) =>
      current && current.package_hash_blake3 === result.package_hash_blake3
        ? {
            ...current,
            title: result.title,
            description: result.description,
            tags: result.tags,
            is_adult: result.is_adult,
            visibility: result.visibility,
            preview_image_path:
              result.preview_image_path ?? current.preview_image_path,
            preview_crop: result.preview_crop ?? current.preview_crop ?? null,
            owner: {
              ...current.owner,
              public_id: result.owner_public_id,
              display_name: result.owner_display_name,
            },
          }
        : current,
    );
  };

  const openExchangeEditModal = () => {
    if (!selectedPublicPackage) return;
    if (!sharedArchiveConnected) {
      setIndexError("Connect to the archive server before editing this entry.");
      return;
    }
    setIndexError(null);
    setOwnerActionResult(null);
    setExchangeEditDraft({
      title: selectedPublicPackage.title || selectedPublicPackage.original_filename || "",
      description: selectedPublicPackage.description || "",
      tags: exchangePackageTags(selectedPublicPackage).join(", "),
      visibility: selectedPublicPackage.visibility || "public",
      isAdult: packageIsAdult(selectedPublicPackage),
      previewImagePath: "",
      previewImageName: "",
      previewCrop: normalizePreviewCrop(selectedPublicPackage.preview_crop),
      characterUseConsent: packageCharacterUseConsentValue(selectedPublicPackage),
    });
  };

  const chooseExchangeEditPreviewImage = async () => {
    const selected = await openDialog({
      multiple: false,
      filters: [
        { name: "Preview image", extensions: ["png", "jpg", "jpeg", "webp", "gif"] },
      ],
    });
    if (!selected || Array.isArray(selected)) return;
    const name = selected.split(/[\\/]/).pop() || "New preview image";
    setExchangeEditDraft((current) =>
      current
        ? { ...current, previewImagePath: selected, previewImageName: name, previewCrop: DEFAULT_PREVIEW_CROP }
        : current,
    );
    setExchangeFramingOpen(true);
  };

  const saveExchangeEditModal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPublicPackage || !exchangeEditDraft) return;
    if (!sharedArchiveConnected) {
      setIndexError("Connect to the archive server before editing this entry.");
      return;
    }
    const title = exchangeEditDraft.title.trim();
    const exchangeConsent = normalizeCharacterUseConsentValue(exchangeEditDraft.characterUseConsent);
    if (exchangeConsent.allowed_theme_ids.length === 0) {
      setIndexError("Select at least one allowed theme for character use consent.");
      return;
    }
    if (!title) {
      setIndexError("Give the Exchange listing a title before saving.");
      return;
    }
    const visibility = selectedPublicPackage.visibility || exchangeEditDraft.visibility.trim() || "public";
    const publisherAuth = localPublisherAuthHeaders();
    setPackageLoading(true);
    setIndexError(null);
    setOwnerActionResult(null);
    try {
      const result = await invoke<ExchangeOwnerMutationResponse>(
        "edit_exchange_entry",
        {
          serverUrl: configuredArchiveHost(),
          bearerToken: storedAdminToken().trim() || null,
          packageHashBlake3: selectedPublicPackage.package_hash_blake3,
          title,
          description: exchangeEditDraft.description,
          tags: tagsFromText(exchangeEditDraft.tags),
          isAdult: packageIsAdult(selectedPublicPackage),
          visibility,
          previewImagePath: exchangeEditDraft.previewImagePath || null,
          previewCrop: normalizePreviewCrop(exchangeEditDraft.previewCrop),
          characterUseConsent: exchangeConsent,
          publisherId: publisherAuth.publisherId,
          publisherDisplayName: publisherAuth.publisherDisplayName,
          publisherPublicKey: publisherAuth.publisherPublicKey,
          publisherCertificate: publisherAuth.publisherCertificate,
        },
      );
      setOwnerActionResult(result);
      applyOwnerMutationResult(result);
      setExchangeFramingOpen(false);
      setExchangeEditDraft(null);
      setDetailsPaneOpen(true);
      await loadIndex();
    } catch (e) {
      setIndexError(String(e));
      setDetailsPaneOpen(true);
    } finally {
      setPackageLoading(false);
    }
  };

  const deleteSelectedPackageAsOwner = async () => {
    if (!selectedPublicPackage) return;
    if (!sharedArchiveConnected) {
      setIndexError("Connect to the archive server before deleting this entry.");
      return;
    }
    if (
      !window.confirm(
        `Delete ${selectedPublicPackage.title || selectedPublicPackage.original_filename} from The Eorzea Exchange? This removes it from the public index but keeps local subscribers' history markers.`,
      )
    )
      return;
    const reason = window.prompt("Optional delete reason", "Deleted by owner from MCDF Manager");
    if (reason === null) return;
    const publisherAuth = localPublisherAuthHeaders();
    setPackageLoading(true);
    setIndexError(null);
    setOwnerActionResult(null);
    try {
      const result = await invoke<ExchangeOwnerMutationResponse>(
        "delete_exchange_entry",
        {
          serverUrl: configuredArchiveHost(),
          bearerToken: storedAdminToken().trim() || null,
          packageHashBlake3: selectedPublicPackage.package_hash_blake3,
          reason,
          publisherId: publisherAuth.publisherId,
          publisherDisplayName: publisherAuth.publisherDisplayName,
          publisherPublicKey: publisherAuth.publisherPublicKey,
          publisherCertificate: publisherAuth.publisherCertificate,
        },
      );
      setOwnerActionResult(result);
      applyOwnerMutationResult(result);
      await loadIndex();
    } catch (e) {
      setIndexError(String(e));
    } finally {
      setPackageLoading(false);
    }
  };

  const saveExchangeSettings = (patch: Partial<LocalLibrarySettings>) => {
    const next = { ...librarySettings, ...patch };
    setLibrarySettings(next);
    writeLibrarySettings(next);
  };

  const fakeExchangePackages = useMemo(
    () =>
      debugSettings.fakeExchangeEnabled
        ? generateFakeExchangePackages(debugSettings.fakeExchangeCount)
        : [],
    [debugSettings.fakeExchangeEnabled, debugSettings.fakeExchangeCount],
  );
  const basePackages = publicIndex?.packages ?? [];
  const packages = debugSettings.fakeExchangeEnabled
    ? [...fakeExchangePackages, ...basePackages]
    : basePackages;
  const exchangeIndexForDisplay: PublicIndexLatest | null = publicIndex
    ? { ...publicIndex, package_count: packages.length, packages }
    : debugSettings.fakeExchangeEnabled
      ? {
          schema_version: 1,
          generated_at: new Date().toISOString(),
          package_count: packages.length,
          packages,
        }
      : null;
  const availableTags = Array.from(
    new Set(packages.flatMap((pkg) => pkg.tags || [])),
  ).sort();
  const availableThemes = CHARACTER_USE_CONSENT_THEMES.filter((theme) =>
    packages.some((pkg) =>
      normalizeCharacterUseConsentValue(packageCharacterUseConsentValue(pkg)).allowed_theme_ids.includes(theme.id),
    ),
  );
  const visiblePackages = packages.filter((pkg) => {
    const consent = normalizeCharacterUseConsentValue(packageCharacterUseConsentValue(pkg));
    const shareCode = `mcdf.thebigtree.life:${pkg.share_id || pkg.share_code || pkg.package_hash_blake3 || ""}`;
    const haystack =
      `${pkg.title || ""} ${pkg.original_filename || ""} ${pkg.package_hash_blake3 || ""} ${pkg.share_id || ""} ${pkg.share_code || ""} ${shareCode} ${stringArray(pkg.tags).join(" ")} ${stringArray(pkg.component_kinds).join(" ")} ${consent.theme_labels.join(" ")} ${consent.allowed_theme_ids.join(" ")}`.toLowerCase();
    const matchesSearch =
      !exchangeSearch.trim() ||
      haystack.includes(exchangeSearch.trim().toLowerCase());
    const adult = packageIsAdult(pkg);
    const adultVisible = librarySettings.adultContentMode === "show" || !adult;
    const matchesTag =
      !exchangeTagFilter || (pkg.tags || []).includes(exchangeTagFilter);
    const matchesTheme =
      !exchangeThemeFilter || consent.allowed_theme_ids.includes(exchangeThemeFilter);
    const matchesShelf =
      exchangeFilter === "all" ||
      (exchangeFilter === "favorites" &&
        favoriteHashes.includes(pkg.package_hash_blake3)) ||
      (exchangeFilter === "recent" &&
        recentHashes.includes(pkg.package_hash_blake3)) ||
      (exchangeFilter === "subscribed" &&
        packageSubscriptions.includes(pkg.package_hash_blake3));
    return (
      matchesSearch &&
      matchesTag &&
      matchesTheme &&
      adultVisible &&
      matchesShelf
    );
  });
  const unseenSubscribedCount = packages.filter(
    (pkg) =>
      packageSubscriptions.includes(pkg.package_hash_blake3) &&
      !recentHashes.includes(pkg.package_hash_blake3),
  ).length;
  const dateMode = librarySettings.dateDisplayMode;
  const closeExchangeDetailsWhenClickingOutside = (
    event: MouseEvent<HTMLDivElement>,
  ) => {
    if (!detailsPaneOpen || packageLoading || exchangeEditDraft) return;
    const target = event.target as HTMLElement;
    if (
      target.closest(".elevated-detail-pane") ||
      target.closest(".exchange-table-row") ||
      target.closest(".exchange-entry-card") ||
      target.closest(".modal-card")
    )
      return;
    setDetailsPaneOpen(false);
  };
  return (
    <div
      className={`screen-grid published-screen exchange-screen exchange-flat no-left-preview ${selectedPublicPackage && detailsPaneOpen ? "has-selection" : "no-selection"}`}
      onMouseDown={closeExchangeDetailsWhenClickingOutside}
    >
      <div className="main-stack exchange-main-flat">
        <div className="exchange-flat-toolbar compact-browser-toolbar">
          <div className="library-toolbar exchange-toolbar-row exchange-inline-filters">
            <Field
              value={exchangeSearch}
              onChange={(e) => setExchangeSearch(e.target.value)}
              placeholder="Search title, share code, tags, themes…"
            />
            <select
              value={librarySettings.exchangeViewMode}
              onChange={(e) =>
                saveExchangeSettings({
                  exchangeViewMode: e.target.value as BrowserDisplayMode,
                })
              }
            >
              <option value="list">List view</option>
              <option value="cards">Large cards</option>
            </select>
            <select
              value={exchangeFilter}
              onChange={(e) =>
                setExchangeFilter(e.target.value as typeof exchangeFilter)
              }
            >
              <option value="all">All</option>
              <option value="favorites">★ Favorites</option>
              <option value="recent">Recently viewed</option>
              <option value="subscribed">Tracked entries</option>
            </select>
            <select
              value={exchangeTagFilter}
              onChange={(e) => setExchangeTagFilter(e.target.value)}
            >
              <option value="">All tags</option>
              {availableTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
            <select
              value={exchangeThemeFilter}
              onChange={(e) =>
                setExchangeThemeFilter(e.target.value as CharacterUseConsentThemeId | "")
              }
            >
              <option value="">All themes</option>
              {availableThemes.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="refresh-icon-button compact-toolbar-refresh"
              disabled={indexLoading}
              onClick={loadIndex}
              aria-label={indexLoading ? "Loading registry" : "Refresh registry"}
              title={indexLoading ? "Loading registry" : "Refresh registry"}
            >
              <SvgIcon name="refresh" />
            </button>
          </div>
        </div>
        <ErrorBox error={indexError} />
        {exchangeFilter === "subscribed" && unseenSubscribedCount > 0 && (
          <div className="exchange-inline-section subscription-line">
            <strong>
              {unseenSubscribedCount} tracked Exchange entries not recently
              viewed
            </strong>
            <span>Open Details on an entry to mark it as recently viewed.</span>
          </div>
        )}
        {exchangeIndexForDisplay && (
          <div className="exchange-results-section">
            {packages.length === 0 ? (
              <p className="empty-small">
                The index is loaded, but it does not list packages yet.
              </p>
            ) : visiblePackages.length === 0 ? (
              <p className="empty-small">
                No Exchange entries match this search/filter.
              </p>
            ) : librarySettings.exchangeViewMode === "list" ? (
              <div
                className="library-table exchange-table"
                role="table"
                aria-label="The Eorzea Exchange entries"
              >
                <div
                  className="library-table-header exchange-table-header"
                  role="row"
                >
                  <span>Name</span>
                  <span>Creator</span>
                  <span>Files</span>
                  <span>Size</span>
                  <span>Updated</span>
                  <span>Favorite</span>
                  <span>Actions</span>
                </div>
                {visiblePackages.map((pkg) => {
                  const isFavorite = favoriteHashes.includes(
                    pkg.package_hash_blake3,
                  );
                  return (
                    <div
                      key={pkg.package_hash_blake3}
                      className="library-table-row exchange-table-row"
                      role="row"
                    >
                      <button
                        type="button"
                        className="exchange-table-title"
                        onClick={() => inspectPackage(pkg)}
                        disabled={packageLoading}
                      >
                        <span className="table-title">
                          {pkg.title ||
                            pkg.original_filename ||
                            "Untitled MCDF"}
                        </span>
                        {packageIsAdult(pkg) && (
                          <span className="mini-warning">18+</span>
                        )}
                      </button>
                      <span className="exchange-table-link exchange-table-creator-text">
                        {pkg.owner_display_name || "Unknown"}
                      </span>
                      <span>{pkg.file_count}</span>
                      <span>{formatBytes(pkg.total_file_bytes)}</span>
                      <span>
                        {formatDate(
                          pkg.updated_at || exchangeIndexForDisplay.generated_at,
                          dateMode,
                        )}
                      </span>
                      <span
                        className={`table-tick ${isFavorite ? "yes" : "no"}`}
                      >
                        {isFavorite ? <SvgIcon name="favorite-filled" /> : <SvgIcon name="favorite-empty" />}
                      </span>
                      <span className="exchange-table-actions">
                        <button
                          type="button"
                          className={`exchange-icon-action ${isFavorite ? "active" : ""}`}
                          title={isFavorite ? "Remove favorite" : "Favorite"}
                          aria-label={
                            isFavorite ? "Remove favorite" : "Favorite"
                          }
                          onClick={() =>
                            toggleFavorite(pkg.package_hash_blake3)
                          }
                        >
                          {isFavorite ? <SvgIcon name="favorite-filled" /> : <SvgIcon name="favorite-empty" />}
                        </button>
                        <GhostButton
                          className="flat-action"
                          disabled={packageLoading}
                          onClick={() => inspectPackage(pkg)}
                        >
                          Details
                        </GhostButton>
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="browse-results card-grid exchange-card-grid">
                {visiblePackages.map((pkg) => {
                  const isFavorite = favoriteHashes.includes(
                    pkg.package_hash_blake3,
                  );
                  return (
                    <div
                      key={pkg.package_hash_blake3}
                      className="library-card exchange-entry-card"
                    >
                      <button
                        type="button"
                        className="library-row-main exchange-card-main"
                        onClick={() => inspectPackage(pkg)}
                        disabled={packageLoading}
                      >
                        <PreviewTile
                          indexUrl={indexUrl}
                          image={pkg.preview_image_path}
                          crop={pkg.preview_crop}
                          title={
                            pkg.title ||
                            pkg.original_filename ||
                            "Untitled MCDF"
                          }
                          adult={packageIsAdult(pkg)}
                        />
                        <strong>
                          {pkg.title ||
                            pkg.original_filename ||
                            "Untitled MCDF"}
                        </strong>
                        <span>
                          {pkg.owner_display_name || "unknown creator"} ·{" "}
                          {pkg.file_count} ·{" "}
                          {formatBytes(pkg.total_file_bytes)}
                        </span>
                        {exchangePackageTags(pkg).length > 0 && (
                          <div className="tag-row compact-tags">
                            {exchangePackageTags(pkg)
                              .slice(0, 3)
                              .map((tag) => (
                                <span key={`tag-${tag}`}>#{tag}</span>
                              ))}
                          </div>
                        )}
                      </button>
                      <div className="state-pill-stack exchange-card-pills">
                        <span className="status-pill status-neutral">
                          Updated{" "}
                          {formatDate(
                            pkg.updated_at || exchangeIndexForDisplay.generated_at,
                            dateMode,
                          )}
                        </span>
                        {isFavorite && (
                          <span className="status-pill status-good">
                            favorite
                          </span>
                        )}
                      </div>
                      <div className="exchange-entry-actions">
                        <button
                          type="button"
                          className={`exchange-icon-action ${isFavorite ? "active" : ""}`}
                          title={isFavorite ? "Remove favorite" : "Favorite"}
                          aria-label={
                            isFavorite ? "Remove favorite" : "Favorite"
                          }
                          onClick={() =>
                            toggleFavorite(pkg.package_hash_blake3)
                          }
                        >
                          {isFavorite ? <SvgIcon name="favorite-filled" /> : <SvgIcon name="favorite-empty" />}
                        </button>
                        <GhostButton
                          className="flat-action"
                          disabled={packageLoading}
                          onClick={() => inspectPackage(pkg)}
                        >
                          Details
                        </GhostButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      {selectedPublicPackage && exchangeEditDraft && (
        <div
          className="modal-backdrop exchange-edit-backdrop"
          onMouseDown={() => { if (!packageLoading) { setExchangeFramingOpen(false); setExchangeEditDraft(null); } }}
        >
          <form
            className="modal-card exchange-edit-modal exchange-listing-studio"
            onSubmit={saveExchangeEditModal}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="exchange-edit-hero exchange-edit-hero-compact">
              <div>
                <div className="eyebrow">Creator listing studio</div>
                <h2>Edit Exchange listing</h2>
              </div>
              <IconButton
                label="Close edit listing"
                className="detail-close-button exchange-edit-close"
                disabled={packageLoading}
                onClick={() => { setExchangeFramingOpen(false); setExchangeEditDraft(null); }}
              >
                <SvgIcon name="close" />
              </IconButton>
            </div>
            {indexError && <ErrorBox error={indexError} />}
            <div className="exchange-edit-layout">
              <section className="exchange-cover-card">
                <span className="eyebrow">Cover image</span>
                <button
                  type="button"
                  className="entry-detail-preview entry-detail-preview-button add-preview-picker exchange-cover-picker"
                  disabled={packageLoading}
                  onClick={() =>
                    exchangeEditDraft.previewImagePath || selectedPublicPackage.preview_image_path
                      ? setExchangeFramingOpen(true)
                      : chooseExchangeEditPreviewImage()
                  }
                  title={
                    exchangeEditDraft.previewImagePath || selectedPublicPackage.preview_image_path
                      ? "Frame Exchange cover image"
                      : "Choose Exchange cover image"
                  }
                >
                  {exchangeEditDraft.previewImagePath ? (
                    <img
                      src={displayImageSrc(exchangeEditDraft.previewImagePath) || undefined}
                      alt="Exchange listing cover preview"
                      style={previewImageStyle(exchangeEditDraft.previewCrop)}
                    />
                  ) : selectedPublicPackage.preview_image_path ? (
                    <PublicIndexPreviewImage
                      indexUrl={indexUrl}
                      image={selectedPublicPackage.preview_image_path}
                      crop={exchangeEditDraft.previewCrop}
                      alt="Exchange listing cover preview"
                    />
                  ) : (
                    <div className="exchange-cover-placeholder preview-placeholder large"><SvgIcon name="empty-placeholder" /></div>
                  )}
                  <span className="preview-edit-chip">
                    {exchangeEditDraft.previewImagePath || selectedPublicPackage.preview_image_path
                      ? "Frame picture"
                      : "Add picture"}
                  </span>
                </button>
                <div className="exchange-cover-actions">
                  <GhostButton
                    type="button"
                    disabled={packageLoading}
                    onClick={chooseExchangeEditPreviewImage}
                  >
                    Replace cover image
                  </GhostButton>
                  {exchangeEditDraft.previewImageName && (
                    <span className="exchange-cover-filename" title={exchangeEditDraft.previewImageName}>
                      {exchangeEditDraft.previewImageName}
                    </span>
                  )}
                </div>
                {exchangeFramingOpen && (exchangeEditDraft.previewImagePath || selectedPublicPackage.preview_image_path) && (
                  <PreviewFramingModal
                    image={
                      exchangeEditDraft.previewImagePath ||
                      publicIndexAssetUrl(indexUrl, selectedPublicPackage.preview_image_path || "") ||
                      ""
                    }
                    title={exchangeEditDraft.title || selectedPublicPackage.original_filename}
                    crop={normalizePreviewCrop(exchangeEditDraft.previewCrop)}
                    onClose={() => setExchangeFramingOpen(false)}
                    onApply={(previewCrop) => {
                      setExchangeEditDraft((current) =>
                        current ? { ...current, previewCrop } : current,
                      );
                      setExchangeFramingOpen(false);
                    }}
                  />
                )}
              </section>
              <section className="exchange-edit-fields exchange-edit-fields-unified">
                <label className="field-label exchange-studio-field">
                  <span>Listing title</span>
                  <Field
                    value={exchangeEditDraft.title}
                    onChange={(event) =>
                      setExchangeEditDraft((current) =>
                        current ? { ...current, title: event.target.value } : current,
                      )
                    }
                    placeholder="Give the character a memorable name"
                    autoFocus
                  />
                </label>
                <label className="field-label exchange-studio-field">
                  <span>Description</span>
                  <textarea
                    className="field textarea-field exchange-description-field"
                    value={exchangeEditDraft.description}
                    onChange={(event) =>
                      setExchangeEditDraft((current) =>
                        current
                          ? { ...current, description: event.target.value }
                          : current,
                      )
                    }
                    rows={5}
                    placeholder="Describe the look, style, dependencies, or anything downloaders should know."
                  />
                </label>
                <label className="field-label exchange-studio-field">
                  <span>Tags</span>
                  <Field
                    value={exchangeEditDraft.tags}
                    onChange={(event) =>
                      setExchangeEditDraft((current) =>
                        current ? { ...current, tags: event.target.value } : current,
                      )
                    }
                    placeholder="fantasy, event, pose, texture"
                  />
                </label>
                <div className="consent-form-panel exchange-consent-panel">
                  <div className="consent-form-heading">
                    <label className="form-label">Allowed themes</label>
                    <div className="consent-form-actions">
                      <button
                        type="button"
                        className="link-button"
                        onClick={() =>
                          setExchangeEditDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  characterUseConsent: buildCharacterUseConsent([...CHARACTER_USE_CONSENT_THEME_IDS]),
                                }
                              : current,
                          )
                        }
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        className="link-button"
                        onClick={() =>
                          setExchangeEditDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  characterUseConsent: buildCharacterUseConsent([]),
                                }
                              : current,
                          )
                        }
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="consent-theme-table" role="table" aria-label="Allowed themes">
                    {CHARACTER_USE_CONSENT_THEMES.map((theme) => {
                      const currentConsent = normalizeCharacterUseConsentValue(exchangeEditDraft.characterUseConsent);
                      const checked = currentConsent.allowed_theme_ids.includes(theme.id);
                      return (
                        <label
                          key={theme.id}
                          className="consent-theme-row"
                          title={theme.description}
                          role="row"
                        >
                          <span className="consent-theme-check" role="cell">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setExchangeEditDraft((current) => {
                                  if (!current) return current;
                                  const consent = normalizeCharacterUseConsentValue(current.characterUseConsent);
                                  const nextIds = e.target.checked
                                    ? Array.from(new Set([...consent.allowed_theme_ids, theme.id]))
                                    : consent.allowed_theme_ids.filter((id) => id !== theme.id);
                                  return {
                                    ...current,
                                    characterUseConsent: buildCharacterUseConsent(nextIds),
                                  };
                                });
                              }}
                            />
                          </span>
                          <span className="consent-theme-title" role="cell">{theme.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="exchange-readonly-row" aria-label="Listing status">
                  <span className="status-pill status-neutral">
                    {(selectedPublicPackage.visibility || "public").toUpperCase()}
                  </span>
                  <span className="status-pill status-neutral">
                    {packageIsAdult(selectedPublicPackage) ? "18+" : "General"}
                  </span>
                </div>
              </section>
            </div>
            <div className="modal-actions exchange-edit-actions">
              <GhostButton
                type="button"
                disabled={packageLoading}
                onClick={() => { setExchangeFramingOpen(false); setExchangeEditDraft(null); }}
              >
                Cancel
              </GhostButton>
              <GhostButton
                type="button"
                disabled={packageLoading}
                onClick={deleteSelectedPackageAsOwner}
              >
                Delete and republish
              </GhostButton>
              <PrimaryButton type="submit" disabled={packageLoading}>
                {packageLoading ? "Saving…" : "Save listing"}
              </PrimaryButton>
            </div>
          </form>
        </div>
      )}
      {selectedPublicPackage && detailsPaneOpen && (
        <aside className="right-stack elevated-detail-pane exchange-detail-pane">
          <Panel>
            <div className="panel-title-row detail-title-row">
              <div>
                <div className="eyebrow">Selected entry</div>
                <h2>
                  {selectedPublicPackage.title ||
                    selectedPublicPackage.original_filename}
                </h2>
              </div>
              <div className="detail-title-actions">
                <span className="status-pill status-neutral">
                  {selectedPublicPackage.file_count}
                </span>
                <IconButton
                  label="Close details"
                  className="detail-close-button"
                  onClick={() => setDetailsPaneOpen(false)}
                >
                  <SvgIcon name="close" />
                </IconButton>
              </div>
            </div>
            <div className="published-detail">
              {selectedPublicPackage.preview_image_path && (
                <div className="exchange-detail-preview-frame">
                  <PublicIndexPreviewImage
                    className="package-preview-inline detail-hero-preview"
                    indexUrl={indexUrl}
                    image={selectedPublicPackage.preview_image_path}
                    crop={selectedPublicPackage.preview_crop}
                    alt={
                      selectedPublicPackage.title ||
                      selectedPublicPackage.original_filename
                    }
                  />
                </div>
              )}
              <div className="exchange-detail-info-table" aria-label="Exchange entry details">
                <div className="exchange-detail-info-row exchange-detail-info-row-wide">
                  <span>Creator</span>
                  <strong>{selectedPublicPackage.owner?.display_name || "Unknown creator"}</strong>
                </div>
                <div className="exchange-detail-info-row">
                  <span>Files</span>
                  <strong>{selectedPublicPackage.file_count}</strong>
                </div>
                <div className="exchange-detail-info-row">
                  <span>Payload</span>
                  <strong>{formatBytes(selectedPublicPackage.total_file_bytes)}</strong>
                </div>
                <div className="exchange-detail-info-row exchange-detail-info-row-wide">
                  <span>Themes</span>
                  <strong>{consentSummary(packageCharacterUseConsentValue(selectedPublicPackage))}</strong>
                </div>
                <div className="exchange-detail-info-row exchange-detail-info-row-wide">
                  <span>Description</span>
                  <p>{selectedPublicPackage.description || "No description was published for this package."}</p>
                </div>
                {exchangePackageTags(selectedPublicPackage).length > 0 && (
                  <div className="exchange-detail-info-row exchange-detail-info-row-wide">
                    <span>Tags</span>
                    <div className="tag-row exchange-detail-tags">
                      {exchangePackageTags(selectedPublicPackage).map((tag) => (
                        <span key={tag}>#{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="exchange-detail-action-bar" aria-label="Exchange entry actions">
                <button
                  type="button"
                  className="exchange-detail-icon-action primary"
                  disabled={
                    packageLoading ||
                    selectedPublicPackage.visibility === "locked" ||
                    selectedPublicPackage.visibility === "private"
                  }
                  title={
                    selectedPublicPackage.visibility === "locked" ||
                    selectedPublicPackage.visibility === "private"
                      ? "Access is required before downloading this entry."
                      : "Download MCDF"
                  }
                  aria-label={
                    selectedPublicPackage.visibility === "locked" ||
                    selectedPublicPackage.visibility === "private"
                      ? "Access required"
                      : "Download MCDF"
                  }
                  onClick={downloadSelectedExchangePackage}
                >
                  <SvgIcon name="download" />
                </button>
                {selectedPublicPackage.visibility === "locked" && (
                  <button
                    type="button"
                    className="exchange-detail-icon-action"
                    disabled={!sharedArchiveConnected || packageLoading}
                    title={serviceLockedMessage(sharedArchiveConnected) || "Request access"}
                    aria-label="Request access"
                    onClick={requestAccessForSelectedPackage}
                  >
                    <SvgIcon name="access-requests" />
                  </button>
                )}
                <button
                  type="button"
                  className={`exchange-detail-icon-action ${packageSubscriptions.includes(selectedPublicPackage.package_hash_blake3) ? "active" : ""}`}
                  title={packageSubscriptions.includes(selectedPublicPackage.package_hash_blake3) ? "In My Library" : "Add to My Library"}
                  aria-label={packageSubscriptions.includes(selectedPublicPackage.package_hash_blake3) ? "In My Library" : "Add to My Library"}
                  onClick={() => togglePackageSubscription(selectedPublicPackage)}
                >
                  <SvgIcon name="add-to-library" />
                </button>
                <button
                  type="button"
                  className={`exchange-detail-icon-action ${favoriteHashes.includes(selectedPublicPackage.package_hash_blake3) ? "active" : ""}`}
                  title={favoriteHashes.includes(selectedPublicPackage.package_hash_blake3) ? "Favorite" : "Add favorite"}
                  aria-label={favoriteHashes.includes(selectedPublicPackage.package_hash_blake3) ? "Favorite" : "Add favorite"}
                  onClick={() => toggleFavorite(selectedPublicPackage.package_hash_blake3)}
                >
                  <SvgIcon name="favorite-empty" />
                </button>
                {selectedPackageCanBeManaged && (
                  <>
                    <button
                      type="button"
                      className="exchange-detail-icon-action"
                      disabled={!sharedArchiveConnected || packageLoading}
                      title={selectedPackageIsOwnedByCurrentPublisher ? "Edit listing" : "Admin edit listing"}
                      aria-label={selectedPackageIsOwnedByCurrentPublisher ? "Edit listing" : "Admin edit listing"}
                      onClick={openExchangeEditModal}
                    >
                      <SvgIcon name="edit-listing" />
                    </button>
                    <button
                      type="button"
                      className="exchange-detail-icon-action danger"
                      disabled={!sharedArchiveConnected || packageLoading}
                      title={selectedPackageIsOwnedByCurrentPublisher ? "Delete listing" : "Admin delete listing"}
                      aria-label={selectedPackageIsOwnedByCurrentPublisher ? "Delete listing" : "Admin delete listing"}
                      onClick={deleteSelectedPackageAsOwner}
                    >
                      <SvgIcon name="delete-listing" />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="exchange-detail-icon-action"
                  disabled={!sharedArchiveConnected || packageLoading}
                  title={serviceLockedMessage(sharedArchiveConnected) || "Report listing"}
                  aria-label="Report listing"
                  onClick={reportSelectedPackage}
                >
                  !
                </button>
                {storedAdminToken().trim() && (
                  <button
                    type="button"
                    className="exchange-detail-icon-action danger"
                    disabled={!sharedArchiveConnected || packageLoading}
                    title={serviceLockedMessage(sharedArchiveConnected) || "Admin remove"}
                    aria-label="Admin remove"
                    onClick={removeSelectedPackageAsAdmin}
                  >
                    <SvgIcon name="admin-remove" />
                  </button>
                )}
                <button
                  type="button"
                  className="exchange-detail-icon-action"
                  disabled={packageLoading}
                  title="Inspect local cache"
                  aria-label="Inspect local cache"
                  onClick={inspectSelectedPackageCache}
                >
                  <SvgIcon name="inspect" />
                </button>
                {cacheInspection && cacheInspection.cached_count > 0 && (
                  <button
                    type="button"
                    className="exchange-detail-icon-action danger"
                    disabled={packageLoading}
                    title="Clear cached parts"
                    aria-label="Clear cached parts"
                    onClick={clearSelectedPackageCache}
                  >
                    <SvgIcon name="delete-listing" />
                  </button>
                )}
              </div>
              {requestAccessResult && (
                <SuccessBox>
                  <div className="font-semibold">Access request sent</div>
                  <div className="mt-2">
                    Status: {requestAccessResult.status}
                  </div>
                  <div className="mt-1 font-mono text-xs">
                    {requestAccessResult.id}
                  </div>
                </SuccessBox>
              )}
              {reportResult && (
                <SuccessBox>
                  <div className="font-semibold">Report sent for review</div>
                  <div className="mt-2">Status: {reportResult.status}</div>
                  <div className="mt-1 font-mono text-xs">
                    {reportResult.id}
                  </div>
                </SuccessBox>
              )}
              {ownerActionResult && (
                <SuccessBox>
                  <div className="font-semibold">
                    {ownerActionResult.removed
                      ? "Exchange listing deleted"
                      : "Exchange listing updated"}
                  </div>
                  <div className="mt-2">
                    {ownerActionResult.index_pushed
                      ? "The public index was updated and pushed."
                      : "The server accepted the change; public index push may still need server sync."}
                  </div>
                </SuccessBox>
              )}
              {downloadResult && (
                <SuccessBox>
                  <div>Downloaded MCDF to:</div>
                  <div className="path-block">{downloadResult.output_path}</div>
                  {downloadResult.download_note && (
                    <p className="empty-small mt-2">{downloadResult.download_note}</p>
                  )}
                </SuccessBox>
              )}
              {cacheInspection && (
                <div className="alert success">
                  <div className="font-semibold">Local cache</div>
                  <div className="summary-metrics mt-2">
                    <div>
                      <strong>{cacheInspection.cached_count}</strong>
                      <span>cached</span>
                    </div>
                    <div>
                      <strong>{cacheInspection.missing_count}</strong>
                      <span>missing</span>
                    </div>
                    <div>
                      <strong>{cacheInspection.gap_percent.toFixed(0)}%</strong>
                      <span>registry gap</span>
                    </div>
                  </div>
                  <p className="empty-small">
                    {formatBytes(cacheInspection.cached_bytes)} cached out of{" "}
                    {formatBytes(cacheInspection.total_bytes)}.
                  </p>
                </div>
              )}
              {cacheActionResult && (
                <SuccessBox>
                  <div className="font-semibold">Cache updated</div>
                  {cacheActionResult.notes.map((note, index) => (
                    <p key={index} className="empty-small">
                      {note}
                    </p>
                  ))}
                </SuccessBox>
              )}
              <details className="advanced-identity-details">
                <summary>Advanced package identity</summary>
                <div className="path-block">
                  {selectedPublicPackage.package_hash_blake3}
                </div>
              </details>
            </div>
          </Panel>
        </aside>
      )}
    </div>
  );
}

function AccessNotificationModal({
  requests,
  connected,
  loading,
  error,
  onRefresh,
  onReview,
  onClose,
}: {
  requests: AccessRequestNotification[];
  connected: boolean;
  loading?: boolean;
  error?: string | null;
  onRefresh: () => void;
  onReview: (id: string, status: "approved" | "denied") => void;
  onClose: () => void;
}) {
  const pending = requests.filter((request) => request.status === "pending");
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal-card notification-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="panel-title-row">
          <div>
            <div className="eyebrow">Notifications</div>
            <h2>Requests</h2>
          </div>
          <div className="hero-actions icon-only-actions">
            <button
              type="button"
              className="refresh-icon-button"
              disabled={!connected || loading}
              onClick={onRefresh}
              aria-label={
                loading ? "Checking access requests" : "Refresh access requests"
              }
              title={
                !connected
                  ? "Connect to refresh access requests"
                  : loading
                    ? "Checking access requests"
                    : "Refresh access requests"
              }
            >
              <SvgIcon name="refresh" />
            </button>
            <button
              type="button"
              className="modal-icon-close"
              onClick={onClose}
              aria-label="Close notifications"
              title="Close"
            >
              <SvgIcon name="close" />
            </button>
          </div>
        </div>
        {error && <ErrorBox error={error} />}
        {!connected && (
          <p className="empty-small">
            Connect to the server to check access requests.
          </p>
        )}
        {connected && pending.length === 0 && (
          <p className="empty-small">No pending access requests.</p>
        )}
        {pending.length > 0 && (
          <div className="source-list">
            {pending.map((request) => (
              <div key={request.id} className="source-row">
                <div>
                  <strong>{request.requester_display_name}</strong>
                  <span>
                    {request.package_title ||
                      request.package_hash_blake3 ||
                      "Locked MCDF"}
                  </span>
                  <code>{request.note || "Request pending owner review"}</code>
                </div>
                <div className="state-pill-stack">
                  <span className="status-pill status-warn">pending</span>
                  <GhostButton
                    disabled={loading}
                    onClick={() => onReview(request.id, "approved")}
                  >
                    Approve
                  </GhostButton>
                  <GhostButton
                    disabled={loading}
                    onClick={() => onReview(request.id, "denied")}
                  >
                    Deny
                  </GhostButton>
                </div>
              </div>
            ))}
          </div>
        )}
        {requests.some((request) => request.status !== "pending") && (
          <details className="mt-2">
            <summary>Reviewed requests</summary>
            <div className="source-list mt-2">
              {requests
                .filter((request) => request.status !== "pending")
                .map((request) => (
                  <div key={request.id} className="source-row">
                    <div>
                      <strong>{request.requester_display_name}</strong>
                      <span>
                        {request.package_title || request.package_hash_blake3}
                      </span>
                    </div>
                    <span
                      className={`status-pill ${request.status === "approved" ? "status-good" : "status-bad"}`}
                    >
                      {request.status}
                    </span>
                  </div>
                ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function BellButton({
  requests,
  onClick,
}: {
  requests: AccessRequestNotification[];
  onClick: () => void;
}) {
  const pending = requests.filter(
    (request) => request.status === "pending",
  ).length;
  return (
    <button
      type="button"
      className="bell-button"
      title="Access requests"
      aria-label="Access requests"
      onClick={onClick}
    >
      <span>🔔</span>
      {pending > 0 && <strong>{pending}</strong>}
    </button>
  );
}

function WindowControls() {
  const runWindowCommand = async (
    event: MouseEvent<HTMLButtonElement>,
    command: "window_minimize" | "window_toggle_maximize" | "window_close",
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const appWindow = getCurrentWindow();
    try {
      if (command === "window_minimize") await appWindow.minimize();
      else if (command === "window_toggle_maximize")
        await appWindow.toggleMaximize();
      else await appWindow.close();
    } catch (error) {
      invoke(command).catch(console.error);
    }
  };
  return (
    <div className="window-controls" aria-label="Window controls">
      <button
        type="button"
        className="window-control"
        aria-label="Minimize"
        title="Minimize"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => runWindowCommand(event, "window_minimize")}
      >
        <SvgIcon name="minimize" />
      </button>
      <button
        type="button"
        className="window-control"
        aria-label="Maximize or restore"
        title="Maximize / restore"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => runWindowCommand(event, "window_toggle_maximize")}
      >
        <SvgIcon name="maximize" />
      </button>
      <button
        type="button"
        className="window-control window-control-close"
        aria-label="Close"
        title="Close"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => runWindowCommand(event, "window_close")}
      >
        <SvgIcon name="close" />
      </button>
    </div>
  );
}

function App() {
  const [clientAuthReady, setClientAuthReady] = useState(hasStoredClientAuth);
  const [sharedArchiveConnected, setSharedArchiveConnected] = useState(false);
  const [connectivityStatus, setConnectivityStatus] = useState<ConnectivityStatus>({
    state: "checking",
    label: "Checking",
    detail: "Checking the registry and public Exchange index.",
  });
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [globalAddEntryOpen, setGlobalAddEntryOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [accessRequests, setAccessRequests] = useState<
    AccessRequestNotification[]
  >(() => readAccessNotifications());
  const [accessRequestsLoading, setAccessRequestsLoading] = useState(false);
  const [accessRequestsError, setAccessRequestsError] = useState<string | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<Tab>("library");
  const [analyzeOpenSignal, setAnalyzeOpenSignal] = useState(0);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [storageSetupOpen, setStorageSetupOpen] = useState(false);
  const [eulaOpen, setEulaOpen] = useState(!hasAcceptedEula());
  const [adminTokenConfigured, setAdminTokenConfigured] = useState(false);

  useEffect(() => {
    let cancelled = false;
    invoke<StorageSettingsResponse>("get_storage_settings")
      .then((settings) => {
        if (!cancelled && !settings.initialized && !storageSetupAcknowledged())
          setStorageSetupOpen(true);
      })
      .catch(() => {
        if (!cancelled && !storageSetupAcknowledged())
          setStorageSetupOpen(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    const refreshClientAuth = () => setClientAuthReady(hasStoredClientAuth());
    window.addEventListener("mcdf-client-auth-changed", refreshClientAuth);
    window.addEventListener("storage", refreshClientAuth);
    refreshClientAuth();
    return () => {
      window.removeEventListener("mcdf-client-auth-changed", refreshClientAuth);
      window.removeEventListener("storage", refreshClientAuth);
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    if (!clientAuthReady) {
      setSharedArchiveConnected(false);
      return;
    }
    invoke<CentralServerHealth>("central_server_health", {
      serverUrl: configuredArchiveHost(),
    })
      .then(() => {
        if (!cancelled) setSharedArchiveConnected(true);
      })
      .catch(() => {
        if (!cancelled) setSharedArchiveConnected(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientAuthReady]);
  useEffect(() => {
    let cancelled = false;

    const checkConnectivity = async () => {
      let registryOk = false;
      let indexOk = false;
      let registryDetail = "Registry server could not be reached.";
      let indexDetail = "Public Exchange index could not be reached.";
      let syncDetail = "";

      try {
        const health = await invoke<CentralServerHealth>("central_server_health", {
          serverUrl: configuredArchiveHost(),
        });
        registryOk = true;
        registryDetail = `Registry ${health.server_version || health.status || "online"}`;
        if (health.public_index_sync_ready === false) {
          syncDetail = "Registry is online, but public index sync is not ready.";
        }
      } catch (error) {
        registryDetail = `Registry offline: ${String(error)}`;
      }

      try {
        await invoke<PublicIndexLatest>("fetch_public_marketplace_index", {
          indexUrl: PUBLIC_INDEX_LATEST_URL,
        });
        indexOk = true;
        indexDetail = "Public Exchange index is reachable.";
      } catch (error) {
        indexDetail = `Public Exchange index offline: ${String(error)}`;
      }

      if (cancelled) return;
      const checkedAt = new Date().toISOString();
      if (registryOk && indexOk && !syncDetail) {
        setConnectivityStatus({
          state: "online",
          label: "Online",
          detail: "Registry and public Exchange index are reachable.",
          checkedAt,
        });
      } else if (!registryOk && !indexOk) {
        setConnectivityStatus({
          state: "offline",
          label: "Offline",
          detail:
            "Registry and public Exchange index are unreachable. Local library, Analyze, and cached entries still work. " +
            registryDetail +
            " " +
            indexDetail,
          checkedAt,
        });
      } else {
        setConnectivityStatus({
          state: "degraded",
          label: registryOk ? "Index offline" : "Registry offline",
          detail:
            `${registryDetail} ${indexDetail}${syncDetail ? ` ${syncDetail}` : ""} Local library and Analyze remain available.`,
          checkedAt,
        });
      }
    };

    checkConnectivity();
    const timer = window.setInterval(checkConnectivity, 45000);
    window.addEventListener("online", checkConnectivity);
    window.addEventListener("offline", checkConnectivity);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("online", checkConnectivity);
      window.removeEventListener("offline", checkConnectivity);
    };
  }, []);

  const refreshAccessRequests = async () => {
    if (!sharedArchiveConnected) {
      setAccessRequests(readAccessNotifications());
      return;
    }
    setAccessRequestsLoading(true);
    setAccessRequestsError(null);
    try {
      const response = await invoke<AccessRequestListResponse>(
        "fetch_access_requests",
        {
          serverUrl: configuredArchiveHost(),
          bearerToken: archiveActionToken(),
        },
      );
      setAccessRequests(response.requests);
      writeAccessNotifications(response.requests);
    } catch (error) {
      setAccessRequestsError(String(error));
      const cached = readAccessNotifications();
      setAccessRequests(cached);
    } finally {
      setAccessRequestsLoading(false);
    }
  };
  const reviewAccessRequest = async (
    requestId: string,
    status: "approved" | "denied",
  ) => {
    setAccessRequestsLoading(true);
    setAccessRequestsError(null);
    try {
      await invoke<AccessRequestNotification>("review_access_request", {
        serverUrl: configuredArchiveHost(),
        bearerToken: archiveActionToken(),
        requestId,
        status,
        decisionNote: null,
      });
      await refreshAccessRequests();
    } catch (error) {
      setAccessRequestsError(String(error));
      setAccessRequestsLoading(false);
    }
  };
  useEffect(() => {
    refreshAccessRequests();
    if (!sharedArchiveConnected) return;
    const timer = window.setInterval(refreshAccessRequests, 30000);
    return () => window.clearInterval(timer);
  }, [sharedArchiveConnected]);

  const addOperation = (op: Omit<Operation, "id" | "startedAt" | "status">) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setOperations((current) => [
      { ...op, id, startedAt: Date.now(), status: "running" },
      ...current,
    ]);
    return id;
  };
  const updateOperation = (id: string, patch: Partial<Operation>) => {
    setOperations((current) =>
      current.map((op) => (op.id === id ? { ...op, ...patch } : op)),
    );
  };
  const finishOperation = (id: string, patch: Partial<Operation>) => {
    setOperations((current) =>
      current.map((op) =>
        op.id === id ? { ...op, ...patch, endedAt: Date.now() } : op,
      ),
    );
  };
  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      setOperations((current) =>
        current.filter((op) => {
          if (op.status === "running") return true;
          const age = now - (op.endedAt || op.startedAt);
          return age < (op.status === "failed" ? 2 * 60_000 : 12_000);
        }),
      );
    }, 15_000);
    return () => window.clearInterval(timer);
  }, []);
  const panelProps = useMemo(
    () => ({ addOperation, updateOperation, finishOperation }),
    [],
  );
  const visibleNavSections = useMemo(
    () =>
      navSections
        .map((section) => ({
          ...section,
          items: section.items.filter(
            (item) => item.id !== "admin" || adminTokenConfigured,
          ),
        }))
        .filter((section) => section.items.length > 0),
    [adminTokenConfigured],
  );
  const activeLabel =
    visibleNavSections
      .flatMap((section) => section.items)
      .find((item) => item.id === activeTab)?.label ?? "MCDF Manager";
  const openConnectModal = () => {
    setConnectModalOpen(true);
  };
  const openAddEntryModal = () => {
    setGlobalAddEntryOpen(true);
  };
  const handleConnected = () => {
    setSharedArchiveConnected(true);
    setConnectModalOpen(false);
    setClientAuthReady(hasStoredClientAuth());
  };
  const handleDisconnect = () => {
    setSharedArchiveConnected(false);
  };
  useEffect(() => {
    let cancelled = false;
    const refreshAdminVisibility = () => {
      loadAdminTokenFromConfig()
        .then((token) => {
          if (!cancelled) setAdminTokenConfigured(Boolean(token.trim()));
        })
        .catch(() => {
          if (!cancelled) setAdminTokenConfigured(false);
        });
    };
    window.addEventListener("mcdf-admin-token-changed", refreshAdminVisibility);
    window.addEventListener("storage", refreshAdminVisibility);
    refreshAdminVisibility();
    return () => {
      cancelled = true;
      window.removeEventListener(
        "mcdf-admin-token-changed",
        refreshAdminVisibility,
      );
      window.removeEventListener("storage", refreshAdminVisibility);
    };
  }, []);
  useEffect(() => {
    if (!adminTokenConfigured && activeTab === "admin")
      setActiveTab("settings");
  }, [adminTokenConfigured, activeTab]);
  const startWindowDrag = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (
      target.closest(
        "button,input,select,textarea,a,summary,details,.topbar-actions,.window-controls,.modal-backdrop",
      )
    )
      return;
    event.preventDefault();
    const appWindow = getCurrentWindow() as unknown as {
      startDragging?: () => Promise<void>;
    };
    appWindow.startDragging?.().catch(console.error);
  };
  const handleNavClick = (itemId: Tab) => {
    setActiveTab(itemId);
    if (itemId === "prepare") setAnalyzeOpenSignal((current) => current + 1);
  };
  return (
    <div
      className="app-shell"
      onContextMenu={(event) => event.preventDefault()}
    >
      {eulaOpen && (
        <EndUserLicenseAgreementModal onAccept={() => setEulaOpen(false)} />
      )}
      {storageSetupOpen && !eulaOpen && (
        <FirstBootStorageModal onDone={() => setStorageSetupOpen(false)} />
      )}
      {connectModalOpen && (
        <SharedArchiveConnectModal
          onClose={() => setConnectModalOpen(false)}
          onConnected={handleConnected}
        />
      )}
      {globalAddEntryOpen && (
        <AddMcdfEntryModal
          open={globalAddEntryOpen}
          onClose={() => setGlobalAddEntryOpen(false)}
          {...panelProps}
        />
      )}
      {profileModalOpen && (
        <PublicProfileModal onClose={() => setProfileModalOpen(false)} />
      )}
      {notificationsOpen && (
        <AccessNotificationModal
          requests={accessRequests}
          connected={sharedArchiveConnected}
          loading={accessRequestsLoading}
          error={accessRequestsError}
          onRefresh={refreshAccessRequests}
          onReview={reviewAccessRequest}
          onClose={() => setNotificationsOpen(false)}
        />
      )}
      <aside className="sidebar">
        <div className="brand brand-logo-only">
          <div className="brand-mark">
            <img src="/mcdf-logo.png" alt="MCDF" />
          </div>
        </div>
        <nav className="side-nav">
          {visibleNavSections.map((section) => (
            <div key={section.title} className="nav-section">
              <div className="nav-title">{section.title}</div>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={
                    activeTab === item.id ? "nav-item active" : "nav-item"
                  }
                >
                  <span className="nav-icon"><SvgIcon name={item.icon} /></span>
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.hint}</small>
                  </span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="profile-card sharing-card compact-sharing-card identity-mini-card">
          <button
            className="identity-mini-text identity-open-button"
            type="button"
            onClick={() =>
              clientAuthReady ? setProfileModalOpen(true) : openConnectModal()
            }
            title={
              clientAuthReady
                ? "Open server profile"
                : "Register or import a publisher identity"
            }
          >
            <strong>{clientAuthReady ? storedPublisherDisplayName() : "Register"}</strong>
            {storedPublisherPermissions(
              sharedArchiveConnected,
              clientAuthReady,
            ) && (
              <small>
                {storedPublisherPermissions(
                  sharedArchiveConnected,
                  clientAuthReady,
                )}
              </small>
            )}
          </button>
          <button
            className={
              sharedArchiveConnected
                ? "switch-button connected"
                : "switch-button"
            }
            onClick={() =>
              sharedArchiveConnected ? handleDisconnect() : openConnectModal()
            }
            type="button"
          >
            <span className="switch-knob" />
            <span>{sharedArchiveConnected ? "Connected" : "Connect"}</span>
          </button>
        </div>
      </aside>
      <div className="content-shell">
        <div
          className="window-drag-strip"
          data-tauri-drag-region
          onMouseDown={startWindowDrag}
          aria-hidden="true"
        />
        <header
          className="topbar"
          data-tauri-drag-region
          onMouseDown={startWindowDrag}
        >
          <div className="topbar-title" data-tauri-drag-region>
            <h1 data-tauri-drag-region>{activeLabel}</h1>
          </div>
          <div
            className="topbar-actions"
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <ConnectivityBadge status={connectivityStatus} />
            <IconButton label="Add MCDF entry" onClick={openAddEntryModal}>
              ＋
            </IconButton>
            <ActivityIndicator operations={operations} />
            <BellButton
              requests={accessRequests}
              onClick={() => setNotificationsOpen(true)}
            />
          </div>
          <div
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <WindowControls />
          </div>
        </header>
        <main className="content-area">
          {activeTab === "published" && (
            <PublishedIndexPanel
              sharedArchiveConnected={sharedArchiveConnected}
            />
          )}
          {activeTab === "library" && <OnlineLibraryPanel {...panelProps} />}
          {activeTab === "prepare" && (
            <PreparePanel {...panelProps} autoOpenSignal={analyzeOpenSignal} />
          )}
          {activeTab === "settings" && (
            <SettingsPanel
              sharedArchiveConnected={sharedArchiveConnected}
              onOpenConnect={openConnectModal}
              onDisconnect={handleDisconnect}
            />
          )}
          {activeTab === "admin" && adminTokenConfigured && (
            <SystemAdminPanel sharedArchiveConnected={sharedArchiveConnected} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
