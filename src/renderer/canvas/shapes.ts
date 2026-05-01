import type { ComponentType } from '../model/graph'
import { ComponentType as CT } from '../model/graph'

export type CyShape = 'circle' | 'rect' | 'open' | 'pipe'

export const SHAPE_BY_TYPE: Record<ComponentType, { cyShape: CyShape; label: string }> = {
  [CT.Process]:   { cyShape: 'circle', label: 'Process' },
  [CT.External]:  { cyShape: 'rect',   label: 'External' },
  [CT.DataStore]: { cyShape: 'open',   label: 'Data store' },
  [CT.Queue]:     { cyShape: 'pipe',   label: 'Queue / Bus' },
}

export const cyShapeFor = (type: ComponentType): CyShape => SHAPE_BY_TYPE[type].cyShape

export const ICONS_BY_TYPE: Record<ComponentType, readonly string[]> = {
  [CT.Process]:   ['server', 'cog', 'worker'],
  [CT.External]:  ['browser', 'user', 'cloud'],
  [CT.DataStore]: ['database', 'document', 'bolt', 'folder'],
  [CT.Queue]:     ['list', 'radio', 'activity'],
}

export type PalettePreset = {
  id: string
  type: ComponentType
  icon: string
  label: string
  sublabel: string
}

export const PALETTE_PRESETS: readonly PalettePreset[] = [
  { id: 'service',    type: CT.Process,   icon: 'server',   label: 'Service',       sublabel: 'API / microservice' },
  { id: 'function',   type: CT.Process,   icon: 'cog',      label: 'Function',      sublabel: 'Lambda / handler' },
  { id: 'worker',     type: CT.Process,   icon: 'worker',   label: 'Worker',        sublabel: 'Background job' },
  { id: 'browser',    type: CT.External,  icon: 'browser',  label: 'Browser',       sublabel: 'Web client' },
  { id: 'actor',      type: CT.External,  icon: 'user',     label: 'Actor',         sublabel: 'Person / role' },
  { id: 'thirdParty', type: CT.External,  icon: 'cloud',    label: 'Third-party',   sublabel: 'External API' },
  { id: 'rdbms',      type: CT.DataStore, icon: 'database', label: 'Relational DB', sublabel: 'PostgreSQL / MySQL' },
  { id: 'docdb',      type: CT.DataStore, icon: 'document', label: 'Document DB',   sublabel: 'Mongo / Dynamo' },
  { id: 'cache',      type: CT.DataStore, icon: 'bolt',     label: 'Cache',         sublabel: 'Redis / Memcached' },
  { id: 'object',     type: CT.DataStore, icon: 'folder',   label: 'Object Store',  sublabel: 'S3 / blob' },
  { id: 'queue',      type: CT.Queue,     icon: 'list',     label: 'Queue',         sublabel: 'SQS / RabbitMQ' },
  { id: 'topic',      type: CT.Queue,     icon: 'radio',    label: 'Topic',         sublabel: 'Pub/Sub' },
  { id: 'stream',     type: CT.Queue,     icon: 'activity', label: 'Stream',        sublabel: 'Kafka / Kinesis' },
] as const

export const ICON_PATHS: Record<string, string> = {
  server: '<rect x="2.5" y="3" width="13" height="5" rx="1"/><rect x="2.5" y="10" width="13" height="5" rx="1"/><line x1="5" y1="5.5" x2="5.01" y2="5.5"/><line x1="5" y1="12.5" x2="5.01" y2="12.5"/>',
  cog: '<circle cx="9" cy="9" r="2.5"/><path d="M9 1.5v2M9 14.5v2M14.3 3.7l-1.4 1.4M5.1 12.9l-1.4 1.4M16.5 9h-2M3.5 9h-2M14.3 14.3l-1.4-1.4M5.1 5.1L3.7 3.7"/>',
  worker: '<circle cx="9" cy="9" r="6.5"/><path d="M3 9h12M9 3a8 8 0 0 1 0 12M9 3a8 8 0 0 0 0 12"/>',
  browser: '<rect x="2.5" y="3" width="13" height="12" rx="1.5"/><line x1="2.5" y1="6.5" x2="15.5" y2="6.5"/><line x1="5" y1="4.7" x2="5.01" y2="4.7"/><line x1="6.8" y1="4.7" x2="6.81" y2="4.7"/>',
  user: '<circle cx="9" cy="6.5" r="2.8"/><path d="M3.5 15.5a5.5 5.5 0 0 1 11 0"/>',
  cloud: '<path d="M5 14a3.5 3.5 0 0 1 0-7 4.5 4.5 0 0 1 8.7 1.2A3 3 0 0 1 13 14H5z"/>',
  database: '<ellipse cx="9" cy="3.8" rx="6" ry="1.8"/><path d="M3 3.8v10.4c0 1 2.7 1.8 6 1.8s6-.8 6-1.8V3.8"/><path d="M3 9c0 1 2.7 1.8 6 1.8s6-.8 6-1.8"/>',
  document: '<path d="M11 1.5H4a1.5 1.5 0 0 0-1.5 1.5v12a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5V6L11 1.5z"/><path d="M11 1.5V6h4.5"/>',
  bolt: '<path d="M10 1.5L3 10.5h5l-1 6 7-9h-5l1-6z"/>',
  folder: '<path d="M2.5 4a1.5 1.5 0 0 1 1.5-1.5h2.5l2 2h6a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 14.5 15.5h-11A1.5 1.5 0 0 1 2 14V4z"/>',
  list: '<line x1="6" y1="4" x2="15.5" y2="4"/><line x1="6" y1="9" x2="15.5" y2="9"/><line x1="6" y1="14" x2="15.5" y2="14"/><circle cx="3" cy="4" r="0.8" fill="currentColor"/><circle cx="3" cy="9" r="0.8" fill="currentColor"/><circle cx="3" cy="14" r="0.8" fill="currentColor"/>',
  radio: '<circle cx="9" cy="9" r="1.6"/><path d="M5.8 5.8a4.5 4.5 0 0 0 0 6.4M12.2 5.8a4.5 4.5 0 0 1 0 6.4M3.4 3.4a8 8 0 0 0 0 11.2M14.6 3.4a8 8 0 0 1 0 11.2"/>',
  activity: '<path d="M2 9h3l2-6 4 12 2-6h3"/>',
}
