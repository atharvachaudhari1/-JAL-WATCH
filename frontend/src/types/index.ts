export type UserRole = 'admin' | 'gp_official' | 'field_worker';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  gram_panchayat_id?: string;
  gram_panchayat_name?: string;
  phone?: string;
  is_active: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export type ConnectionStatus = 'Normal' | 'Attention' | 'Critical' | 'Unknown' | 'Offline';

export interface ConnectionListItem {
  id: string;
  fhtc_id: string;
  village_or_ward: string;
  household_reference: string;
  device_id?: string;
  device_code?: string;
  latest_flow?: number;
  latest_pressure?: number;
  last_reading_time?: string;
  computed_status: ConnectionStatus;
  status_reason: string;
  open_alerts_count: number;
  has_active_complaint: boolean;
}

export interface ReadingPoint {
  observed_at: string;
  flow_rate?: number;
  pressure?: number;
  volume?: number;
  turbidity?: number;
  ph?: number;
  source: string;
  quality_flags: string[];
}

export interface AlertItem {
  id: string;
  connection_id: string;
  fhtc_id?: string;
  village_or_ward?: string;
  alert_type: string;
  severity: 'CRITICAL' | 'ATTENTION' | 'INFO';
  title: string;
  reason: string;
  evidence: Record<string, any>;
  rule_version: string;
  model_version?: string;
  status: 'open' | 'acknowledged' | 'investigating' | 'resolved' | 'false_alarm';
  assigned_to?: string;
  assignee_name?: string;
  triggered_at: string;
  resolved_at?: string;
  resolution_note?: string;
}

export interface ComplaintEventItem {
  id: string;
  event_type: string;
  actor_name: string;
  old_status?: string;
  new_status?: string;
  public_message?: string;
  internal_note?: string;
  created_at: string;
}

export interface OfficialComplaintListItem {
  id: string;
  public_reference: string;
  connection_id?: string;
  fhtc_id?: string;
  village_or_ward?: string;
  category: string;
  category_label: string;
  description: string;
  status: string;
  assigned_to?: string;
  assignee_name?: string;
  photo_url?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface OfficialComplaintDetail extends OfficialComplaintListItem {
  household_reference?: string;
  started_at_approx?: string;
  private_contact_phone?: string;
  private_contact_name?: string;
  public_status_message?: string;
  internal_notes?: string;
  events: ComplaintEventItem[];
}

export interface PublicComplaintTracking {
  public_reference: string;
  category: string;
  category_label: string;
  village_or_ward?: string;
  status: string;
  status_label: string;
  public_status_message?: string;
  created_at: string;
  updated_at: string;
  events: {
    id: string;
    event_type: string;
    actor_name: string;
    public_message?: string;
    created_at: string;
  }[];
}

export interface ConnectionDetailResponse {
  id: string;
  fhtc_id: string;
  gram_panchayat_id: string;
  gram_panchayat_name: string;
  village_or_ward: string;
  household_reference: string;
  device_id?: string;
  device_code?: string;
  device_type?: string;
  firmware_version?: string;
  device_health?: string;
  battery_level?: number;
  supply_schedule?: Record<string, any>;
  latest_flow?: number;
  latest_pressure?: number;
  latest_turbidity?: number;
  latest_ph?: number;
  last_reading_time?: string;
  computed_status: ConnectionStatus;
  status_reason: string;
  data_freshness_minutes?: number;
  open_alerts: AlertItem[];
  recent_complaints: OfficialComplaintListItem[];
  recent_readings: ReadingPoint[];
}

export interface DashboardSummary {
  gram_panchayat_id: string;
  gram_panchayat_name: string;
  district: string;
  state: string;
  total_connections: number;
  active_devices: number;
  connections_with_recent_data: number;
  active_alerts: number;
  critical_alerts: number;
  open_complaints: number;
  resolved_complaints_period: number;
  data_freshness_status: 'FRESH' | 'SOME_STALE' | 'OFFLINE' | 'UNKNOWN';
  last_sync_time?: string;
  is_demo_data: boolean;
}

export interface ThresholdSettings {
  gram_panchayat_id: string;
  min_flow_lpm: number;
  min_pressure_bar: number;
  max_pressure_bar: number;
  stale_data_hours: number;
  supply_window_start: string;
  supply_window_end: string;
  evening_window_start: string;
  evening_window_end: string;
  updated_at: string;
  updated_by?: string;
}

export interface IntegrationStatus {
  imis_status: string;
  imis_message: string;
  last_sync_time?: string;
  sujal_gaon_status: string;
  sujal_gaon_message: string;
  export_formats_supported: string[];
}
