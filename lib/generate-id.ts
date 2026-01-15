// Utility to generate custom IDs with prefixes
// Example: generateId('mcp') => 'mcp_Eveng7henCN4YjjnAcpxU7'

import { customAlphabet } from 'nanoid';

// Using URL-safe characters (letters and numbers only, no special characters)
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 21);

export function generateId(prefix: string): string {
  return `${prefix}_${nanoid()}`;
}

export const IdPrefixes = {
  MCP_SERVER: 'mcp',
  CATEGORY: 'ctg',
  MCP_SERVER_CATEGORY: 'msc',
} as const;
